import fs from "fs";
import { Mwn } from "mwn";
import { getLootChest, getVillageLootChests, getVillageTypesStructuresInfo } from "./lib.ts";

const bot = new Mwn({
  apiUrl: "https://minecraft.fandom.com/api.php",
});

async function generateVillageLootJSON() {
  const output = {} as Record<string, Awaited<ReturnType<typeof getLootChest>>>;
  for (const [source, lootName] of await getVillageLootChests(bot)) {
    output[source] = await getLootChest(bot, lootName);
  }
  fs.writeFileSync("./village-loot.json", JSON.stringify(output, null, 2), { encoding: "utf-8" });
}

async function generateVillageStructuresJSON() {
  const res = await getVillageTypesStructuresInfo(bot);
  fs.writeFileSync("./village-structures.json", JSON.stringify(res, null, 2), { encoding: "utf-8" });
}

const [, , cmd, ...args] = process.argv;
if (cmd === "loot") {
  await generateVillageLootJSON();
} else if (cmd === "structures") {
  await generateVillageStructuresJSON();
} else if (cmd === "parse-wkt") {
  console.log(await bot.parseWikitext(args[0]))
} else {
  console.log("no cmd specified");
}
