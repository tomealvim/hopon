-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "tokenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenId_key" ON "refresh_tokens"("tokenId");
