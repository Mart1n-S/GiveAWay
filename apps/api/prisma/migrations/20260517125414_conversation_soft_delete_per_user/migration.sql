-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "association_member_deleted_at" TIMESTAMP(3),
ADD COLUMN     "volunteer_deleted_at" TIMESTAMP(3);
