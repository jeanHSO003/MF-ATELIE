/* ==========================================================
   MF ATELIÊ — SITE PÚBLICO (visão do cliente)
========================================================== */

let _loja = null;
let _produtos = [];
let _avaliacoesResumo = { media: 0, total: 0 };
let _avaliacoesUltimas = [];
let _notaSelecionada = 0;

function estrelasHtml(nota){
    const cheias = Math.round(nota);
    return `<span class="estrelas-cor">${"★".repeat(cheias)}${"☆".repeat(5 - cheias)}</span>`;
}

function tempoRelativo(dataIso){
    const diffMs = Date.now() - new Date(dataIso).getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if(dias <= 0) return "hoje";
    if(dias === 1) return "ontem";
    if(dias < 30) return `há ${dias} dias`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

function cardAvaliacao(av){
    return `
    <div class="depo-card">
        <div class="estrelas">${estrelasHtml(av.nota)}</div>
        <p>"${av.comentario || "Sem comentário — só a nota mesmo."}"</p>
        <div class="depo-nome">${av.nome} · <span style="font-weight:400;">${tempoRelativo(av.criado_em)}</span></div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", async () => {

    const galeria = document.getElementById("galeria-produtos");
    if(galeria) galeria.innerHTML = `<div class="galeria-vazio">Carregando peças...</div>`;

    const [loja, produtos, resumo, ultimas] = await Promise.all([
        obterLoja(),
        obterProdutos(),
        obterMediaAvaliacoes(),
        obterAvaliacoes(3, 3) // só 3 estrelas ou mais aparecem na home (a média acima já conta com todas)
    ]);

    _loja = loja;
    _produtos = produtos;
    _avaliacoesResumo = resumo;
    _avaliacoesUltimas = ultimas;

    if(!loja){
        if(galeria) galeria.innerHTML = `<div class="galeria-vazio">Não foi possível carregar a loja agora. Tente novamente em instantes.</div>`;
        return;
    }

    /* ---------- textos e links que dependem da loja ---------- */

    document.querySelectorAll("[data-loja-nome]").forEach(el => el.textContent = loja.nome);
    document.querySelectorAll("[data-loja-frase]").forEach(el => el.textContent = loja.frase);
    document.querySelectorAll("[data-loja-bio]").forEach(el => el.textContent = loja.bio);
    document.querySelectorAll("[data-loja-cidade]").forEach(el => el.textContent = loja.cidade);
    document.querySelectorAll("[data-loja-horario]").forEach(el => el.textContent = loja.horario);
    document.querySelectorAll("[data-loja-instagram]").forEach(el => {
        el.textContent = "@" + loja.instagram;
        el.href = `https://instagram.com/${loja.instagram}`;
    });

    const fotoPerfilEl = document.getElementById("fotoPerfil");
    if(fotoPerfilEl){
        fotoPerfilEl.innerHTML = loja.foto_perfil
            ? `<img src="${loja.foto_perfil}" alt="Foto de ${loja.nome}">`
            : `<i class="fa-solid fa-heart"></i>`;
    }

    const logoLojaEl = document.getElementById("logoLoja");
    if(logoLojaEl && loja.logo){
        logoLojaEl.innerHTML = `<img src="${loja.logo}" alt="Logo ${loja.nome}">`;
    }

    const mensagemGeral = `Olá! Vi o site da ${loja.nome} e queria fazer uma encomenda 🧶`;
    document.querySelectorAll("[data-whats-geral]").forEach(el => {
        el.href = linkWhatsApp(loja.whatsapp, mensagemGeral);
    });

    /* ---------- resumo de avaliações (hero + seção de avaliações) ---------- */

    const resumoHeroEl = document.getElementById("resumoAvaliacoesHero");
    const resumoSecaoEl = document.getElementById("resumoAvaliacoes");

    if(resumo.total > 0){
        if(resumoHeroEl){
            resumoHeroEl.innerHTML = `${estrelasHtml(resumo.media)} ${resumo.media.toFixed(1)} <small>(${resumo.total} avaliação${resumo.total > 1 ? "ões" : ""})</small>`;
        }
        if(resumoSecaoEl){
            resumoSecaoEl.innerHTML = `${estrelasHtml(resumo.media)} ${resumo.media.toFixed(1)} <small>com base em ${resumo.total} avaliação${resumo.total > 1 ? "ões" : ""}</small>`;
        }
    }else{
        if(resumoHeroEl) resumoHeroEl.innerHTML = `<small>Seja o primeiro a avaliar! 🧶</small>`;
        if(resumoSecaoEl) resumoSecaoEl.innerHTML = `<small>Ainda não há avaliações — seja a primeira pessoa a avaliar!</small>`;
    }

    /* ---------- lista das últimas avaliações ---------- */

    const listaAvaliacoesEl = document.getElementById("listaAvaliacoes");
    if(listaAvaliacoesEl){
        listaAvaliacoesEl.innerHTML = ultimas.length
            ? ultimas.map(cardAvaliacao).join("")
            : `<div class="galeria-vazio">Ainda não há avaliações por aqui.</div>`;
    }

    /* ---------- galeria de produtos ---------- */

    if(galeria){
        if(!produtos.length){
            galeria.innerHTML = `<div class="galeria-vazio">Nenhuma peça cadastrada ainda. Volte em breve! 🧶</div>`;
        }else{
            galeria.innerHTML = produtos.map(produtoCardHtml).join("");

            galeria.querySelectorAll(".produto-card").forEach(card => {
                card.addEventListener("click", (e) => {
                    if(e.target.closest("a")) return; // clique no botão de encomendar não abre o modal
                    abrirModalProduto(card.dataset.id);
                });
            });
        }
    }

    inicializarFormularioAvaliacao();
    inicializarModal();
});

/* ---------- monta o card de uma peça (com ou sem desconto) ---------- */

function produtoCardHtml(produto){
    const temDesconto = Number(produto.desconto) > 0;
    const imagemHtml = produto.imagem
        ? `<img src="${produto.imagem}" alt="${produto.nome}">`
        : `<i class="fa-solid fa-mitten"></i>`;

    const precoHtml = temDesconto
        ? `<div class="preco-bloco">
                <span class="preco-original-riscado">R$ ${formatarPreco(produto.preco)}</span>
                <span class="badge-desconto">-${produto.desconto}%</span>
           </div>
           <div class="produto-preco">R$ ${formatarPreco(produto.preco_final)}</div>`
        : `<div class="produto-preco">R$ ${formatarPreco(produto.preco)}</div>`;

    const mensagem = `Olá! Tenho interesse na peça "${produto.nome}" que vi no site da ${_loja.nome} 🧶`;
    const link = linkWhatsApp(_loja.whatsapp, mensagem);

    return `
    <div class="produto-card" data-id="${produto.id}">
        <div class="produto-imagem">${imagemHtml}</div>
        <div class="produto-conteudo">
            <h3>${produto.nome}</h3>
            <p>${produto.descricao}</p>
            ${precoHtml}
            <a class="btn btn-whats btn-small" href="${link}" target="_blank" rel="noopener">
                <i class="fa-brands fa-whatsapp"></i> Encomendar
            </a>
        </div>
    </div>`;
}

/* ==========================================================
   MODAL DA PEÇA (mini-página dentro do próprio site)
========================================================== */

function inicializarModal(){
    const overlay = document.getElementById("modalProduto");
    const botaoFechar = document.getElementById("modalFechar");
    if(!overlay) return;

    function fechar(){ overlay.hidden = true; }

    botaoFechar.addEventListener("click", fechar);
    overlay.addEventListener("click", (e) => { if(e.target === overlay) fechar(); });
    document.addEventListener("keydown", (e) => { if(e.key === "Escape") fechar(); });
}

async function abrirModalProduto(id){
    const produto = _produtos.find(p => p.id === id);
    if(!produto) return;

    const overlay = document.getElementById("modalProduto");
    const conteudo = document.getElementById("modalConteudo");

    const temDesconto = Number(produto.desconto) > 0;
    const precoUnitario = temDesconto ? Number(produto.preco_final) : Number(produto.preco);

    const imagemHtml = produto.imagem
        ? `<img src="${produto.imagem}" alt="${produto.nome}">`
        : `<i class="fa-solid fa-mitten"></i>`;

    const precoLinhaHtml = temDesconto
        ? `<span class="preco-original-riscado">R$ ${formatarPreco(produto.preco)}</span>
           <span class="badge-desconto">-${produto.desconto}%</span>
           <span class="modal-preco-final">R$ ${formatarPreco(produto.preco_final)}</span>`
        : `<span class="modal-preco-final">R$ ${formatarPreco(produto.preco)}</span>`;

    conteudo.innerHTML = `<p style="padding:26px; color:var(--marrom-suave);">Carregando peça...</p>`;
    overlay.hidden = false;

    const [resumoProduto, avaliacoesProduto] = await Promise.all([
        obterMediaAvaliacoesProduto(produto.id),
        obterAvaliacoesProduto(produto.id, 5)
    ]);

    const avaliacoesHtml = avaliacoesProduto.length
        ? avaliacoesProduto.map(av => `
            <div class="mini-avaliacao">
                <span class="nome">${av.nome}</span> — ${estrelasHtml(av.nota)}<br>
                ${av.comentario ? `"${av.comentario}"` : "<em>(sem comentário)</em>"}
            </div>`).join("")
        : `<p style="color:var(--marrom-suave); font-size:.88rem;">Ainda não há avaliações desta peça. Seja a primeira pessoa a avaliar!</p>`;

    conteudo.innerHTML = `
        <div class="modal-imagem">${imagemHtml}</div>
        <h2>${produto.nome}</h2>
        ${resumoProduto.total > 0
            ? `<div class="resumo-avaliacoes">${estrelasHtml(resumoProduto.media)} ${resumoProduto.media.toFixed(1)} <small>(${resumoProduto.total} avaliação${resumoProduto.total > 1 ? "ões" : ""} desta peça)</small></div>`
            : `<div class="resumo-avaliacoes"><small>Esta peça ainda não tem avaliações</small></div>`}
        <p class="modal-descricao">${produto.descricao}</p>

        <div class="modal-preco-linha">${precoLinhaHtml}</div>

        <div class="modal-qtd-linha">
            <span>Quantidade:</span>
            <div class="modal-qtd-controle">
                <button type="button" id="modalQtdMenos">−</button>
                <span id="modalQtdValor">1</span>
                <button type="button" id="modalQtdMais">+</button>
            </div>
        </div>

        <p class="modal-total">Total: <strong id="modalTotalValor">R$ ${formatarPreco(precoUnitario)}</strong></p>

        <a href="#" target="_blank" rel="noopener" class="btn btn-whats" id="modalBotaoEncomendar" style="width:100%; justify-content:center;">
            <i class="fa-brands fa-whatsapp"></i> Encomendar pelo WhatsApp
        </a>

        <div class="modal-avaliacoes-lista">
            <h4>Avaliações desta peça</h4>
            <div id="modalListaAvaliacoes">${avaliacoesHtml}</div>

            <div class="form-avaliacao" style="margin:18px 0 0; padding:18px; text-align:left;">
                <h3 style="font-size:1rem;">Avaliar esta peça</h3>
                <div class="estrelas-input" id="modalEstrelasInput" style="justify-content:flex-start;">
                    <button type="button" data-nota="1" aria-label="1 estrela"><i class="fa-solid fa-star"></i></button>
                    <button type="button" data-nota="2" aria-label="2 estrelas"><i class="fa-solid fa-star"></i></button>
                    <button type="button" data-nota="3" aria-label="3 estrelas"><i class="fa-solid fa-star"></i></button>
                    <button type="button" data-nota="4" aria-label="4 estrelas"><i class="fa-solid fa-star"></i></button>
                    <button type="button" data-nota="5" aria-label="5 estrelas"><i class="fa-solid fa-star"></i></button>
                </div>
                <textarea id="modalComentario" placeholder="Conte como foi sua experiência com essa peça..." style="min-height:70px;"></textarea>
                <button class="btn btn-primary btn-small" id="modalBotaoEnviarAvaliacao">
                    <i class="fa-solid fa-paper-plane"></i> Enviar avaliação
                </button>
                <div class="auth-msg" id="modalMensagemAvaliacao"></div>
            </div>
        </div>
    `;

    let quantidade = 1;
    const qtdValorEl = conteudo.querySelector("#modalQtdValor");
    const totalValorEl = conteudo.querySelector("#modalTotalValor");
    const botaoEncomendar = conteudo.querySelector("#modalBotaoEncomendar");

    function atualizarTotal(){
        qtdValorEl.textContent = quantidade;
        const total = precoUnitario * quantidade;
        totalValorEl.textContent = "R$ " + formatarPreco(total);

        const mensagem = `Olá! Quero encomendar:\n` +
            `🧶 ${produto.nome}\n` +
            `Quantidade: ${quantidade}\n` +
            `Valor: R$ ${formatarPreco(total)}`;

        botaoEncomendar.href = linkWhatsApp(_loja.whatsapp, mensagem);
    }

    conteudo.querySelector("#modalQtdMenos").addEventListener("click", () => {
        if(quantidade > 1){ quantidade--; atualizarTotal(); }
    });
    conteudo.querySelector("#modalQtdMais").addEventListener("click", () => {
        quantidade++; atualizarTotal();
    });

    atualizarTotal();
    inicializarFormularioAvaliacaoProduto(produto, conteudo);
}

/* ---------- formulário de avaliação DENTRO do modal (avaliação da peça) ---------- */

function inicializarFormularioAvaliacaoProduto(produto, conteudo){
    let notaSelecionadaModal = 0;

    const estrelasInput = conteudo.querySelector("#modalEstrelasInput");
    const comentarioEl = conteudo.querySelector("#modalComentario");
    const botaoEnviar = conteudo.querySelector("#modalBotaoEnviarAvaliacao");
    const mensagemEl = conteudo.querySelector("#modalMensagemAvaliacao");
    const listaEl = conteudo.querySelector("#modalListaAvaliacoes");

    const botoes = [...estrelasInput.querySelectorAll("button")];

    function pintarEstrelas(nota){
        botoes.forEach(b => b.classList.toggle("selecionada", Number(b.dataset.nota) <= nota));
    }

    botoes.forEach(botao => {
        botao.addEventListener("click", () => {
            notaSelecionadaModal = Number(botao.dataset.nota);
            pintarEstrelas(notaSelecionadaModal);
        });
    });

    function mostrarMensagem(texto, tipo){
        mensagemEl.textContent = texto;
        mensagemEl.className = "auth-msg " + (tipo || "");
    }

    botaoEnviar.addEventListener("click", async () => {
        if(!notaSelecionadaModal){
            mostrarMensagem("Escolha de 1 a 5 estrelas antes de enviar.", "erro");
            return;
        }

        const comentario = comentarioEl.value.trim();

        if(notaSelecionadaModal !== 3 && !comentario){
            mostrarMensagem("Pra essa nota, conta pra gente o motivo — o comentário é obrigatório.", "erro");
            return;
        }

        const perfil = await obterPerfilAtual();
        if(!perfil){
            mostrarMensagem("Você precisa entrar na sua conta pra avaliar.", "erro");
            return;
        }

        botaoEnviar.disabled = true;
        mostrarMensagem("Enviando...", "");

        try{
            await adicionarAvaliacaoProduto({
                produtoId: produto.id,
                nome: perfil.nome || "Cliente",
                nota: notaSelecionadaModal,
                comentario
            });

            mostrarMensagem("Avaliação enviada, obrigada! 💛", "sucesso");
            comentarioEl.value = "";
            notaSelecionadaModal = 0;
            pintarEstrelas(0);

            const avaliacoes = await obterAvaliacoesProduto(produto.id, 5);
            listaEl.innerHTML = avaliacoes.map(av => `
                <div class="mini-avaliacao">
                    <span class="nome">${av.nome}</span> — ${estrelasHtml(av.nota)}<br>
                    ${av.comentario ? `"${av.comentario}"` : "<em>(sem comentário)</em>"}
                </div>`).join("");

        }catch(erro){
            console.error("Erro ao enviar avaliação da peça:", erro);
            mostrarMensagem(erro.message || "Não deu pra enviar sua avaliação.", "erro");
        }finally{
            botaoEnviar.disabled = false;
        }
    });
}

/* ==========================================================
   FORMULÁRIO DE AVALIAÇÃO
========================================================== */

function inicializarFormularioAvaliacao(){
    const estrelasInput = document.getElementById("estrelasInput");
    const comentarioEl = document.getElementById("comentarioAvaliacao");
    const botaoEnviar = document.getElementById("botaoEnviarAvaliacao");
    const mensagemEl = document.getElementById("mensagemAvaliacao");
    if(!estrelasInput) return;

    const botoes = [...estrelasInput.querySelectorAll("button")];

    function pintarEstrelas(nota){
        botoes.forEach(b => {
            b.classList.toggle("selecionada", Number(b.dataset.nota) <= nota);
        });
    }

    botoes.forEach(botao => {
        botao.addEventListener("click", () => {
            _notaSelecionada = Number(botao.dataset.nota);
            pintarEstrelas(_notaSelecionada);
        });
    });

    function mostrarMensagem(texto, tipo){
        mensagemEl.textContent = texto;
        mensagemEl.className = "auth-msg " + (tipo || "");
    }

    botaoEnviar.addEventListener("click", async () => {
        if(!_notaSelecionada){
            mostrarMensagem("Escolha de 1 a 5 estrelas antes de enviar.", "erro");
            return;
        }

        const comentario = comentarioEl.value.trim();

        // regra: notas 1, 2, 4 e 5 exigem comentário. Nota 3 não exige.
        if(_notaSelecionada !== 3 && !comentario){
            mostrarMensagem("Pra essa nota, conta pra gente o motivo — o comentário é obrigatório.", "erro");
            return;
        }

        const perfil = await obterPerfilAtual();
        if(!perfil){
            mostrarMensagem("Você precisa entrar na sua conta pra avaliar.", "erro");
            return;
        }

        botaoEnviar.disabled = true;
        mostrarMensagem("Enviando...", "");

        try{
            await adicionarAvaliacao({
                nome: perfil.nome || "Cliente",
                nota: _notaSelecionada,
                comentario
            });

            mostrarMensagem("Avaliação enviada, obrigada! 💛", "sucesso");
            comentarioEl.value = "";
            _notaSelecionada = 0;
            pintarEstrelas(0);

            // recarrega o resumo e a lista de avaliações na tela
            const [resumo, ultimas] = await Promise.all([obterMediaAvaliacoes(), obterAvaliacoes(3)]);
            _avaliacoesResumo = resumo;
            _avaliacoesUltimas = ultimas;

            const resumoSecaoEl = document.getElementById("resumoAvaliacoes");
            if(resumoSecaoEl){
                resumoSecaoEl.innerHTML = `${estrelasHtml(resumo.media)} ${resumo.media.toFixed(1)} <small>com base em ${resumo.total} avaliação${resumo.total > 1 ? "ões" : ""}</small>`;
            }
            const listaEl = document.getElementById("listaAvaliacoes");
            if(listaEl) listaEl.innerHTML = ultimas.map(cardAvaliacao).join("");

        }catch(erro){
            console.error("Erro ao enviar avaliação:", erro);
            mostrarMensagem(erro.message || "Não deu pra enviar sua avaliação.", "erro");
        }finally{
            botaoEnviar.disabled = false;
        }
    });
}
