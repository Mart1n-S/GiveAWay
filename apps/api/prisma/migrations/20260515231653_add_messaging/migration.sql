-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "association_member_id" INTEGER NOT NULL,
    "association_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_volunteer_id_last_message_at_idx" ON "conversations"("volunteer_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_association_member_id_last_message_at_idx" ON "conversations"("association_member_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_association_id_idx" ON "conversations"("association_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_volunteer_id_association_member_id_associatio_key" ON "conversations"("volunteer_id", "association_member_id", "association_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_read_at_idx" ON "messages"("conversation_id", "read_at");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_association_member_id_fkey" FOREIGN KEY ("association_member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
