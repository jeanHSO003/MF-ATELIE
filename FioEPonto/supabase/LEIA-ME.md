# Como ligar o Fio & Ponto ao Supabase

## 1. Criar o projeto
Em https://supabase.com, crie um projeto novo (ou use um que já tenha).

## 2. Rodar o SQL
No painel do Supabase: **SQL Editor → New query**, cole todo o conteúdo do
arquivo **`completo.sql`** desta pasta e clique em **Run**. Ele já tem tudo:
tabela de perfis, permissões, loja, produtos e o bucket de imagens — pode
rodar mais de uma vez sem medo, é seguro (idempotente).

Antes de rodar, edite duas linhas do arquivo com o **seu e-mail de verdade**
(o mesmo que você vai usar pra logar como crocheteira):
- seção 2: `insert into public.emails_administradores ...`
- seção 4: `update public.perfis set papel = 'crocheteira' where email = ...`

A seção 4 existe justamente para o caso de **os dados não estarem salvando**:
se você já tinha criado sua conta antes de rodar esse SQL, seu perfil ficou
como `'cliente'` e as regras de segurança bloqueiam a escrita. Essa linha
corrige isso na hora.

(Os arquivos `schema.sql` e `dados.sql` continuam aqui só de referência —
o `completo.sql` já reúne os dois.)

**Já tinha rodado o `completo.sql` antes e agora não acha a coluna do logo?**
Rode só o `adicionar-logo.sql` — é rapidinho e não apaga nada.

## 3. Pegar as chaves da API
**Project Settings → API**, copie:
- **Project URL**
- **anon / public key** (não é a `service_role`, essa nunca deve ser usada no site)

Cole essas duas informações no arquivo `js/supabase.js`, nas variáveis
`SUPABASE_URL` e `SUPABASE_KEY`.

## 4. Confirmação de e-mail (escolha uma opção)
Em **Authentication → Providers → Email**:
- **Mais simples pra testar agora:** desative "Confirm email" — a conta já
  entra logada na hora do cadastro.
- **Mais seguro pra quando publicar de verdade:** deixe ativado — a pessoa
  recebe um e-mail de confirmação antes de conseguir entrar (o site já trata
  esse caso e avisa "confira seu e-mail").

## 5. Criar sua conta de crocheteira
Abra `cadastro.html` no navegador e cadastre-se normalmente com o e-mail que
você colocou no passo 2. Como esse e-mail está na lista de administradores,
o gatilho do banco já cria seu perfil com `papel = 'crocheteira'`
automaticamente — ao entrar, você vai direto para `painel.html`.

Qualquer outra pessoa que se cadastrar (com outro e-mail) vira `cliente` e
entra direto no site normal (`index.html`).

## 6. Testar
- Cadastre um e-mail comum → deve cair em `index.html` ao logar.
- Cadastre/logue com o e-mail da crocheteira → deve cair em `painel.html`.
- Tente abrir `painel.html` deslogado ou logado como cliente → deve ser
  barrado e mandado para `login.html` ou `index.html`.

## O que já está "na nuvem" agora
Login, cadastro, dados da loja e peças (com fotos) agora vivem no Supabase —
não sobra mais nada importante salvo só no navegador. Qualquer pessoa que
abrir o site em qualquer aparelho vê as mesmas peças, e só quem entra com o
e-mail de crocheteira consegue editar (isso é garantido pelas políticas de
RLS dos arquivos `schema.sql` e `dados.sql`, não só pela tela).

Se um dia quiser controlar pedidos recebidos (não só o catálogo), dá pra
criar uma tabela `pedidos` do mesmo jeito — me avisa que eu preparo.
