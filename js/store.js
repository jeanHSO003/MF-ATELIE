/* ==========================================================
   MF ATELIÊ — CAMADA DE DADOS (store.js)

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
            preco: parsePreco(produto.preco),
            desconto: Number(produto.desconto) || 0,
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
            preco: parsePreco(dadosNovos.preco),
            desconto: Number(dadosNovos.desconto) || 0,
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

/* ---------- PREÇO E DESCONTO ----------
   O banco guarda preço como número. Aqui a gente converte pra
   exibir bonitinho ("89,90") e pra ler o que a crocheteira digita
   no formulário (aceita "89,90" ou "89.90"). */

function formatarPreco(valor){
    const numero = Number(valor) || 0;
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePreco(texto){
    if(typeof texto === "number") return texto;
    const limpo = (texto || "").toString().trim().replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
}

function calcularPrecoFinal(preco, desconto){
    const p = Number(preco) || 0;
    const d = Number(desconto) || 0;
    return Math.round(p * (1 - d / 100) * 100) / 100;
}

/* ---------- AVALIAÇÕES DO SITE (avaliação geral do ateliê) ---------- */

async function obterAvaliacoes(limite, notaMinima){
    let consulta = _supabase
        .from("avaliacoes")
        .select("*")
        .order("criado_em", { ascending: false });

    if(notaMinima) consulta = consulta.gte("nota", notaMinima);
    if(limite) consulta = consulta.limit(limite);

    const { data, error } = await consulta;

    if(error){
        console.error("Erro ao buscar avaliações:", error);
        return [];
    }

    return data;
}

async function obterMediaAvaliacoes(){
    // Importante: a média SEMPRE considera todas as notas (inclusive 1 e 2
    // estrelas), mesmo que elas não apareçam na listinha da home.
    const { data, error } = await _supabase.from("avaliacoes").select("nota");

    if(error || !data || !data.length){
        return { media: 0, total: 0 };
    }

    const total = data.length;
    const soma = data.reduce((acc, item) => acc + item.nota, 0);
    return { media: soma / total, total };
}

async function adicionarAvaliacao({ nome, nota, comentario }){
    const sessao = await obterSessaoAtual();
    if(!sessao){
        throw new Error("Você precisa entrar na sua conta para avaliar.");
    }

    const { data, error } = await _supabase
        .from("avaliacoes")
        .insert([{
            cliente_id: sessao.user.id,
            nome,
            nota,
            comentario: comentario ? comentario.trim() : null
        }])
        .select()
        .single();

    if(error) throw error;
    return data;
}

async function excluirAvaliacao(id){
    const { error } = await _supabase.from("avaliacoes").delete().eq("id", id);
    if(error) throw error;
    return true;
}

/* ---------- AVALIAÇÕES DE PEÇA (separadas da avaliação do site) ----------
   Só aparecem quando o cliente clica na peça específica. */

async function obterAvaliacoesProduto(produtoId, limite){
    let consulta = _supabase
        .from("avaliacoes_produtos")
        .select("*")
        .eq("produto_id", produtoId)
        .order("criado_em", { ascending: false });

    if(limite) consulta = consulta.limit(limite);

    const { data, error } = await consulta;

    if(error){
        console.error("Erro ao buscar avaliações da peça:", error);
        return [];
    }

    return data;
}

async function obterMediaAvaliacoesProduto(produtoId){
    const { data, error } = await _supabase
        .from("avaliacoes_produtos")
        .select("nota")
        .eq("produto_id", produtoId);

    if(error || !data || !data.length){
        return { media: 0, total: 0 };
    }

    const total = data.length;
    const soma = data.reduce((acc, item) => acc + item.nota, 0);
    return { media: soma / total, total };
}

async function adicionarAvaliacaoProduto({ produtoId, nome, nota, comentario }){
    const sessao = await obterSessaoAtual();
    if(!sessao){
        throw new Error("Você precisa entrar na sua conta para avaliar.");
    }

    const { data, error } = await _supabase
        .from("avaliacoes_produtos")
        .insert([{
            produto_id: produtoId,
            cliente_id: sessao.user.id,
            nome,
            nota,
            comentario: comentario ? comentario.trim() : null
        }])
        .select()
        .single();

    if(error) throw error;
    return data;
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
