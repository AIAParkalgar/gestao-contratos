/**
 * npm run db:seed        → cria as equipas e o administrador inicial
 * npm run db:seed:demo   → idem + utilizadores e contratos de demonstração
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEAMS = ["Comercial", "Comunicação", "Operações"];
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function upsertUser(name: string, email: string, password: string, role: string, teamNames: string[]) {
  const teams = await prisma.team.findMany({ where: { name: { in: teamNames } } });
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      teams: { connect: teams.map((t) => ({ id: t.id })) },
    },
  });
}

async function main() {
  // Equipas iniciais: só na primeira vez. Depois são geridas pelos administradores
  // na página "Equipas" (e podem ser renomeadas ou apagadas).
  if ((await prisma.team.count()) === 0) {
    for (const name of TEAMS) await prisma.team.create({ data: { name } });
    console.log(`Equipas iniciais criadas: ${TEAMS.join(", ")}.`);
  }

  // O administrador inicial só é criado se ainda não existir nenhum administrador.
  if ((await prisma.user.count({ where: { role: "ADMIN" } })) === 0) {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";
    if (!adminEmail || adminPassword.length < 8) {
      console.warn(
        "⚠️  AVISO: ainda não existe nenhum administrador. Defina ADMIN_EMAIL e ADMIN_PASSWORD " +
          "(mín. 8 caracteres) e volte a publicar para o criar.",
      );
    } else {
      await upsertUser("Administrador", adminEmail, adminPassword, "ADMIN", []);
      console.log(`Administrador criado: ${adminEmail} → altere a password após o primeiro login.`);
    }
  } else {
    console.log("Já existe um administrador — nada a criar.");
  }

  if (!process.argv.includes("--demo")) return;

  const ana = await upsertUser("Ana Comercial", "ana@empresa.pt", "demo12345", "USER", ["Comercial"]);
  const bruno = await upsertUser("Bruno Comunicação", "bruno@empresa.pt", "demo12345", "USER", ["Comunicação"]);
  const carla = await upsertUser("Carla Operações", "carla@empresa.pt", "demo12345", "USER", ["Operações", "Comercial"]);
  const team = async (name: string) => (await prisma.team.findUniqueOrThrow({ where: { name } })).id;

  if ((await prisma.contract.count()) > 0) {
    console.log("Já existem contratos — dados de demonstração não foram recriados.");
    return;
  }

  await prisma.contract.create({
    data: {
      type: "Patrocínio", entity: "Marca Exemplo, S.A.",
      scope: "Patrocínio principal do evento, com direitos de naming na bancada central.", visibility: "PUBLICO", teamId: await team("Comercial"),
      startDate: d("2026-01-01"), endDate: d("2027-12-31"), creatorId: ana.id,
      obligations: "Patrocinador: pagamento das tranches acordadas.\nEmpresa: exposição de marca nos suportes do evento e 20 convites VIP.",
      payments: { create: [
        { order: 0, direction: "ENTIDADE_PARA_PARKALGAR", date: d("2026-03-01"), mode: "VALOR", amountCents: 5_000_000 },
        { order: 1, direction: "ENTIDADE_PARA_PARKALGAR", date: d("2027-03-01"), mode: "VALOR", amountCents: 5_000_000 },
      ] },
      dates: { create: [
        { order: 0, kind: "AVISO_PREVIO", date: d("2027-10-31"), note: "Comunicar a não renovação até esta data" },
        { order: 1, kind: "RENOVACAO", date: d("2028-01-01"), note: "Renovação automática por 1 ano" },
      ] },
    },
  });
  await prisma.contract.create({
    data: {
      type: "Prestação de serviços", entity: "Agência Criativa, Lda.", visibility: "RESTRITO", teamId: await team("Comunicação"),
      startDate: d("2026-06-01"), endDate: d("2026-12-15"), creatorId: bruno.id,
      obligations: "Agência: campanha digital e gestão de redes sociais.\nEmpresa: aprovação de conteúdos em 48h.",
      payments: { create: [
        { order: 0, direction: "PARKALGAR_PARA_ENTIDADE", date: d("2026-06-15"), mode: "VALOR", amountCents: 1_200_000 },
        { order: 1, direction: "PARKALGAR_PARA_ENTIDADE", date: d("2026-12-15"), mode: "PERCENTAGEM", percentage: 5, percentageBase: "receita de bilheteira online gerada pela campanha" },
      ] },
    },
  });
  await prisma.contract.create({
    data: {
      type: "Fornecimento", entity: "Logística Sul, Lda.", visibility: "RESTRITO", teamId: await team("Operações"),
      startDate: d("2027-01-01"), endDate: d("2027-06-30"), creatorId: carla.id,
      obligations: "Fornecimento de geradores e estruturas temporárias.",
      payments: { create: [
        { order: 0, direction: "PARKALGAR_PARA_ENTIDADE", date: d("2027-01-10"), mode: "VALOR", amountCents: 800_000 },
      ] },
    },
  });
  await prisma.contract.create({
    data: {
      type: "Acordo de confidencialidade (NDA)", entity: "Parceiro Estratégico", visibility: "CONFIDENCIAL", teamId: null,
      startDate: d("2025-01-01"), endDate: d("2025-12-31"), creatorId: ana.id,
      obligations: "Confidencialidade mútua sobre as negociações em curso.",
    },
  });
  console.log("Dados de demonstração criados. Utilizadores: ana@, bruno@, carla@empresa.pt / demo12345");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
