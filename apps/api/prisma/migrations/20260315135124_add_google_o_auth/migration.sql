-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL,
ALTER COLUMN "age" DROP NOT NULL;
