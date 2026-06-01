-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "clinical_notes" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "reminder_note" TEXT,
ADD COLUMN     "requires_pre_consult" BOOLEAN NOT NULL DEFAULT false;
