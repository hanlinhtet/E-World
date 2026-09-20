import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlayerModule } from './player/player.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: loadEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    PlayerModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
