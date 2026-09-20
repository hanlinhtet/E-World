import 'reflect-metadata';
import './load-env'; // must run before AppModule is imported (loads root .env)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const adminOrigin = process.env.ADMIN_ORIGIN ?? 'http://localhost:3001';
  app.enableCors({ origin: [webOrigin, adminOrigin], credentials: true });

  const port = Number(process.env.SERVER_PORT ?? 4000);
  const host = process.env.SERVER_HOST ?? '0.0.0.0';
  await app.listen(port, host);
  logger.log(`E-World server listening on http://${host}:${port}/api`);
}

void bootstrap();
