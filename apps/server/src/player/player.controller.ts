import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { PlayerSettings } from '@eworld/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import { PlayerService } from './player.service';

@Controller('player')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(private readonly players: PlayerService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.players.getProfile(user.sub);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: AuthUser, @Body() settings: Partial<PlayerSettings>) {
    return this.players.updateSettings(user.sub, settings);
  }
}
