import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/jwt-auth.guard';
import type { GoogleUser } from './strategies/google.strategy';

const REFRESH_COOKIE = 'eworld_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** Step 1: redirect to Google's consent screen (handled by the guard). */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google(): void {
    /* passport redirects */
  }

  /** Step 2: Google calls back here; we mint tokens and bounce to the web app. */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as GoogleUser;
    const { accessToken, refreshToken } = await this.auth.loginWithGoogle(profile, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setRefreshCookie(res, refreshToken);
    const webOrigin = this.config.getOrThrow<string>('WEB_ORIGIN');
    res.redirect(`${webOrigin}/auth/callback#access_token=${accessToken}`);
  }

  /** Exchange the refresh cookie for a new token pair (rotation). */
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }
    const pair = await this.auth.refresh(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setRefreshCookie(res, pair.refreshToken);
    res.json({ accessToken: pair.accessToken });
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ ok: true });
  }

  private setRefreshCookie(res: Response, token: string): void {
    const ttl = Number(this.config.getOrThrow('JWT_REFRESH_TTL')) * 1000;
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: ttl,
    });
  }
}
