// Sentry deve ser inicializado antes de qualquer outro import da aplicação
import * as Sentry from '@sentry/nestjs';

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2, // 20% das transações em traces
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { json, urlencoded, raw } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Usar pino como logger global (JSON em produção, pretty em dev)
  app.useLogger(app.get(Logger));

  // Stripe webhook precisa de raw body ANTES do parser JSON global
  app.use('/api/v1/stripe/webhook', raw({ type: 'application/json' }));

  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ limit: '8mb', extended: true }));

  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS - suporta múltiplas origens via FRONTEND_URL (vírgulas)
  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .get<string>('FRONTEND_URL', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Swagger - apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Hopon API')
      .setDescription('API do Hopon (MVP)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
