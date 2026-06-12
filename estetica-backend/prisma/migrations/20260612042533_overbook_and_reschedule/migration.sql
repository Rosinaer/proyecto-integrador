-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_availability_id_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "is_overbook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reschedule_requested_at" TIMESTAMP(3),
ALTER COLUMN "availability_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "availability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
