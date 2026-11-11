-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "conductedAt" TIMESTAMP(3),
ADD COLUMN     "debtClosureRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teacherNote" TEXT;
