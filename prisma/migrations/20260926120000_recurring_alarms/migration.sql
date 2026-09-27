-- AlterTable
ALTER TABLE "Alarm" ALTER COLUMN "horaProgramada" DROP NOT NULL,
ADD COLUMN "recurrencia" JSONB;

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);
