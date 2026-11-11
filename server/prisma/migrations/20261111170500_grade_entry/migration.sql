-- CreateTable
CREATE TABLE "GradeEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "controlType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "nationalGrade" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradeEntry_bookingId_key" ON "GradeEntry"("bookingId");

-- CreateIndex
CREATE INDEX "GradeEntry_studentId_provider_idx" ON "GradeEntry"("studentId", "provider");

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

