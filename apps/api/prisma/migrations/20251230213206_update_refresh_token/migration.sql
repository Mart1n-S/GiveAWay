-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "user_agent" TEXT;
