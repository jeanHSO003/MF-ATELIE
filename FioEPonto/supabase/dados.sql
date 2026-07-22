-- =================================================================
-- FIO & PONTO — DADOS DO SITE (loja + produtos + fotos)
-- Cole no SQL Editor do Supabase DEPOIS de já ter rodado o schema.sql
-- (esse arquivo precisa da tabela "perfis" que o schema.sql cria)
-- =================================================================

create extension if not exists pgcrypto;


-- -----------------------------------------------------------------
-- 1) TABELA "loja"
--    Só existe UMA linha (id fixo = 1) com os dados gerais da loja.
--    Qualquer visitante pode LER. Só quem tem papel = 'crocheteira'
--    pode ATUALIZAR.
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
    atualizado_em timestamptz not null default now()
);

-- garante que a linha única já existe (roda uma vez só, por causa do "on conflict")
insert into public.loja (id) values (1) on conflict (id) do nothing;

alter table public.loja enable row level security;

drop policy if exists "loja_leitura_publica" on public.loja;
create policy "loja_leitura_publica"
    on public.loja for select
    using (true);

drop policy if exists "loja_atualiza_so_crocheteira" on public.loja;
create policy "loja_atualiza_so_crocheteira"
    on public.loja for update
    using (
        exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );


-- -----------------------------------------------------------------
-- 2) TABELA "produtos"
--    Qualquer visitante pode LER (SELECT). Só quem tem papel =
--    'crocheteira' pode INSERIR, ATUALIZAR ou EXCLUIR peças.
-- -----------------------------------------------------------------

create table if not exists public.produtos (
    id          uuid primary key default gen_random_uuid(),
    nome        text not null,
    descricao   text not null default '',
    preco       text not null default '',
    imagem      text not null default '',   -- URL pública da foto (bucket produtos-imagens)
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
    with check (
        exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );

drop policy if exists "produtos_atualiza_so_crocheteira" on public.produtos;
create policy "produtos_atualiza_so_crocheteira"
    on public.produtos for update
    using (
        exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );

drop policy if exists "produtos_exclui_so_crocheteira" on public.produtos;
create policy "produtos_exclui_so_crocheteira"
    on public.produtos for delete
    using (
        exists (select 1 from public.perfis where id = auth.uid() and papel = 'crocheteira')
    );

-- peças de exemplo (só a primeira vez — se a tabela já tiver alguma linha, não insere de novo)
insert into public.produtos (nome, descricao, preco)
select * from (values
    ('Amigurumi personalizado', 'Bichinho de crochê feito na cor e no tamanho que você escolher. Ótimo presente!', '89,90'),
    ('Bolsa de crochê', 'Bolsa artesanal em algodão, forrada por dentro, alça reforçada.', '149,90'),
    ('Tapete redondo', 'Tapete macio para quarto ou sala, disponível em vários tamanhos e cores.', '119,90'),
    ('Manta para bebê', 'Manta felpuda e delicada, perfeita para o enxoval. Pode bordar o nome.', '159,90')
) as exemplo(nome, descricao, preco)
where not exists (select 1 from public.produtos);


-- -----------------------------------------------------------------
-- 3) BUCKET DE IMAGENS "produtos-imagens"
--    Bucket público (qualquer um vê as fotos), mas só a crocheteira
--    pode enviar, substituir ou apagar arquivos nele.
-- -----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('produtos-imagens', 'produtos-imagens', true)
on conflict (id) do nothing;

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
