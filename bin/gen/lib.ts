import assert from "assert";
import { Mwn } from "mwn";
import { parse } from "node-html-parser";
import VILLAGE_TYPES from "../../src/village-types.json" with { type: "json" }

export async function getVillageLootChests(bot: Mwn): Promise<[string, string][]> {
  const text = (await bot.read("Village/Loot")).revisions?.[0].content;
  assert.ok(text, "Village/Loot has no content");
  const result: [string, string][] = [];
  for (const chunk of text.split(/[\n]\=+/)) {
    const heading = chunk.substring(0, chunk.indexOf("\n")).replaceAll("=", "").trim();
    if (!heading) continue;
    const lootChest = chunk.match(/\{\{LootChest\|(.+?)\}\}/)?.[1];
    if (!lootChest) continue;
    result.push([heading, lootChest]);
  }
  return result;
}

export async function getLootChest(bot: Mwn, name: string) {
  const html = await bot.parseWikitext(`{{LootChest|${name}}}`);
  const root = parse(html);
  const table = root.querySelector("table");
  assert.ok(table);
  const headerRow = table.querySelector("tr:has(> th)");
  assert.ok(headerRow);
  const headers = headerRow.querySelectorAll("th > abbr").map((it) => it.textContent.trim());
  const lootRows = table.querySelectorAll("tr:has(> td)");
  assert.ok(lootRows);
  const loot = lootRows.reduce((acc, tr) => {
    const [item, ...rest] = tr.querySelectorAll("td");
    const name = item.innerText.trim();
    assert.ok(name);
    const values = rest.map((it) => it.innerText.trim());
    assert.ok(values);
    const style = tr.querySelector(".sprite")?.getAttribute("style");
    const sprite = style?.match(/background-image:url\((.+?)\)/)?.[1];
    assert.ok(sprite)
    const pos = style?.match(/background-position:(.+?) (.+)/);
    assert.ok(pos)
    const [, x, y] = pos
    return {
      ...acc,
      [name]: { values, image: { pos: [x, y] satisfies [string, string], sprite } },
    };
  }, {} as Record<string, { values: string[]; image: { pos: [string, string]; sprite: string } }>);
  return {
    headers,
    loot,
  } as const;
}

export async function getVillageTypesStructuresInfo(bot: Mwn) {
  const text = (await bot.read("Village/Structure/Blueprints")).revisions?.[0].content;
  assert.ok(text);
  const result = {} as Record<string, Awaited<ReturnType<typeof getVillageTypeStructuresInfo>>>;
  for (const villageType of VILLAGE_TYPES) {
    result[villageType] = await getVillageTypeStructuresInfo(bot, text, villageType);
  }
  return result;
}

async function getVillageTypeStructuresInfo(bot: Mwn, text: string, villageType: string) {
  const result = {} as Record<
    string,
    {
      materials: ReturnType<typeof getVillageTypeStructureMaterials>;
      images: Awaited<ReturnType<typeof getVillageTypeStructureImages>>;
    }
  >;
  for (const structureName of getVillageTypeStructureNames(text, villageType)) {
    const blueprint = await bot.read(`Village/Structure/Blueprints/${villageType} ${structureName} blueprint`);
    if (!blueprint || blueprint.missing) {
      console.error(`${villageType} ${structureName} is missing:\n${JSON.stringify(blueprint, null, 2)}`);
      continue;
    }
    const blueprintText = blueprint.revisions?.[0].content;
    assert.ok(
      blueprintText,
      `Failed to get blueprint text of ${villageType} ${structureName} from read:\n${JSON.stringify(
        blueprint,
        null,
        2
      )}`
    );
    const materials = getVillageTypeStructureMaterials(bot, blueprintText);
    const wktFilename =
      text.match(
        new RegExp(
          `\\[\\[File:(${villageType} (${structureName}|${structureName
            .split(" ")
            .map((it) => (it.match(/\d+/) ? "" + Number(it) : it))
            .join(" ")}).*?)[\\|\\]]`,
          "i"
        )
      )?.[1] ??
      text.match(
        new RegExp(`{{LoadPage\\|{{FULLPAGENAME}}\\/${villageType} ${structureName}.*File:(.+?)[\\|\\]]`, "i")
      )?.[1];
    assert.ok(wktFilename, `Failed to find file wkt filename using regexp in text:\n${text}`);
    const images = await getVillageTypeStructureImages(bot, villageType as string, structureName, wktFilename);
    result[structureName] = { materials, images };
  }
  return result;
}

function* getVillageTypeStructureNames(text: string, villageType: string) {
  const regexp = new RegExp(`\\{\\{LoadPage\\|\\{\\{FULLPAGENAME\\}\\}\\/${villageType}(.+?) *(\\||blueprint)`, "gi");
  for (const [m, name] of text.matchAll(regexp)) {
    assert.ok(
      name,
      `Failed to find structure name for ${villageType} with regexp ${regexp} matched: ${m} in text:\n${text}`
    );
    const trimmedName = name.trim();
    assert.ok(
      trimmedName,
      `Got structure name: ${name} for ${villageType} with regexp ${regexp} matched: ${m} but it's empty after trimming in text:\n${text}`
    );
    yield trimmedName;
  }
}

function getVillageTypeStructureMaterials(bot: Mwn, blueprintText: string) {
  const [, materialsParagraph] = blueprintText.split(/=* *Materials *=*\n/);
  assert.ok(materialsParagraph);
  const [table] = materialsParagraph.trim().split("\n\n");
  const parsed = bot.Wikitext.parseTable(table);
  return parsed.reduce((acc, it) => {
    const name = it.Name.match(/text=(.+?)\}/)?.[1];
    assert.ok(
      name,
      `Missing name while iterating materials table, got parsed: ${JSON.stringify(it)} in text:\n${blueprintText}`
    );
    const total = Number(it.Total) || Number(it.Total.match(/JE\|short=(\d+)/)?.[1]) || -1;
    assert.ok(
      total,
      `Missing total or NaN while iterating materials table: ${total} where raw value is: ${
        it.Total
      }, got parsed: ${JSON.stringify(it)} in text:\n${blueprintText}`
    );
    return {
      ...acc,
      [name]: total,
    };
  }, {} as Record<string, number>);
}

async function getVillageTypeStructureImages(
  bot: Mwn,
  villageType: string,
  structureName: string,
  wktFilename: string
) {
  const wktFile = `[[File:${wktFilename}|thumb]]`;
  const text = await bot.parseWikitext(wktFile);
  const root = parse(text);
  const image = root.querySelector("a.image")?.getAttribute("href");
  const thumb = root.querySelector("img")?.getAttribute("src");
  assert.ok(image, `Could not find image for ${villageType} ${structureName} with wkt: ${wktFile} in text: ${text}`);
  assert.ok(
    thumb,
    `Could not find image thumb for ${villageType} ${structureName} with wkt: ${wktFile} in text: ${text}`
  );
  return {
    image,
    thumb,
  };
}
