-- Novos campos do contrato: contactos da entidade, renovação automática, responsável interno
ALTER TABLE "Contract"
  ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "entityNif" TEXT,
  ADD COLUMN "noticeDays" INTEGER,
  ADD COLUMN "renewalMonths" INTEGER,
  ADD COLUMN "responsibleId" TEXT;
CREATE INDEX "Contract_responsibleId_idx" ON "Contract"("responsibleId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_responsibleId_fkey"
  FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Contratos existentes: o responsável passa a ser quem os criou
UPDATE "Contract" SET "responsibleId" = "creatorId" WHERE "responsibleId" IS NULL;

-- Vários documentos por contrato
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- O link único que existia passa a ser o primeiro documento, chamado "Contrato"
INSERT INTO "ContractDocument" ("id", "contractId", "name", "url", "order")
  SELECT 'doc' || md5(random()::text || "id"), "id", 'Contrato', "documentUrl", 0
  FROM "Contract" WHERE "documentUrl" IS NOT NULL AND "documentUrl" <> '';
ALTER TABLE "Contract" DROP COLUMN "documentUrl";

-- Histórico de alterações (sem chave estrangeira, para manter o registo de contratos apagados)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_contractId_createdAt_idx" ON "AuditLog"("contractId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Bloquear a Data API da Supabase nas novas tabelas
ALTER TABLE "ContractDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
