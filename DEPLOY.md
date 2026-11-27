# Publicar a plataforma online (Netlify + Supabase)

Este guia põe a plataforma online, com um endereço do tipo `https://contratos-empresa.netlify.app`.
Demora cerca de 30 minutos e não precisas de instalar nada no teu computador.

**Como as peças encaixam:**

```
  Browser ──► Netlify (site + servidor da app) ──► Supabase (base de dados PostgreSQL)
                    ▲
               GitHub (código)  ── cada alteração no GitHub republica o site automaticamente
```

Vais precisar de 3 contas gratuitas: **GitHub** (já tens), **Supabase** e **Netlify**.
Para as duas últimas podes usar "Continue with GitHub" e evitar novas passwords.

---

## Passo 1: Repositório no GitHub

1. Entra em <https://github.com/new>.
2. **Repository name:** `gestao-contratos`
3. Escolhe **Private**. Os contratos são da empresa e o código não deve ser público.
4. **Não** marques "Add a README", ".gitignore" nem "license". O repositório tem de ficar vazio.
5. Clica **Create repository** e envia-me o link (ex.: `https://github.com/o-teu-nome/gestao-contratos`).

Eu envio o código para lá. Avança para o passo 2 entretanto.

---

## Passo 2: Base de dados na Supabase

1. Entra em <https://supabase.com/dashboard> → **Continue with GitHub**.
2. Se pedir, cria uma organização (nome da empresa, plano **Free**).
3. Clica **New project**:
   - **Name:** `gestao-contratos`
   - **Database Password:** clica **Generate a password** e **guarda-a** (num gestor de passwords).
     Vais precisar dela já a seguir e não a consegues ver outra vez.
     > ⚠️ Se escreveres a tua, usa só letras e números. Símbolos como `@ # / ? %` estragam o endereço de ligação.
   - **Region:** `Central EU (Frankfurt)`. Não pode ser mudada depois (ver "Região" em [Coisas a saber](#coisas-a-saber)).
   - Clica **Create new project** e espera 1–2 minutos.
4. No topo da página do projeto, clica **Connect**.
5. Copia dois endereços de ligação. O separador **ORMs → Prisma** mostra-os já prontos. Se não aparecer,
   usa o separador **Connection String** e escolhe o "Method" indicado:

   | Variável | Onde encontrar | Como fica |
   |---|---|---|
   | `DATABASE_URL` | **Transaction pooler** (porta **6543**) | `postgresql://postgres.abcd:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | **Session pooler** (porta **5432**) | `postgresql://postgres.abcd:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres` |

   - Substitui `[YOUR-PASSWORD]` pela password do passo 3, sem os parênteses retos.
   - No `DATABASE_URL`, acrescenta no fim **`?pgbouncer=true&connection_limit=1`**. É obrigatório.
   - Usa os endereços **pooler**, não o "Direct connection" (`db.xxxx.supabase.co`). Esse só funciona em IPv6
     no plano gratuito e a Netlify pode não lhe conseguir chegar.

Guarda estes dois endereços num sítio seguro. Dão acesso total à base de dados.

---

## Passo 3: Site na Netlify

Faz este passo depois de eu te confirmar que o código já está no GitHub.

1. Entra em <https://app.netlify.com> → **Sign up / Log in with GitHub**.
2. **Add new project** → **Import an existing project** → **GitHub**.
   Autoriza a Netlify a ver o repositório `gestao-contratos` (podes dar acesso só a esse) e escolhe-o.
3. Na página de configuração:
   - **Branch to deploy:** `main`
   - **Build command / Publish directory:** deixa como está. A Netlify lê o ficheiro `netlify.toml`.
4. Clica **Add environment variables** (ou "Environment variables" → **New variable**) e cria estas 4:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | o endereço da porta **6543** (passo 2) |
   | `DIRECT_URL` | o endereço da porta **5432** (passo 2) |
   | `ADMIN_EMAIL` | o teu email, que vai ser o administrador |
   | `ADMIN_PASSWORD` | uma password forte e temporária (mín. 8 caracteres) |

   Se aparecer a opção **"Contains secret values"**, marca-a nas variáveis com passwords.
5. Clica **Deploy**. A primeira publicação demora 2–5 minutos.
   No registo (**Deploys → clica no deploy**) deves ver:
   - `All migrations have been successfully applied` (tabelas criadas)
   - `Administrador criado: ...`
   - `Site is live ✨`
6. Escolhe o endereço: **Project configuration → General → Change project name** → ex.: `contratos-empresa`.
   O site fica em `https://contratos-empresa.netlify.app`.

---

## Passo 4: Primeiro acesso

1. Abre o endereço e entra com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD`.
2. Vai a **A minha conta** (clica no teu nome, no canto superior direito) e **muda a password**.
3. Em **Utilizadores**, cria as contas da equipa, com perfil e equipas.
   Dá a cada pessoa uma password temporária e pede-lhe para a mudar em "A minha conta".
4. Opcional, mas recomendado: na Netlify, apaga a variável `ADMIN_PASSWORD`.
   Só é usada para criar o primeiro administrador, quando ainda não existe nenhum.

Pronto, a plataforma está online. 🎉

---

## Como ficam as atualizações

Quando fizermos melhorias, eu envio o código para o GitHub e a Netlify **republica sozinha** em 2–5 minutos.
As alterações à base de dados (migrações) são aplicadas automaticamente em cada publicação, sem apagar dados.

---

## Coisas a saber

**Região e velocidade.** No plano gratuito da Netlify, o servidor da app corre nos EUA (Ohio) e não dá para mudar.
A base de dados fica em Frankfurt, por isso cada página atravessa o Atlântico algumas vezes.
Conta com páginas a abrir em cerca de 0,5–1 segundo, o que chega para uma ferramenta interna.
- Para ficar mais rápida, há duas saídas:
  - **Netlify Pro:** permite pôr o servidor em Frankfurt.
  - **Supabase em `East US (Ohio)`:** junta a base de dados ao servidor, mas os dados ficam guardados nos EUA.
- Os dados ficam *guardados* na UE (Frankfurt), mas passam pelo servidor da Netlify nos EUA quando alguém usa a app.
  Se a empresa tiver regras de proteção de dados, confirma com quem trata disso.

**A Supabase gratuita pausa após 7 dias sem uso.** Se ninguém usar a plataforma durante uma semana (ex.: férias),
a base de dados adormece e o site dá erro. Para a acordar: dashboard da Supabase → projeto → **Restore project**.
Para dados reais de contratos, considera o plano **Pro** da Supabase, que não pausa e tem cópias de segurança diárias.

**Créditos da Netlify.** O plano gratuito funciona com créditos (300).
Cada publicação gasta cerca de 15, além do uso normal do site. Por isso convém juntar várias melhorias
numa só publicação. O consumo está em **Netlify → Team → Usage & billing**.

**Segurança já incluída:**
- HTTPS automático.
- Passwords guardadas cifradas (bcrypt).
- Sessões expiram em 7 dias.
- Bloqueio de 15 minutos após 5 tentativas de login falhadas.
- Regras de acesso aos contratos verificadas no servidor.

---

## Se algo correr mal

| Sintoma (no registo do deploy da Netlify) | Causa provável |
|---|---|
| `P1001: Can't reach database server` | `DIRECT_URL` errado, password errada, ou projeto Supabase pausado |
| `P1000: Authentication failed` | Password errada no endereço (ou com símbolos, ver passo 2) |
| `Defina ADMIN_EMAIL e ADMIN_PASSWORD` | Faltam essas variáveis na Netlify |
| Site abre mas dá erro ao entrar, com `prepared statement` no registo de funções | Falta `?pgbouncer=true` no `DATABASE_URL` |
| Mudei uma variável e nada mudou | Variáveis só contam no próximo deploy: **Deploys → Trigger deploy → Deploy site** |

Os erros da app (depois de publicada) estão em **Netlify → Logs → Functions**.
Se ficares preso, copia a mensagem de erro e envia-ma.
