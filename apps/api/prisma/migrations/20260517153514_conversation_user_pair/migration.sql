/*
  Warnings:

  - You are about to drop the column `association_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `association_member_deleted_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `association_member_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `volunteer_deleted_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `volunteer_id` on the `conversations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user1_id,user2_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user1_id` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user2_id` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_association_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_association_member_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_volunteer_id_fkey";

-- DropIndex
DROP INDEX "conversations_association_id_idx";

-- DropIndex
DROP INDEX "conversations_association_member_id_last_message_at_idx";

-- DropIndex
DROP INDEX "conversations_volunteer_id_association_member_id_associatio_key";

-- DropIndex
DROP INDEX "conversations_volunteer_id_last_message_at_idx";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "association_id",
DROP COLUMN "association_member_deleted_at",
DROP COLUMN "association_member_id",
DROP COLUMN "volunteer_deleted_at",
DROP COLUMN "volunteer_id",
ADD COLUMN     "user1_deleted_at" TIMESTAMP(3),
ADD COLUMN     "user1_id" INTEGER NOT NULL,
ADD COLUMN     "user2_deleted_at" TIMESTAMP(3),
ADD COLUMN     "user2_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "conversations_user1_id_last_message_at_idx" ON "conversations"("user1_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_user2_id_last_message_at_idx" ON "conversations"("user2_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user1_id_user2_id_key" ON "conversations"("user1_id", "user2_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
