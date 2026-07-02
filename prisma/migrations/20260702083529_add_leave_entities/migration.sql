/*
  Warnings:

  - You are about to drop the column `decisionNote` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `leave_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_managerId_fkey";

-- DropIndex
DROP INDEX "leave_requests_managerId_idx";

-- AlterTable
ALTER TABLE "leave_requests" DROP COLUMN "decisionNote",
DROP COLUMN "managerId";
