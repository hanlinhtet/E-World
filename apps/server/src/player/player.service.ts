import { Injectable, NotFoundException } from '@nestjs/common';
import { xpForLevel, type PlayerSettings } from '@eworld/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Player profile + progression. Authority for XP/level/coins lives here. */
@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        player: {
          include: {
            inventory: { include: { item: true } },
            equipment: true,
            elements: true,
            learnedSkills: true,
            achievements: true,
          },
        },
      },
    });
    if (!user?.player) throw new NotFoundException('Player not found');

    const { player } = user;
    return {
      uid: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      level: player.level,
      xp: player.xp,
      coins: player.coins,
      stats: {
        health: player.health,
        maxHealth: player.maxHealth,
        stamina: player.stamina,
        maxStamina: player.maxStamina,
        mana: player.mana,
        maxMana: player.maxMana,
      },
      position: { x: player.posX, y: player.posY, z: player.posZ },
      look: { yaw: player.yaw, pitch: player.pitch },
      worldId: player.worldId,
      settings: player.settings,
      elements: player.elements.map((e) => e.element),
      skills: player.learnedSkills.map((s) => s.skillKey),
      inventory: player.inventory,
      equipment: player.equipment,
      achievements: player.achievements,
    };
  }

  /** Persist transform — called on the write-behind flush, not per tick. */
  async savePosition(
    userId: string,
    pos: { x: number; y: number; z: number },
    look: { yaw: number; pitch: number },
    worldId: string,
  ): Promise<void> {
    await this.prisma.player.update({
      where: { userId },
      data: { posX: pos.x, posY: pos.y, posZ: pos.z, yaw: look.yaw, pitch: look.pitch, worldId },
    });
  }

  async updateSettings(userId: string, settings: Partial<PlayerSettings>) {
    const player = await this.prisma.player.findUnique({ where: { userId } });
    if (!player) throw new NotFoundException('Player not found');
    const merged = { ...(player.settings as object), ...settings };
    await this.prisma.player.update({ where: { userId }, data: { settings: merged } });
    return merged;
  }

  /** Grant XP and roll up level-ups using the shared progression curve. */
  async grantXp(userId: string, amount: number) {
    const player = await this.prisma.player.findUnique({ where: { userId } });
    if (!player) throw new NotFoundException('Player not found');

    let { xp, level } = player;
    xp += amount;
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
    }
    return this.prisma.player.update({ where: { userId }, data: { xp, level } });
  }
}
