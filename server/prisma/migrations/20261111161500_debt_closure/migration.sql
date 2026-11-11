-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "debtClosureRecommended";

-- CreateTable
CREATE TABLE "DebtClosure" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "debtTitle" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebtClosure_bookingId_key" ON "DebtClosure"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "DebtClosure_studentId_provider_debtId_key" ON "DebtClosure"("studentId", "provider", "debtId");

-- AddForeignKey
ALTER TABLE "DebtClosure" ADD CONSTRAINT "DebtClosure_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtClosure" ADD CONSTRAINT "DebtClosure_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

