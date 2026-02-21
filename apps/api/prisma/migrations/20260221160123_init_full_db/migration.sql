-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvailabilityFrequency" AS ENUM ('HOURS_WEEK', 'HOURS_MONTH', 'DAYS_WEEK', 'DAYS_MONTH', 'ONE_DAY', 'PUNCTUAL');

-- CreateEnum
CREATE TYPE "AvailabilityTime" AS ENUM ('WEEKDAY', 'WEEKEND', 'EVENING', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('REMOTE', 'ON_SITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MISSION', 'EVENT', 'COLLECT', 'INFO');

-- CreateEnum
CREATE TYPE "MissionFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- DropForeignKey
ALTER TABLE "association_users" DROP CONSTRAINT "association_users_association_id_fkey";

-- DropForeignKey
ALTER TABLE "association_users" DROP CONSTRAINT "association_users_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "missions" (
    "id" SERIAL NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'MISSION',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "has_registration" BOOLEAN NOT NULL DEFAULT true,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "volunteers_needed" INTEGER,
    "duration_minutes" INTEGER,
    "frequency" "MissionFrequency" DEFAULT 'ONCE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "association_id" INTEGER NOT NULL,
    "address_id" INTEGER,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_types" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "public_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_public_types" (
    "mission_id" INTEGER NOT NULL,
    "public_type_id" INTEGER NOT NULL,

    CONSTRAINT "mission_public_types_pkey" PRIMARY KEY ("mission_id","public_type_id")
);

-- CreateTable
CREATE TABLE "volunteer_types" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "volunteer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_volunteer_types" (
    "mission_id" INTEGER NOT NULL,
    "volunteer_type_id" INTEGER NOT NULL,

    CONSTRAINT "mission_volunteer_types_pkey" PRIMARY KEY ("mission_id","volunteer_type_id")
);

-- CreateTable
CREATE TABLE "mission_participants" (
    "mission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_participants_pkey" PRIMARY KEY ("mission_id","user_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("user_id","skill_id")
);

-- CreateTable
CREATE TABLE "causes" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_causes" (
    "user_id" INTEGER NOT NULL,
    "cause_id" INTEGER NOT NULL,

    CONSTRAINT "user_causes_pkey" PRIMARY KEY ("user_id","cause_id")
);

-- CreateTable
CREATE TABLE "mission_skills" (
    "mission_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "mission_skills_pkey" PRIMARY KEY ("mission_id","skill_id")
);

-- CreateTable
CREATE TABLE "mission_causes" (
    "mission_id" INTEGER NOT NULL,
    "cause_id" INTEGER NOT NULL,

    CONSTRAINT "mission_causes_pkey" PRIMARY KEY ("mission_id","cause_id")
);

-- CreateTable
CREATE TABLE "user_availabilities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "frequency" "AvailabilityFrequency" NOT NULL DEFAULT 'HOURS_WEEK',
    "timeSlot" "AvailabilityTime" NOT NULL DEFAULT 'ALL_TIME',
    "type" "AvailabilityType" NOT NULL DEFAULT 'HYBRID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_documents" (
    "id" SERIAL NOT NULL,
    "file_url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "association_id" INTEGER NOT NULL,

    CONSTRAINT "association_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "details" JSONB,
    "admin_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_types_label_key" ON "public_types"("label");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_types_label_key" ON "volunteer_types"("label");

-- CreateIndex
CREATE UNIQUE INDEX "skills_label_key" ON "skills"("label");

-- CreateIndex
CREATE UNIQUE INDEX "causes_label_key" ON "causes"("label");

-- CreateIndex
CREATE UNIQUE INDEX "user_availabilities_user_id_key" ON "user_availabilities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_public_types" ADD CONSTRAINT "mission_public_types_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_public_types" ADD CONSTRAINT "mission_public_types_public_type_id_fkey" FOREIGN KEY ("public_type_id") REFERENCES "public_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_volunteer_types" ADD CONSTRAINT "mission_volunteer_types_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_volunteer_types" ADD CONSTRAINT "mission_volunteer_types_volunteer_type_id_fkey" FOREIGN KEY ("volunteer_type_id") REFERENCES "volunteer_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_participants" ADD CONSTRAINT "mission_participants_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_participants" ADD CONSTRAINT "mission_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_causes" ADD CONSTRAINT "user_causes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_causes" ADD CONSTRAINT "user_causes_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_skills" ADD CONSTRAINT "mission_skills_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_skills" ADD CONSTRAINT "mission_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_causes" ADD CONSTRAINT "mission_causes_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_causes" ADD CONSTRAINT "mission_causes_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_documents" ADD CONSTRAINT "association_documents_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_users" ADD CONSTRAINT "association_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_users" ADD CONSTRAINT "association_users_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
