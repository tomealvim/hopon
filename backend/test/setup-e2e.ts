// Carregar .env.test para process.env ANTES de qualquer import que possa
// ler variaveis de ambiente (Prisma, ConfigModule, etc.). O ConfigModule do
// Nest so le .env ou o ficheiro apontado por BACKEND_ENV_FILE, nunca troca
// automaticamente com base em NODE_ENV - por isso isto tem de ser feito aqui,
// manualmente, antes do AppModule arrancar.
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

// Cliente Prisma dedicado aos testes, apontado para hopon_test via .env.test.
// Reutilizado entre testes para nao abrir uma ligacao nova por ficheiro.
export const prisma = new PrismaClient();

/**
 * Monta uma instancia da aplicacao identica ao main.ts em producao, mas sem
 * chamar listen() - o supertest fala diretamente com a instancia em memoria.
 *
 * Deliberadamente NAO replicado aqui (irrelevante para testes de API):
 * Sentry, Swagger, helmet, CORS, logger pino, raw body do webhook Stripe.
 * O essencial e o setGlobalPrefix, o ValidationPipe e o AllExceptionsFilter,
 * porque sao o que decide se um pedido e aceite, validado e formatado da
 * mesma forma que em producao.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

/**
 * Limpa todas as tabelas relevantes para os testes, sem recriar a base de
 * dados (que seria lento). TRUNCATE ... CASCADE tambem limpa tabelas
 * dependentes, evitando erros de foreign key ao truncar por ordem errada -
 * mas listamos as 26 tabelas explicitamente, em vez de confiar so no CASCADE,
 * para o ficheiro servir de inventario vivo do schema e falhar de forma
 * visivel (tabela nao encontrada) se o schema mudar e isto nao for atualizado.
 *
 * Chamar isto num beforeEach garante que cada teste comeca com a base de
 * dados vazia, sem depender da ordem de execucao dos testes anteriores.
 *
 * A lista usa os nomes reais das tabelas (snake_case, via @@map), nao os
 * nomes dos models Prisma - o mesmo detalhe que causou o bug na migration
 * 20260302000002. Lista confirmada contra schema.prisma em 22/09/2026;
 * atualiza-a se adicionares um novo model.
 */
export async function cleanDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "recurring_arrangements",
      "community_members",
      "communities",
      "recurring_bookings",
      "payout_requests",
      "ride_requests",
      "user_routes",
      "disputes",
      "push_subscriptions",
      "notifications",
      "reports",
      "ratings",
      "refresh_tokens",
      "wallet_transactions",
      "wallets",
      "messages",
      "conversation_participants",
      "conversations",
      "bookings",
      "schedule_templates",
      "rides",
      "locations",
      "vehicles",
      "profiles",
      "otp_codes",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
  await prisma.$disconnect();
}
