-- Migrar dinheiro de Float (euros) para Int (cêntimos).
-- ROUND(x*100) converte com arredondamento; USING garante conversão in-place sem perda de dados.

-- rides
ALTER TABLE "rides" RENAME COLUMN "price" TO "priceCents";
ALTER TABLE "rides" ALTER COLUMN "priceCents" TYPE INTEGER USING ROUND("priceCents" * 100)::INTEGER;
ALTER TABLE "rides" RENAME COLUMN "routeTollCost" TO "routeTollCostCents";
ALTER TABLE "rides" ALTER COLUMN "routeTollCostCents" TYPE INTEGER USING ROUND("routeTollCostCents" * 100)::INTEGER;
ALTER TABLE "rides" RENAME COLUMN "platformFee" TO "platformFeeCents";
ALTER TABLE "rides" ALTER COLUMN "platformFeeCents" TYPE INTEGER USING ROUND("platformFeeCents" * 100)::INTEGER;

-- schedule_templates
ALTER TABLE "schedule_templates" RENAME COLUMN "price" TO "priceCents";
ALTER TABLE "schedule_templates" ALTER COLUMN "priceCents" TYPE INTEGER USING ROUND("priceCents" * 100)::INTEGER;

-- wallets
ALTER TABLE "wallets" RENAME COLUMN "balance" TO "balanceCents";
ALTER TABLE "wallets" ALTER COLUMN "balanceCents" TYPE INTEGER USING ROUND("balanceCents" * 100)::INTEGER;
ALTER TABLE "wallets" ALTER COLUMN "balanceCents" SET DEFAULT 0;

-- wallet_transactions
ALTER TABLE "wallet_transactions" RENAME COLUMN "amount" TO "amountCents";
ALTER TABLE "wallet_transactions" ALTER COLUMN "amountCents" TYPE INTEGER USING ROUND("amountCents" * 100)::INTEGER;

-- disputes
ALTER TABLE "disputes" RENAME COLUMN "refundAmount" TO "refundAmountCents";
ALTER TABLE "disputes" ALTER COLUMN "refundAmountCents" TYPE INTEGER USING ROUND("refundAmountCents" * 100)::INTEGER;

-- payout_requests
ALTER TABLE "payout_requests" RENAME COLUMN "amount" TO "amountCents";
ALTER TABLE "payout_requests" ALTER COLUMN "amountCents" TYPE INTEGER USING ROUND("amountCents" * 100)::INTEGER;
