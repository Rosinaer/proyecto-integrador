-- ============================================================
-- 1) DocumentType: se quitan CUIL y CUIT y se agrega OTHER.
--    Las personas que ya tuvieran CUIL/CUIT pasan a OTHER.
-- ============================================================
CREATE TYPE "DocumentType_new" AS ENUM ('DNI', 'PASSPORT', 'OTHER');

ALTER TABLE "people"
  ALTER COLUMN "document_type" TYPE "DocumentType_new"
  USING (
    CASE
      WHEN "document_type"::text IN ('CUIL', 'CUIT') THEN 'OTHER'
      ELSE "document_type"::text
    END::"DocumentType_new"
  );

DROP TYPE "DocumentType";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";

-- ============================================================
-- 2) cuil_cuit pasa de patients a people.
--    Se agrega la columna en people, se copian los valores que ya
--    tenían los pacientes, y se elimina la columna de patients.
--    Queda con DEFAULT '' para que sea opcional (no obligatorio).
-- ============================================================
ALTER TABLE "people" ADD COLUMN "cuil_cuit" TEXT NOT NULL DEFAULT '';

UPDATE "people" p
  SET "cuil_cuit" = COALESCE(pat."cuil_cuit", '')
  FROM "patients" pat
  WHERE pat."people_id" = p."id";

ALTER TABLE "patients" DROP COLUMN "cuil_cuit";
