/* ==========================================================
   FIO & PONTO — CONFIGURAÇÃO DO SUPABASE

   Troque os dois valores abaixo pelos dados do SEU projeto:
   Supabase → Project Settings → API
     - "Project URL"        → SUPABASE_URL
     - "anon / public key"  → SUPABASE_KEY

   Nunca coloque aqui a "service_role key" — essa é secreta e
   nunca deve aparecer em código que roda no navegador.
========================================================== */

const SUPABASE_URL = "https://phazhfphvmtddolmfqbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_9gQ7IdV9fl6lqoCPGGFA5Q_TMm3_ClA";

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
