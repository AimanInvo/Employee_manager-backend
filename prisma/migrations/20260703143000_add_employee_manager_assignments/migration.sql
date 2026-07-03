-- CreateTable
CREATE TABLE "employee_managers" (
    "employeeId" INTEGER NOT NULL,
    "managerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_managers_pkey" PRIMARY KEY ("employeeId","managerId")
);

-- Copy existing one-manager assignments into the new many-to-many table.
INSERT INTO "employee_managers" ("employeeId", "managerId")
SELECT "id", "managerId"
FROM "employees"
WHERE "managerId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "employee_managers_managerId_idx" ON "employee_managers"("managerId");

-- AddForeignKey
ALTER TABLE "employee_managers" ADD CONSTRAINT "employee_managers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_managers" ADD CONSTRAINT "employee_managers_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_managerId_fkey";

-- DropIndex
DROP INDEX "employees_managerId_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "managerId";
