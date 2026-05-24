/*
  Warnings:

  - Made the column `availability_type` on table `missions` required. This step will fail if there are existing NULL values in that column.

*/
-- Convertir les NULLs existants avant de rendre la colonne NOT NULL
UPDATE "missions" SET "availability_type" = 'ON_SITE' WHERE "availability_type" IS NULL;

-- AlterTable
ALTER TABLE "missions" ALTER COLUMN "availability_type" SET NOT NULL,
ALTER COLUMN "availability_type" SET DEFAULT 'ON_SITE';
