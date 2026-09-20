import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { GoogleUser } from './strategies/google.strategy';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContext {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Find or create a user from a verified Google profile, then issue tokens. */
  async loginWithGoogle(profile: GoogleUser, ctx: AuthContext): Promise<TokenPair> {
    if (!profile.email) throw new UnauthorizedException('Google account has no email');

    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          username: await this.uniqueUsername(profile.name || profile.email.split('@')[0]),
          avatarUrl: profile.avatarUrl,
          // First login bootstraps the player profile with spawn defaults.
          player: { create: {} },
        },
      });
    }

    if (user.isBanned) throw new ForbiddenException('Account is banned');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), avatarUrl: profile.avatarUrl ?? user.avatarUrl },
    });

    return this.issueTokens(
      { sub: user.id, username: user.username, role: user.role },
      randomUUID(),
      ctx,
    );
  }

  /** Rotate a refresh token. Detects reuse of a revoked token and kills the family. */
  async refresh(presentedToken: string, ctx: AuthContext): Promise<TokenPair> {
    const tokenHash = this.hashToken(presentedToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: a revoked token presented again => compromise. Revoke the whole family.
    if (record.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: record.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.isBanned) throw new UnauthorizedException('User unavailable');

    const next = await this.issueTokens(
      { sub: user.id, username: user.username, role: user.role },
      record.family,
      ctx,
    );

    // Mark the old token revoked + chained to the replacement.
    const newHash = this.hashToken(next.refreshToken);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: newHash },
    });

    return next;
  }

  /** Revoke a single refresh token (logout). */
  async logout(presentedToken: string): Promise<void> {
    const tokenHash = this.hashToken(presentedToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  private async issueTokens(
    payload: JwtPayload,
    family: string,
    ctx: AuthContext,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.getOrThrow('JWT_ACCESS_TTL')),
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtl = Number(this.config.getOrThrow('JWT_REFRESH_TTL'));
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: ctx.userAgent,
        ip: ctx.ip,
      },
    });

    return { accessToken, refreshToken };
  }

  /** Verify an access token out-of-band (used by the socket gateway handshake). */
  async verifyAccess(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Deterministic keyed hash (HMAC-SHA256) so we can look a token up by value
   * while never storing the raw token. The refresh secret acts as the pepper.
   */
  private hashToken(token: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(token)
      .digest('hex');
  }

  private async uniqueUsername(base: string): Promise<string> {
    const root = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'traveler';
    for (let i = 0; i < 20; i++) {
      const candidate = i === 0 ? root : `${root}${randomBytes(2).toString('hex')}`;
      const exists = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) return candidate;
    }
    return `${root}_${randomUUID().slice(0, 8)}`;
  }
}
