-- CreateTable
CREATE TABLE "DriverTimeEntry" (
      "id" TEXT NOT NULL,
      "driverId" TEXT NOT NULL,
      "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "clockOut" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverTimeEntry_pkey" PRIMARY KEY ("id")
  );

-- AddForeignKey
ALTER TABLE "DriverTimeEntry" ADD CONSTRAINT "DriverTimeEntry_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
