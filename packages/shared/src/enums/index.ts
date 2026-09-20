/**
 * Canonical enums shared across client, server, and database.
 * Keep these as `const` objects + derived union types so they are usable at
 * runtime (iteration, validation) and at the type level. Prisma mirrors these.
 */

export const Biome = {
  Forest: 'FOREST',
  Mountain: 'MOUNTAIN',
  Snow: 'SNOW',
  Desert: 'DESERT',
  Beach: 'BEACH',
  Ocean: 'OCEAN',
  Volcano: 'VOLCANO',
  Swamp: 'SWAMP',
  Ruins: 'RUINS',
  Village: 'VILLAGE',
  CapitalCity: 'CAPITAL_CITY',
  MagicAcademy: 'MAGIC_ACADEMY',
  AncientTemple: 'ANCIENT_TEMPLE',
  SkyIsland: 'SKY_ISLAND',
  Dungeon: 'DUNGEON',
  Mine: 'MINE',
  UndergroundCave: 'UNDERGROUND_CAVE',
  BossArea: 'BOSS_AREA',
} as const;
export type Biome = (typeof Biome)[keyof typeof Biome];

export const ResourceKind = {
  Wood: 'WOOD',
  Stone: 'STONE',
  Coal: 'COAL',
  Iron: 'IRON',
  Copper: 'COPPER',
  Gold: 'GOLD',
  Silver: 'SILVER',
  Diamond: 'DIAMOND',
  Ruby: 'RUBY',
  Emerald: 'EMERALD',
  Sapphire: 'SAPPHIRE',
  Quartz: 'QUARTZ',
  Crystal: 'CRYSTAL',
  Obsidian: 'OBSIDIAN',
  Mithril: 'MITHRIL',
  AncientOre: 'ANCIENT_ORE',
  Clay: 'CLAY',
  Sand: 'SAND',
  Salt: 'SALT',
  IceCrystal: 'ICE_CRYSTAL',
  Coral: 'CORAL',
  Pearl: 'PEARL',
  Seaweed: 'SEAWEED',
  Herbs: 'HERBS',
  Flowers: 'FLOWERS',
  Mushrooms: 'MUSHROOMS',
  AnimalHide: 'ANIMAL_HIDE',
  Bones: 'BONES',
  Leather: 'LEATHER',
  Fish: 'FISH',
  Water: 'WATER',
  LavaCrystal: 'LAVA_CRYSTAL',
} as const;
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export const Rarity = {
  Common: 'COMMON',
  Uncommon: 'UNCOMMON',
  Rare: 'RARE',
  Epic: 'EPIC',
  Legendary: 'LEGENDARY',
  Mythic: 'MYTHIC',
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export const ItemCategory = {
  Weapon: 'WEAPON',
  Armor: 'ARMOR',
  Tool: 'TOOL',
  Food: 'FOOD',
  Medicine: 'MEDICINE',
  Potion: 'POTION',
  Accessory: 'ACCESSORY',
  MagicScroll: 'MAGIC_SCROLL',
  Furniture: 'FURNITURE',
  Material: 'MATERIAL',
  BuildingMaterial: 'BUILDING_MATERIAL',
  Resource: 'RESOURCE',
  Quest: 'QUEST',
} as const;
export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory];

export const EquipmentSlot = {
  Head: 'HEAD',
  Chest: 'CHEST',
  Legs: 'LEGS',
  Feet: 'FEET',
  Hands: 'HANDS',
  MainHand: 'MAIN_HAND',
  OffHand: 'OFF_HAND',
  Ring1: 'RING_1',
  Ring2: 'RING_2',
  Amulet: 'AMULET',
  Cape: 'CAPE',
} as const;
export type EquipmentSlot = (typeof EquipmentSlot)[keyof typeof EquipmentSlot];

export const Element = {
  Fire: 'FIRE',
  Water: 'WATER',
  Earth: 'EARTH',
  Lightning: 'LIGHTNING',
  Wind: 'WIND',
  Nature: 'NATURE',
  Light: 'LIGHT',
  Dark: 'DARK',
} as const;
export type Element = (typeof Element)[keyof typeof Element];

export const SkillTree = {
  Movement: 'MOVEMENT',
  Combat: 'COMBAT',
  Gathering: 'GATHERING',
  Element: 'ELEMENT',
} as const;
export type SkillTree = (typeof SkillTree)[keyof typeof SkillTree];

export const QuestType = {
  Main: 'MAIN',
  Side: 'SIDE',
  Guild: 'GUILD',
  Daily: 'DAILY',
  Weekly: 'WEEKLY',
  Hidden: 'HIDDEN',
  World: 'WORLD',
} as const;
export type QuestType = (typeof QuestType)[keyof typeof QuestType];

export const QuestStatus = {
  Available: 'AVAILABLE',
  Active: 'ACTIVE',
  Completed: 'COMPLETED',
  TurnedIn: 'TURNED_IN',
  Failed: 'FAILED',
} as const;
export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus];

export const WeatherKind = {
  Sunny: 'SUNNY',
  Cloudy: 'CLOUDY',
  Rain: 'RAIN',
  Thunderstorm: 'THUNDERSTORM',
  Snow: 'SNOW',
  Fog: 'FOG',
  Windy: 'WINDY',
} as const;
export type WeatherKind = (typeof WeatherKind)[keyof typeof WeatherKind];

export const TimePhase = {
  Sunrise: 'SUNRISE',
  Morning: 'MORNING',
  Afternoon: 'AFTERNOON',
  Sunset: 'SUNSET',
  Night: 'NIGHT',
  Midnight: 'MIDNIGHT',
} as const;
export type TimePhase = (typeof TimePhase)[keyof typeof TimePhase];

export const MovementAbility = {
  Walk: 'WALK',
  Sprint: 'SPRINT',
  Jump: 'JUMP',
  Crouch: 'CROUCH',
  Slide: 'SLIDE',
  Swim: 'SWIM',
  Climb: 'CLIMB',
  Glide: 'GLIDE',
  Dash: 'DASH',
  DoubleJump: 'DOUBLE_JUMP',
  Teleport: 'TELEPORT',
  Fly: 'FLY',
} as const;
export type MovementAbility = (typeof MovementAbility)[keyof typeof MovementAbility];

export const UserRole = {
  Player: 'PLAYER',
  Moderator: 'MODERATOR',
  Admin: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const EntityKind = {
  Player: 'PLAYER',
  Npc: 'NPC',
  Monster: 'MONSTER',
  Animal: 'ANIMAL',
  ResourceNode: 'RESOURCE_NODE',
  Loot: 'LOOT',
} as const;
export type EntityKind = (typeof EntityKind)[keyof typeof EntityKind];
