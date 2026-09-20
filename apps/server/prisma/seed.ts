/**
 * Seed baseline game content: item definitions, resource tuning, a couple of
 * recipes, and a starter NPC + quest. Idempotent (uses upsert) so it is safe to
 * re-run. Player accounts are created on first Google login, not here.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // ── Items ──────────────────────────────────────────────────
  const items = [
    { key: 'wood', name: 'Wood', category: 'RESOURCE', basePrice: 2, weight: 1 },
    { key: 'stone', name: 'Stone', category: 'RESOURCE', basePrice: 2, weight: 2 },
    { key: 'iron_ore', name: 'Iron Ore', category: 'RESOURCE', basePrice: 8, weight: 3, rarity: 'UNCOMMON' },
    { key: 'wooden_pickaxe', name: 'Wooden Pickaxe', category: 'TOOL', basePrice: 15, weight: 2 },
    { key: 'iron_pickaxe', name: 'Iron Pickaxe', category: 'TOOL', basePrice: 60, weight: 3, rarity: 'UNCOMMON' },
    { key: 'health_potion', name: 'Health Potion', category: 'POTION', basePrice: 25, weight: 0.5 },
  ] as const;

  for (const it of items) {
    await prisma.itemDefinition.upsert({
      where: { key: it.key },
      update: {},
      create: {
        key: it.key,
        name: it.name,
        category: it.category,
        basePrice: it.basePrice,
        weight: it.weight,
        rarity: ('rarity' in it ? it.rarity : 'COMMON') as never,
      },
    });
  }

  // ── Resource tuning ────────────────────────────────────────
  const resources = [
    { kind: 'WOOD', yieldItemKey: 'wood', respawnSec: 120, basePrice: 2 },
    { kind: 'STONE', yieldItemKey: 'stone', respawnSec: 180, basePrice: 2 },
    { kind: 'IRON', yieldItemKey: 'iron_ore', respawnSec: 600, basePrice: 8, rarity: 'UNCOMMON', requiredTool: 'wooden_pickaxe' },
  ] as const;

  for (const r of resources) {
    await prisma.resourceDefinition.upsert({
      where: { kind: r.kind as never },
      update: {},
      create: {
        kind: r.kind as never,
        yieldItemKey: r.yieldItemKey,
        respawnSec: r.respawnSec,
        basePrice: r.basePrice,
        rarity: ('rarity' in r ? r.rarity : 'COMMON') as never,
        requiredTool: 'requiredTool' in r ? r.requiredTool : null,
      },
    });
  }

  // ── A recipe: iron pickaxe ─────────────────────────────────
  await prisma.craftingRecipe.upsert({
    where: { key: 'recipe_iron_pickaxe' },
    update: {},
    create: {
      key: 'recipe_iron_pickaxe',
      outputKey: 'iron_pickaxe',
      station: 'forge',
      unlockLevel: 3,
      ingredients: {
        create: [
          { itemKey: 'iron_ore', quantity: 3 },
          { itemKey: 'wood', quantity: 2 },
        ],
      },
    },
  });

  // ── Starter NPC + intro quest ──────────────────────────────
  await prisma.npcDefinition.upsert({
    where: { key: 'elder_rowan' },
    update: {},
    create: {
      key: 'elder_rowan',
      name: 'Elder Rowan',
      role: 'questgiver',
      dialogue: { greeting: 'Welcome, traveler. The world awaits.' },
    },
  });

  await prisma.questDefinition.upsert({
    where: { key: 'intro_first_steps' },
    update: {},
    create: {
      key: 'intro_first_steps',
      title: 'First Steps',
      type: 'MAIN',
      description: 'Gather 5 wood and 5 stone to begin your journey.',
      objectives: [
        { id: 'wood', kind: 'gather', target: 'wood', count: 5 },
        { id: 'stone', kind: 'gather', target: 'stone', count: 5 },
      ],
      rewards: { coins: 50, xp: 100, items: [{ key: 'wooden_pickaxe', qty: 1 }] },
    },
  });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
