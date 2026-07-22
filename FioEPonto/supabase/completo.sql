-- =================================================================
-- FIO & PONTO — SQL COMPLETO (rode este arquivo inteiro de uma vez)
-- Supabase → SQL Editor → New query → cole tudo → Run
--
-- Pode rodar mais de uma vez sem medo: todos os comandos são
-- "idempotentes" (se algo já existe, ele ajusta em vez de duplicar
-- ou dar erro).
-- =================================================================

create extension if not exists pgcrypto;


-- -----------------------------------------------------------------
-- 1) TABELA "perfis" — todo usuário logado tem uma linha aqui,
--    com o papel dele: 'cliente' ou 'crocheteira'.
-- -----------------------------------------------------------------

create table if not exists public.perfis (
    id         uuid primary key references auth.users(id) on delete cascade,
    nome       text,
    email      text not null,
    papel      text not null default 'cliente' check (papel in ('cliente','crocheteira')),
    criado_em  timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "usuario_ve_proprio_perfil" on public.perfis;
create policy "usuario_ve_proprio_perfil"
    on public.perfis for select
    using (auth.uid() = id);

drop policy if exists "usuario_atualiza_proprio_perfil" on public.perfis;
create policy "usuario_atualiza_proprio_perfil"
    on public.perfis for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;


-- -----------------------------------------------------------------
-- 2) TABELA "emails_administradores" — e-mails que devem virar
--    'crocheteira' automaticamente. Ninguém pelo site consegue ler
--    essa tabela (RLS ligado, zero policies = acesso negado).
-- -----------------------------------------------------------------

create table if not exists public.emails_administradores (
    email text primary key
);

alter table public.emails_administradores enable row level security;

-- 👉 TROQUE pelo e-mail que você usa pra logar como crocheteira:
insert into public.emails_administradores (email)
values ('seuemail@exemplo.com')
on conflict (email) do nothing;


-- -----------------------------------------------------------------
-- 3) GATILHO — ao criar um usuário novo, já cria o perfil com o
--    papel certo automaticamente.
-- -----------------------------------------------------------------

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    papel_do_usuario text := 'cliente';
begin
    if exists (select 1 from public.emails_administradores where email = new.email) then
        papel_do_usuario := 'crocheteira';
    end if;

    insert into public.perfis (id, nome, email, papel)
    values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email, papel_do_usuario)
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
    after insert on auth.users
    for each row execute procedure public.criar_perfil_novo_usuario();


-- -----------------------------------------------------------------
-- 4) ⚠️ PASSO MAIS IMPORTANTE SE OS DADOS NÃO ESTÃO SALVANDO ⚠️
--    Se você já tinha criado sua conta ANTES de rodar este script
--    (ou antes de colocar seu e-mail no passo 2), seu perfil ficou
--    registrado como 'cliente' — e é exatamente por isso que salvar
--    a loja ou adicionar peça não funciona: as regras de segurança
--    (RLS) só liberam escrita para quem é 'crocheteira'.
--
--    A linha abaixo corrige isso na hora. Troque o e-mail e rode:
-- -----------------------------------------------------------------

update public.perfis
set papel = 'crocheteira'
where email = 'seuemail@exemplo.com';

-- dica: rode "select email, papel from public.perfis;" pra
-- conferir se o seu usuário realmente está com papel = 'crocheteira'.


-- -----------------------------------------------------------------
-- 5) TABELA "loja" — uma linha só (id fixo = 1) com os dados gerais.
--    Leitura liberada pra todo mundo, edição só pra crocheteira.
-- -----------------------------------------------------------------

create table if not exists public.loja (
    id            int primary key default 1 check (id = 1),
    nome          text not null default 'Fio & Ponto',
    frase         text not null default 'Peças de crochê feitas à mão, com carinho em cada ponto.',
    bio           text not null default 'Oi, eu sou a Marcela! Há 6 anos transformo novelos de linha em peças únicas.',
    whatsapp      text not null default '5511999999999',
    instagram     text not null default 'fioeponto.croche',
    cidade        text not null default 'Santa Bárbara d''Oeste, SP',
    horario       text not null default 'Seg. a sáb., 9h às 18h',
    foto_perfil   text not null default '',
    logo          text not null default '',
    atualizado_em timestamptz not null default now()
);

insert into public.loja (id) values (1) on conflict (id) do nothing;

-- se a tabela "loja" já existia de uma versão anterior (sem a coluna do logo),
-- este comando adiciona ela sem apagar nada que já estava salvo:
alter table public.loja add column if not exists logo text not null default '';

alter table public.loja enable row level security;

drop policy if exists "loja_leitura_publica" on public.loja;
create policy "loja_leitura_publica"
    on public.loja for select
    using (true);

drop policy if exists "loja_atualiza_so_crocheteira" on public.loja;
create policy "loja_atualiza_so_crocheteira"
    on public.loja for update
    using (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'))
    with check (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'));


-- -----------------------------------------------------------------
-- 6) TABELA "produtos" — leitura liberada, escrita só crocheteira.
-- -----------------------------------------------------------------

create table if not exists public.produtos (
    id          uuid primary key default gen_random_uuid(),
    nome        text not null,
    descricao   text not null default '',
    preco       text not null default '',
    imagem      text not null default '',
    criado_por  uuid references public.perfis(id),
    criado_em   timestamptz not null default now()
);

alter table public.produtos enable row level security;

drop policy if exists "produtos_leitura_publica" on public.produtos;
create policy "produtos_leitura_publica"
    on public.produtos for select
    using (true);

drop policy if exists "produtos_insere_so_crocheteira" on public.produtos;
create policy "produtos_insere_so_crocheteira"
    on public.produtos for insert
    with check (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'));

drop policy if exists "produtos_atualiza_so_crocheteira" on public.produtos;
create policy "produtos_atualiza_so_crocheteira"
    on public.produtos for update
    using (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'))
    with check (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'));

drop policy if exists "produtos_exclui_so_crocheteira" on public.produtos;
create policy "produtos_exclui_so_crocheteira"
    on public.produtos for delete
    using (exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira'));

insert into public.produtos (nome, descricao, preco)
select * from (values
    ('Amigurumi personalizado', 'Bichinho de crochê feito na cor e no tamanho que você escolher. Ótimo presente!', '89,90'),
    ('Bolsa de crochê', 'Bolsa artesanal em algodão, forrada por dentro, alça reforçada.', '149,90'),
    ('Tapete redondo', 'Tapete macio para quarto ou sala, disponível em vários tamanhos e cores.', '119,90'),
    ('Manta para bebê', 'Manta felpuda e delicada, perfeita para o enxoval. Pode bordar o nome.', '159,90')
) as exemplo(nome, descricao, preco)
where not exists (select 1 from public.produtos);


-- -----------------------------------------------------------------
-- 7) BUCKET DE IMAGENS "produtos-imagens" — é aqui que as fotos das
--    peças ficam guardadas. Bucket público pra leitura (qualquer um
--    vê a foto), mas só a crocheteira pode enviar/trocar/apagar.
-- -----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('produtos-imagens', 'produtos-imagens', true)
on conflict (id) do update set public = true;

drop policy if exists "produtos_imagens_leitura_publica" on storage.objects;
create policy "produtos_imagens_leitura_publica"
    on storage.objects for select
    using (bucket_id = 'produtos-imagens');

drop policy if exists "produtos_imagens_insere_so_crocheteira" on storage.objects;
create policy "produtos_imagens_insere_so_crocheteira"
    on storage.objects for insert
    with check (
        bucket_id = 'produtos-imagens'
        and exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );

drop policy if exists "produtos_imagens_atualiza_so_crocheteira" on storage.objects;
create policy "produtos_imagens_atualiza_so_crocheteira"
    on storage.objects for update
    using (
        bucket_id = 'produtos-imagens'
        and exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );

drop policy if exists "produtos_imagens_exclui_so_crocheteira" on storage.objects;
create policy "produtos_imagens_exclui_so_crocheteira"
    on storage.objects for delete
    using (
        bucket_id = 'produtos-imagens'
        and exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );


-- -----------------------------------------------------------------
-- 8) Conferência rápida — rode isto separado, depois, pra ver se
--    está tudo certo:
-- -----------------------------------------------------------------

-- select email, papel from public.perfis;
-- select * from public.loja;
-- select nome, preco, imagem from public.produtos;
-- select id, name, public from storage.buckets where id = 'produtos-imagens';
