-- AlterTable
ALTER TABLE "missions" ALTER COLUMN "availability_type" DROP NOT NULL,
ALTER COLUMN "availability_type" DROP DEFAULT;
