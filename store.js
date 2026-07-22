/* ==========================================================
   FIO & PONTO — CAMADA DE DADOS (store.js)

   Antes esses dados ficavam no localStorage do navegador. Agora
   vêm do Supabase: qualquer visitante consegue LER (a página
   pública mostra sempre a mesma coisa em qualquer aparelho), mas
   só quem tem papel = 'crocheteira' consegue GRAVAR — isso é
   garantido pelas policies de RLS (supabase/dados.sql), não só
   pelo código aqui na tela.

   Todas as funções agora são assíncronas (retornam Promise),
   então quem usa precisa de "await".
========================================================== */

/* ---------- LOJA (dados gerais da crocheteira) ---------- */

async function obterLoja(){
    const { data, error } = await _supabase
        .from("loja")
        .select("*")
        .eq("id", 1)
        .single();

    if(error){
        console.error("Erro ao buscar dados da loja:", error);
        return null;
    }

    return data;
}

async function salvarLoja(dados){
    const { data, error } = await _supabase
        .from("loja")
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq("id", 1)
        .select()
        .single();

    if(error) throw error;

    if(!data){
        // update rodou sem erro, mas nenhuma linha voltou: o RLS bloqueou
        // silenciosamente. Normalmente é porque o usuário logado ainda
        // não está com papel = 'crocheteira' na tabela "perfis".
        throw new Error("Sem permissão para salvar (verifique se seu usuário está com papel = 'crocheteira' na tabela perfis).");
    }

    return true;
}

/* ---------- PRODUTOS (peças em crochê) ---------- */

async function obterProdutos(){
    const { data, error } = await _supabase
        .from("produtos")
        .select("*")
        .order("criado_em", { ascending: false });

    if(error){
        console.error("Erro ao buscar produtos:", error);
        return [];
    }

    return data;
}

async function adicionarProduto(produto){
    const sessao = await obterSessaoAtual();

    const { data, error } = await _supabase
        .from("produtos")
        .insert([{
            nome: produto.nome,
            descricao: produto.descricao,
            preco: produto.preco,
            imagem: produto.imagem || "",
            criado_por: sessao ? sessao.user.id : null
        }])
        .select()
        .single();

    if(error) throw error;
    return data;
}

async function atualizarProduto(id, dadosNovos){
    const { data, error } = await _supabase
        .from("produtos")
        .update({
            nome: dadosNovos.nome,
            descricao: dadosNovos.descricao,
            preco: dadosNovos.preco,
            imagem: dadosNovos.imagem
        })
        .eq("id", id)
        .select()
        .single();

    if(error) throw error;

    if(!data){
        throw new Error("Sem permissão para editar esta peça (verifique se seu usuário está com papel = 'crocheteira').");
    }

    return true;
}

async function excluirProduto(id){
    const { error } = await _supabase
        .from("produtos")
        .delete()
        .eq("id", id);

    if(error) throw error;
    return true;
}

/* ---------- IMAGENS (Supabase Storage) ----------
   Faz upload do arquivo escolhido no formulário e devolve a URL
   pública. Usado tanto pra foto de peça quanto pro logo/foto da loja
   (cada uma numa "pasta" diferente dentro do mesmo bucket). */

async function enviarImagem(arquivo, pasta){
    const extensao = arquivo.name.split(".").pop();
    const caminho = `${pasta}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

    const { error } = await _supabase
        .storage
        .from("produtos-imagens")
        .upload(caminho, arquivo, { upsert: false });

    if(error) throw error;

    const { data } = _supabase
        .storage
        .from("produtos-imagens")
        .getPublicUrl(caminho);

    return data.publicUrl;
}

async function enviarImagemProduto(arquivo){
    return enviarImagem(arquivo, "pecas");
}

/* ---------- utilitário: link do WhatsApp já com a mensagem pronta ----------
   Aceita o número em qualquer formato (com espaço, traço, parênteses,
   com ou sem "+55") e sempre devolve um link wa.me válido, pronto para
   virar um botão que redireciona direto para a conversa no WhatsApp. */

function linkWhatsApp(numero, mensagem){
    let numeroLimpo = (numero || "").replace(/\D/g, "");

    // Número brasileiro sem código do país (só DDD + telefone, 10 ou 11 dígitos)
    // → adiciona o "55" na frente pra o link do WhatsApp funcionar de verdade.
    if(numeroLimpo.length === 10 || numeroLimpo.length === 11){
        numeroLimpo = "55" + numeroLimpo;
    }

    return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}
