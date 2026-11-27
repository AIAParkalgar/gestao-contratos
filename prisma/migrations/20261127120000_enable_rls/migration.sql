-- Na Supabase, as tabelas do schema "public" ficam expostas pela Data API (PostgREST).
-- Ativar RLS sem políticas bloqueia esse acesso; a app liga-se com o dono das tabelas, que não é afetado.
-- Novas tabelas: acrescentar "ENABLE ROW LEVEL SECURITY" na respetiva migração.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_UserTeams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
