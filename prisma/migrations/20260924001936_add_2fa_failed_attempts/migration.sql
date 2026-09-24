-- AlterTable
ALTER TABLE "TwoFactorChallenge" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0;
