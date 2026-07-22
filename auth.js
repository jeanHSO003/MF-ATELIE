/* ==========================================================
   FIO & PONTO — AUTENTICAÇÃO (auth.js)

   Regras do sistema de permissão:
   - Qualquer pessoa pode se cadastrar em cadastro.html → vira "cliente".
   - A crocheteira NÃO se cadastra por um formulário especial: o
     e-mail dela é pré-autorizado direto no Supabase (tabela
     emails_administradores — veja supabase/schema.sql). Quando uma
     conta é criada com esse e-mail (por ela mesma, no cadastro.html
     normal, ou convidada pelo painel do Supabase), um gatilho no
     banco já cria o perfil com papel = 'crocheteira' automaticamente.
   - Este arquivo só LÊ o papel do usuário para decidir para onde
     mandar a pessoa depois do login — quem decide o papel de
     verdade é o banco (auth.js nunca define nem confia em um papel
     vindo do próprio navegador).
========================================================== */

/* ---------- cadastro (sempre cria conta como cliente comum) ---------- */

async function cadastrarUsuario(nome, email, senha){
    const { data, error } = await _supabase.auth.signUp({
        email,
        password: senha,
        options: {
            data: { nome } // vai para auth.users.raw_user_meta_data, o gatilho usa isso
        }
    });

    if(error) throw error;
    return data;
}

/* ---------- login ---------- */

async function fazerLogin(email, senha){
    const { data, error } = await _supabase.auth.signInWithPassword({
        email,
        password: senha
    });

    if(error) throw error;
    return data;
}

/* ---------- logout ---------- */

async function fazerLogout(){
    await _supabase.auth.signOut();
    window.location.href = "index.html";
}

/* ---------- sessão e perfil atuais ---------- */

async function obterSessaoAtual(){
    const { data } = await _supabase.auth.getSession();
    return data.session;
}

async function obterPerfilAtual(){
    const sessao = await obterSessaoAtual();
    if(!sessao) return null;

    const { data, error } = await _supabase
        .from("perfis")
        .select("*")
        .eq("id", sessao.user.id)
        .single();

    if(error){
        console.error("Erro ao buscar perfil:", error);
        return null;
    }

    return data;
}

/* ---------- envia para a página certa de acordo com o papel ---------- */

function irParaAreaDoPapel(perfil){
    if(perfil && perfil.papel === "crocheteira"){
        window.location.href = "painel.html";
    }else{
        window.location.href = "index.html";
    }
}

/* ---------- protege o painel.html: só entra quem é crocheteira ---------- */

async function protegerPainel(){
    const perfil = await obterPerfilAtual();

    if(!perfil){
        window.location.href = "login.html";
        return null;
    }

    if(perfil.papel !== "crocheteira"){
        alert("Esta área é exclusiva da crocheteira.");
        window.location.href = "index.html";
        return null;
    }

    return perfil;
}
