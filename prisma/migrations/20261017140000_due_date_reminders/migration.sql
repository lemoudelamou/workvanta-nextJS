-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_OVERDUE';

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "emailDueDates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inAppDueDates" BOOLEAN NOT NULL DEFAULT true;
