-- AlterTable
ALTER TABLE "users" ADD COLUMN     "push_token" TEXT;

-- CreateTable
CREATE TABLE "user_association_follows" (
    "user_id" INTEGER NOT NULL,
    "association_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_association_follows_pkey" PRIMARY KEY ("user_id","association_id")
);

-- AddForeignKey
ALTER TABLE "user_association_follows" ADD CONSTRAINT "user_association_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_association_follows" ADD CONSTRAINT "user_association_follows_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
