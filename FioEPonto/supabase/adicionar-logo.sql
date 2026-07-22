-- =================================================================
-- FIO & PONTO — MIGRAÇÃO: adicionar campo de logo na loja
--
-- Se você JÁ tinha rodado o completo.sql antes (numa versão anterior,
-- sem o campo de logo), rode só este trechinho aqui — não precisa
-- rodar o completo.sql inteiro de novo. Ele não apaga nada que já
-- estava salvo.
-- =================================================================

alter table public.loja add column if not exists logo text not null default '';
