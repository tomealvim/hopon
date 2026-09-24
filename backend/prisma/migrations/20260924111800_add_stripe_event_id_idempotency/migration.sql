-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN "stripeEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_stripeEventId_key" ON "wallet_transactions"("stripeEventId");
