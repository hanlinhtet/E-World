-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('WEAPON', 'ARMOR', 'TOOL', 'FOOD', 'MEDICINE', 'POTION', 'ACCESSORY', 'MAGIC_SCROLL', 'FURNITURE', 'MATERIAL', 'BUILDING_MATERIAL', 'RESOURCE', 'QUEST');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('HEAD', 'CHEST', 'LEGS', 'FEET', 'HANDS', 'MAIN_HAND', 'OFF_HAND', 'RING_1', 'RING_2', 'AMULET', 'CAPE');

-- CreateEnum
CREATE TYPE "SkillTree" AS ENUM ('MOVEMENT', 'COMBAT', 'GATHERING', 'ELEMENT');

-- CreateEnum
CREATE TYPE "Element" AS ENUM ('FIRE', 'WATER', 'EARTH', 'LIGHTNING', 'WIND', 'NATURE', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "Biome" AS ENUM ('FOREST', 'MOUNTAIN', 'SNOW', 'DESERT', 'BEACH', 'OCEAN', 'VOLCANO', 'SWAMP', 'RUINS', 'VILLAGE', 'CAPITAL_CITY', 'MAGIC_ACADEMY', 'ANCIENT_TEMPLE', 'SKY_ISLAND', 'DUNGEON', 'MINE', 'UNDERGROUND_CAVE', 'BOSS_AREA');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('MAIN', 'SIDE', 'GUILD', 'DAILY', 'WEEKLY', 'HIDDEN', 'WORLD');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'COMPLETED', 'TURNED_IN', 'FAILED');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('WOOD', 'STONE', 'COAL', 'IRON', 'COPPER', 'GOLD', 'SILVER', 'DIAMOND', 'RUBY', 'EMERALD', 'SAPPHIRE', 'QUARTZ', 'CRYSTAL', 'OBSIDIAN', 'MITHRIL', 'ANCIENT_ORE', 'CLAY', 'SAND', 'SALT', 'ICE_CRYSTAL', 'CORAL', 'PEARL', 'SEAWEED', 'HERBS', 'FLOWERS', 'MUSHROOMS', 'ANIMAL_HIDE', 'BONES', 'LEATHER', 'FISH', 'WATER', 'LAVA_CRYSTAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" TEXT,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "max_health" INTEGER NOT NULL DEFAULT 100,
    "stamina" INTEGER NOT NULL DEFAULT 100,
    "max_stamina" INTEGER NOT NULL DEFAULT 100,
    "mana" INTEGER NOT NULL DEFAULT 50,
    "max_mana" INTEGER NOT NULL DEFAULT 50,
    "world_id" TEXT NOT NULL DEFAULT 'overworld',
    "pos_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pos_y" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "pos_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pitch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_definitions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "ItemCategory" NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "max_stack" INTEGER NOT NULL DEFAULT 99,
    "base_price" INTEGER NOT NULL DEFAULT 0,
    "icon_url" TEXT,
    "model_url" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "item_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "item_key" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_definitions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tree" "SkillTree" NOT NULL,
    "element" "Element",
    "tier" INTEGER NOT NULL DEFAULT 1,
    "cost_coins" INTEGER NOT NULL DEFAULT 0,
    "requires" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teacher_npc" TEXT,

    CONSTRAINT "skill_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "player_skills" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "skill_key" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "learned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_elements" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "element" "Element" NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crafting_recipes" (
    "key" TEXT NOT NULL,
    "output_key" TEXT NOT NULL,
    "output_qty" INTEGER NOT NULL DEFAULT 1,
    "station" TEXT,
    "unlock_level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "crafting_recipes_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_key" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_of_interest" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biome" "Biome" NOT NULL,
    "pos_x" DOUBLE PRECISION NOT NULL,
    "pos_y" DOUBLE PRECISION NOT NULL,
    "pos_z" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "points_of_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_definitions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'villager',
    "dialogue" JSONB NOT NULL DEFAULT '{}',
    "shop_id" TEXT,
    "model_url" TEXT,

    CONSTRAINT "npc_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "npcs" (
    "id" TEXT NOT NULL,
    "def_key" TEXT NOT NULL,
    "poi_id" TEXT,
    "home_x" DOUBLE PRECISION NOT NULL,
    "home_y" DOUBLE PRECISION NOT NULL,
    "home_z" DOUBLE PRECISION NOT NULL,
    "schedule" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "npcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_relationships" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "npc_def_key" TEXT NOT NULL,
    "friendship" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "memory" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "npc_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_definitions" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "QuestType" NOT NULL,
    "objectives" JSONB NOT NULL DEFAULT '[]',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "quest_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "player_quests" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "quest_key" TEXT NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "target" INTEGER NOT NULL DEFAULT 1,
    "reward_coins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_definitions" (
    "kind" "ResourceKind" NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "base_price" INTEGER NOT NULL DEFAULT 1,
    "respawn_sec" INTEGER NOT NULL DEFAULT 300,
    "yield_item_key" TEXT NOT NULL,
    "required_tool" TEXT,

    CONSTRAINT "resource_definitions_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

-- CreateIndex
CREATE INDEX "inventory_items_player_id_idx" ON "inventory_items"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_player_id_slot_key" ON "inventory_items"("player_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_player_id_slot_key" ON "equipment"("player_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_player_id_skill_key_key" ON "player_skills"("player_id", "skill_key");

-- CreateIndex
CREATE UNIQUE INDEX "player_elements_player_id_element_key" ON "player_elements"("player_id", "element");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_key_item_key_key" ON "recipe_ingredients"("recipe_key", "item_key");

-- CreateIndex
CREATE UNIQUE INDEX "points_of_interest_key_key" ON "points_of_interest"("key");

-- CreateIndex
CREATE INDEX "npcs_def_key_idx" ON "npcs"("def_key");

-- CreateIndex
CREATE UNIQUE INDEX "npc_relationships_player_id_npc_def_key_key" ON "npc_relationships"("player_id", "npc_def_key");

-- CreateIndex
CREATE INDEX "player_quests_player_id_idx" ON "player_quests"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_quests_player_id_quest_key_key" ON "player_quests"("player_id", "quest_key");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_player_id_achievement_key_key" ON "player_achievements"("player_id", "achievement_key");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_item_key_fkey" FOREIGN KEY ("item_key") REFERENCES "item_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_skill_key_fkey" FOREIGN KEY ("skill_key") REFERENCES "skill_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_elements" ADD CONSTRAINT "player_elements_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_recipes" ADD CONSTRAINT "crafting_recipes_output_key_fkey" FOREIGN KEY ("output_key") REFERENCES "item_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_key_fkey" FOREIGN KEY ("recipe_key") REFERENCES "crafting_recipes"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_item_key_fkey" FOREIGN KEY ("item_key") REFERENCES "item_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_def_key_fkey" FOREIGN KEY ("def_key") REFERENCES "npc_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "points_of_interest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_npc_def_key_fkey" FOREIGN KEY ("npc_def_key") REFERENCES "npc_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_quests" ADD CONSTRAINT "player_quests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_quests" ADD CONSTRAINT "player_quests_quest_key_fkey" FOREIGN KEY ("quest_key") REFERENCES "quest_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_key_fkey" FOREIGN KEY ("achievement_key") REFERENCES "achievement_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
