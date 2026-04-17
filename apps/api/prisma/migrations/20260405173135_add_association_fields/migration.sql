/*
  Warnings:

  - You are about to drop the column `email` on the `associations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "associations_email_key";

-- AlterTable
ALTER TABLE "associations" DROP COLUMN "email",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "legal_status" TEXT,
ADD COLUMN     "object" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "requires_manual_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT;
