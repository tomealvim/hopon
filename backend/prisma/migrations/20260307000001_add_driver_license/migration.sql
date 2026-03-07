-- AddColumn driverLicenseUrl, driverLicenseStatus, driverLicenseCcNumber, driverLicenseAdminNote to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseCcNumber" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseAdminNote" TEXT;
