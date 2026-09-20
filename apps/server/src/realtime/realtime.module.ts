import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlayerModule } from '../player/player.module';
import { GameGateway } from './game.gateway';
import { SessionRegistry } from './session.registry';

@Module({
  imports: [AuthModule, PlayerModule],
  providers: [GameGateway, SessionRegistry],
})
export class RealtimeModule {}
