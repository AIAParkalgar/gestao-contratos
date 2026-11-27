-- Link para o documento do contrato (ex.: SharePoint)
ALTER TABLE "Contract" ADD COLUMN "documentUrl" TEXT;

-- Pagamentos: "De"/"Para" passam a ser sempre entre a Parkalgar e a entidade contratante.
-- Converte os registos existentes: se "De" começava por "Parkalgar", a Parkalgar paga; caso contrário, recebe.
ALTER TABLE "Payment" ADD COLUMN "direction" TEXT;
UPDATE "Payment"
   SET "direction" = CASE WHEN "fromParty" ILIKE 'parkalgar%' THEN 'PARKALGAR_PARA_ENTIDADE'
                          ELSE 'ENTIDADE_PARA_PARKALGAR' END;
ALTER TABLE "Payment" ALTER COLUMN "direction" SET NOT NULL;
ALTER TABLE "Payment" DROP COLUMN "fromParty", DROP COLUMN "toParty";
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- Outras datas relevantes
CREATE TABLE "ContractDate" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContractDate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractDate_contractId_idx" ON "ContractDate"("contractId");
CREATE INDEX "ContractDate_date_idx" ON "ContractDate"("date");
ALTER TABLE "ContractDate" ADD CONSTRAINT "ContractDate_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bloquear a Data API da Supabase (ver migração enable_rls)
ALTER TABLE "ContractDate" ENABLE ROW LEVEL SECURITY;
