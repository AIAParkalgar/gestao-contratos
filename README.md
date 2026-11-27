# Gestão de Contratos

Plataforma web para registar e consultar contratos, com login e controlo de acesso por perfil e equipa.

## Funcionalidades (v0.1)

- **Login** com email e password. Não há registo público: as contas são criadas por um administrador.
- **Perfis**: Utilizador e Administrador.
- **Equipas**: começam com Comercial, Comunicação e Operações e são geridas pelos administradores. Um utilizador pode pertencer a várias equipas.
- **Contratos**: tipo, entidade contratante, data de início, data de fim, obrigações, link para o documento (ex.: SharePoint), equipa e visibilidade.
- **Calendário de pagamentos**: De e Para (sempre entre a Parkalgar e a entidade contratante, indicando se é a receber ou a pagar), Data e um montante, que pode ser:
  - um **valor** fixo em euros, ou
  - uma **percentagem** (com o campo "Percentagem de" em texto livre, ex.: "receita de bilheteira").
- **Outras datas relevantes**: renovação, rescisão antecipada, prazo de aviso prévio ou outra (com nome), cada uma com nota opcional.
- **Calendário**: vista mensal e lista dos próximos 12 meses com início e fim de contratos, pagamentos e outras datas, com filtros por tipo. Cada pessoa só vê as datas dos contratos a que tem acesso.
- **Lista** com pesquisa (entidade, tipo, obrigações) e filtros por visibilidade, equipa, estado (ativo / por iniciar / terminado) e "só os meus". Os contratos que terminam nos próximos 30 dias aparecem destacados.
- **Administração de utilizadores**: criar, editar, atribuir equipas e perfil, repor a password e desativar contas.
- **Administração de equipas**: criar, renomear, gerir membros e apagar equipas. Ao apagar, os contratos passam para outra equipa ou, se eram restritos, passam a confidenciais.
- **A minha conta**: cada utilizador pode alterar a sua password.
- **Proteção contra força bruta**: 15 minutos de bloqueio após 5 tentativas de login falhadas.

## Regras de acesso

| Visibilidade | Quem vê | Quem edita/apaga |
|---|---|---|
| Público | Todos os utilizadores | Quem criou + Admin |
| Restrito | Membros da equipa do contrato + quem criou | Quem criou + Admin |
| Confidencial | Só quem criou | Quem criou + Admin |

Os administradores veem e podem editar todos os contratos. As regras são aplicadas no servidor
(`src/lib/access.ts`): um utilizador sem acesso recebe "não encontrado", mesmo que abra o URL diretamente.

## Tecnologia

- Next.js 15 (App Router, Server Actions) + React 19 + TypeScript
- Prisma 6 + PostgreSQL (Supabase em produção)
- Tailwind CSS 4
- Passwords com bcrypt; sessões guardadas na base de dados, com cookie httpOnly válido 7 dias

## Publicar online

Ver **[DEPLOY.md](DEPLOY.md)**: guia passo a passo para Netlify + Supabase.

## Desenvolvimento local

Requer Node.js 20 ou superior e uma base de dados PostgreSQL. Pode ser um Postgres local, por exemplo com Docker:
`docker run -d -p 5432:5432 -e POSTGRES_USER=contratos -e POSTGRES_PASSWORD=contratos postgres:16`.
Também pode ser um segundo projeto gratuito na Supabase. Nunca uses a base de dados de produção para testes.

```bash
npm install
cp .env.example .env      # ajuste DATABASE_URL, DIRECT_URL, ADMIN_EMAIL e ADMIN_PASSWORD
npm run setup             # cria as tabelas + equipas + administrador
npm run dev               # http://localhost:3000
```

Para carregar dados de demonstração (3 utilizadores e 4 contratos):

```bash
npm run db:seed:demo
```

Contas de demonstração (password `demo12345`):

- `ana@empresa.pt`: Comercial
- `bruno@empresa.pt`: Comunicação
- `carla@empresa.pt`: Operações e Comercial

O administrador inicial é criado com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD` do `.env`, se ainda não existir nenhum.

## Estrutura

```
prisma/schema.prisma            modelo de dados (User, Team, Session, Contract, Payment, ContractDate, LoginAttempt)
netlify.toml                    configuração da publicação na Netlify
prisma/seed.ts                  equipas, admin inicial e dados de demonstração
src/lib/access.ts               regras de visibilidade e de edição
src/lib/auth.ts                 sessões, requireUser / requireAdmin
src/lib/validation.ts           validação (zod) de contratos e utilizadores
src/app/(app)/contratos/        lista, detalhe, criar, editar + server actions
src/app/(app)/calendario/       calendário (mês / lista)
src/lib/calendar.ts             recolha dos eventos do calendário (respeita as regras de acesso)
src/app/(app)/admin/utilizadores/  gestão de utilizadores (só admin)
src/app/(app)/admin/equipas/       gestão de equipas (só admin)
src/components/ContractForm.tsx formulário com o calendário de pagamentos
```

## Migrações

Novas tabelas devem ter `ENABLE ROW LEVEL SECURITY` na sua migração (bloqueia a Data API da Supabase).
Como a migração `enable_rls` usa a tabela `_prisma_migrations`, o `prisma migrate dev` falha na base de dados
"shadow"; para criar uma migração, gere o SQL com
`npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
e guarde-o numa nova pasta em `prisma/migrations/`.

## Próximos passos possíveis

- Anexar o PDF do contrato
- Alertas por email de fim de contrato, pagamentos e prazos de aviso prévio
- Estado de cada pagamento (pendente / pago)
- Valor total do contrato e cálculo das percentagens
- Histórico de alterações (auditoria)
- Login com Microsoft 365
- Domínio próprio (ex.: contratos.empresa.pt)
