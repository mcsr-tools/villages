import { default as Alpine } from 'alpinejs';

import villageLoot from "./village-loot.json"
import villageStructures from "./village-structures.json"
import villageTypes from "./village-types.json"

const BASE_URL = import.meta.env.BASE_URL === "/" ? "" : `/${import.meta.env.BASE_URL.split("/").filter(_ => !!_).join("/")}`
Alpine.store("baseUrl", BASE_URL)

Alpine.store("village", {
  type: villageTypes.find(it => it.toLowerCase() === location.pathname.split(`${BASE_URL}/`)?.at(1)?.toLowerCase()) ?? villageTypes[0],
  houses: true,
  structure: null,
  dialog: false,
  get structures() {
    return Object.entries(villageStructures[this.type]).reduce(
      (result, [structure, it]) => ({
        ...result,
        ...(this.houses && !this.structureLootKey(structure) && !structure.match(/library|stable/) ? {} : { [structure]: it })
      }), {})
  },
  get types() {
    return villageTypes
  },
  get structureLoot() {
    return this.structure && villageLoot[this.structureLootKey(this.structure)]
  },
  toggleHouses() {
    this.houses = !this.houses
  },
  select(type) {
    this.type = type
    history.replaceState({}, "", `${BASE_URL}/${type.toLowerCase()}`)
  },
  showDialog(structure) {
    this.dialog = true
    this.structure = structure
  },
  closeDialog() {
    this.dialog = false
    this.structure = null
  },
  structureHasMaterial(structure, material) {
    return !!Object.keys(villageStructures[this.type]?.[structure]?.materials ?? {}).find(it => it.toLowerCase().includes(material))
  },
  grepStructureMaterials(structure, material) {
    return Object.entries(villageStructures[this.type]?.[structure]?.materials ?? {}).filter(([it]) => it.toLowerCase().includes(material)) || []
  },
  structureLootKey(structure) {
    const s = structure.replace(/\d+/, "").replace(/(small|medium|big) house/, `${this.type} house`).toLowerCase().replace("plains", "plain").trim()
    return Object.keys(villageLoot).find(it => it.toLowerCase() === s)
  },
})

Alpine.store("structureTypeSprite", {
  "armorer house": "sprite item-sprite iron-helmet",
  "butcher shop": "sprite item-sprite raw-porkchop",
  "cartographer": "sprite item-sprite paper",
  "fisher cottage": "sprite item-sprite raw-cod",
  "fletcher house": "sprite block-sprite fletching-table",
  "mason house": "sprite block-sprite stonecutter",
  "shepherd house": "sprite item-sprite shears",
  "tannery": "sprite item-sprite leather",
  "temple": "sprite block-sprite brewing-stand",
  "tool smith": "sprite item-sprite iron-pickaxe",
  "weaponsmith": "sprite item-sprite iron-sword",
})

Alpine.start()
