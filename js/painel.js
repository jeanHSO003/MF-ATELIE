/* ==========================================================
   MF ATELIÊ — PAINEL DA CROCHETEIRA (visão da crocheteira)
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    /* ---------- referências ---------- */

    const formLoja = document.getElementById("formLoja");
    const formProduto = document.getElementById("formProduto");
    const listaProdutosEl = document.getElementById("listaProdutosAdmin");
    const inputImagem = document.getElementById("produtoImagem");
    const previewImagem = document.getElementById("previewImagem");
    const inputLogoLoja = document.getElementById("logoLojaInput");
    const previewLogoLoja = document.getElementById("previewLogoLoja");
    const inputFotoPerfil = document.getElementById("fotoPerfilInput");
    const previewFotoPerfil = document.getElementById("previewFotoPerfil");
    const tituloFormProduto = document.getElementById("tituloFormProduto");
    const botaoCancelarEdicao = document.getElementById("cancelarEdicao");
    const botaoSalvarProduto = formProduto.querySelector("button[type=submit]");
    const toastEl = document.getElementById("toast");
    const inputDesconto = document.getElementById("produtoDesconto");
    const precoComDescontoPreview = document.getElementById("precoComDescontoPreview");
    const listaAvaliacoesAdminEl = document.getElementById("listaAvaliacoesAdmin");
    const resumoAvaliacoesAdminEl = document.getElementById("resumoAvaliacoesAdmin");

    let idEmEdicao = null;
    let arquivoSelecionado = null;   // File escolhido no input, aguardando upload
    let imagemAtualUrl = "";         // URL já salva (ao editar uma peça existente)

    let arquivoLogoSelecionado = null;
    let arquivoFotoPerfilSelecionado = null;
    let logoAtualUrl = "";
    let fotoPerfilAtualUrl = "";

    /* ---------- toast simples de feedback ---------- */

    function mostrarToast(texto){
        toastEl.textContent = texto;
        toastEl.classList.add("mostrar");
        setTimeout(() => toastEl.classList.remove("mostrar"), 2200);
    }

    /* ---------- carregar dados da loja no formulário ---------- */

    async function carregarFormularioLoja(){
        const loja = await obterLoja();
        if(!loja) return;

        formLoja.nome.value = loja.nome;
        formLoja.frase.value = loja.frase;
        formLoja.bio.value = loja.bio;
        formLoja.whatsapp.value = loja.whatsapp;
        formLoja.instagram.value = loja.instagram;
        formLoja.cidade.value = loja.cidade;
        formLoja.horario.value = loja.horario;

        logoAtualUrl = loja.logo || "";
        fotoPerfilAtualUrl = loja.foto_perfil || "";

        if(logoAtualUrl){
            previewLogoLoja.src = logoAtualUrl;
            previewLogoLoja.style.display = "block";
        }
        if(fotoPerfilAtualUrl){
            previewFotoPerfil.src = fotoPerfilAtualUrl;
            previewFotoPerfil.style.display = "block";
        }
    }

    formLoja.addEventListener("submit", async (e) => {
        e.preventDefault();
        const botao = formLoja.querySelector("button[type=submit]");
        botao.disabled = true;

        try{
            if(arquivoLogoSelecionado){
                mostrarToast("Enviando logo...");
                logoAtualUrl = await enviarImagem(arquivoLogoSelecionado, "loja");
            }
            if(arquivoFotoPerfilSelecionado){
                mostrarToast("Enviando foto de perfil...");
                fotoPerfilAtualUrl = await enviarImagem(arquivoFotoPerfilSelecionado, "loja");
            }

            const dados = {
                nome: formLoja.nome.value.trim(),
                frase: formLoja.frase.value.trim(),
                bio: formLoja.bio.value.trim(),
                whatsapp: formLoja.whatsapp.value.trim(),
                instagram: formLoja.instagram.value.trim().replace("@", ""),
                cidade: formLoja.cidade.value.trim(),
                horario: formLoja.horario.value.trim(),
                logo: logoAtualUrl,
                foto_perfil: fotoPerfilAtualUrl
            };

            await salvarLoja(dados);
            arquivoLogoSelecionado = null;
            arquivoFotoPerfilSelecionado = null;
            mostrarToast("Dados da loja salvos! ✅");
        }catch(erro){
            console.error("Erro ao salvar loja:", erro);
            mostrarToast("Erro: " + (erro.message || "não deu pra salvar."));
        }
        botao.disabled = false;
    });

    if(inputLogoLoja){
        inputLogoLoja.addEventListener("change", () => {
            const arquivo = inputLogoLoja.files[0];
            if(!arquivo) return;
            arquivoLogoSelecionado = arquivo;

            const leitor = new FileReader();
            leitor.onload = () => {
                previewLogoLoja.src = leitor.result;
                previewLogoLoja.style.display = "block";
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    if(inputFotoPerfil){
        inputFotoPerfil.addEventListener("change", () => {
            const arquivo = inputFotoPerfil.files[0];
            if(!arquivo) return;
            arquivoFotoPerfilSelecionado = arquivo;

            const leitor = new FileReader();
            leitor.onload = () => {
                previewFotoPerfil.src = leitor.result;
                previewFotoPerfil.style.display = "block";
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    /* ---------- pré-visualização de imagem (só visual, o upload real acontece ao salvar) ---------- */

    function atualizarPreviewDesconto(){
        const preco = parsePreco(formProduto.preco.value);
        const desconto = Number(inputDesconto.value) || 0;
        const final = calcularPrecoFinal(preco, desconto);
        precoComDescontoPreview.textContent = "R$ " + formatarPreco(final);
    }

    formProduto.preco.addEventListener("input", atualizarPreviewDesconto);
    inputDesconto.addEventListener("input", atualizarPreviewDesconto);

    if(inputImagem){
        inputImagem.addEventListener("change", () => {
            const arquivo = inputImagem.files[0];
            if(!arquivo) return;

            arquivoSelecionado = arquivo;

            const leitor = new FileReader();
            leitor.onload = () => {
                previewImagem.src = leitor.result;
                previewImagem.style.display = "block";
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    /* ---------- renderizar lista de peças cadastradas ---------- */

    async function renderizarLista(){
        listaProdutosEl.innerHTML = `<div class="galeria-vazio">Carregando peças...</div>`;
        const produtos = await obterProdutos();

        if(!produtos.length){
            listaProdutosEl.innerHTML = `<div class="galeria-vazio">Nenhuma peça cadastrada ainda. Use o formulário acima para adicionar a primeira! 🧶</div>`;
            return;
        }

        listaProdutosEl.innerHTML = produtos.map(produto => {
            const imagemHtml = produto.imagem
                ? `<img src="${produto.imagem}" alt="${produto.nome}">`
                : `<div class="sem-foto"><i class="fa-solid fa-mitten"></i></div>`;

            const temDesconto = Number(produto.desconto) > 0;
            const precoHtml = temDesconto
                ? `<span style="text-decoration:line-through; opacity:.6; margin-right:6px;">R$ ${formatarPreco(produto.preco)}</span>
                   <span style="background:var(--mostarda); color:#fff; font-size:.72rem; padding:2px 7px; border-radius:50px; margin-right:6px;">-${produto.desconto}%</span>
                   R$ ${formatarPreco(produto.preco_final)}`
                : `R$ ${formatarPreco(produto.preco)}`;

            return `
            <div class="item-admin" data-id="${produto.id}">
                ${imagemHtml}
                <div class="item-admin-info">
                    <h4>${produto.nome}</h4>
                    <p>${produto.descricao}</p>
                    <div class="item-admin-preco">${precoHtml}</div>
                </div>
                <div class="item-admin-acoes">
                    <button class="icone-btn editar" title="Editar" data-acao="editar" data-id="${produto.id}">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icone-btn excluir" title="Excluir" data-acao="excluir" data-id="${produto.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join("");
    }

    /* ---------- formulário de produto: adicionar / editar ---------- */

    function limparFormularioProduto(){
        formProduto.reset();
        previewImagem.style.display = "none";
        previewImagem.src = "";
        arquivoSelecionado = null;
        imagemAtualUrl = "";
        idEmEdicao = null;
        tituloFormProduto.textContent = "Adicionar nova peça";
        botaoCancelarEdicao.style.display = "none";
        atualizarPreviewDesconto();
    }

    formProduto.addEventListener("submit", async (e) => {
        e.preventDefault();
        botaoSalvarProduto.disabled = true;
        botaoSalvarProduto.textContent = "Salvando...";

        try{
            let urlImagem = imagemAtualUrl;

            // só faz upload se a pessoa escolheu um arquivo novo
            if(arquivoSelecionado){
                mostrarToast("Enviando foto...");
                urlImagem = await enviarImagemProduto(arquivoSelecionado);
            }

            const dados = {
                nome: formProduto.nome.value.trim(),
                descricao: formProduto.descricao.value.trim(),
                preco: formProduto.preco.value.trim(),
                desconto: Number(inputDesconto.value) || 0,
                imagem: urlImagem
            };

            if(idEmEdicao){
                await atualizarProduto(idEmEdicao, dados);
                mostrarToast("Peça atualizada! ✅");
            }else{
                await adicionarProduto(dados);
                mostrarToast("Peça adicionada! 🧶");
            }

            limparFormularioProduto();
            await renderizarLista();

        }catch(erro){
            console.error("Erro ao salvar peça:", erro);
            mostrarToast("Erro: " + (erro.message || "não deu pra salvar a peça."));
        }finally{
            botaoSalvarProduto.disabled = false;
            botaoSalvarProduto.innerHTML = `<i class="fa-solid fa-plus"></i> Salvar peça`;
        }
    });

    botaoCancelarEdicao.addEventListener("click", limparFormularioProduto);

    /* ---------- editar / excluir (delegação de evento) ---------- */

    listaProdutosEl.addEventListener("click", async (e) => {
        const botao = e.target.closest("button[data-acao]");
        if(!botao) return;

        const id = botao.dataset.id;
        const acao = botao.dataset.acao;

        if(acao === "excluir"){
            const confirmar = confirm("Tem certeza que deseja excluir esta peça?");
            if(confirmar){
                try{
                    await excluirProduto(id);
                    mostrarToast("Peça excluída.");
                    await renderizarLista();
                }catch(erro){
                    console.error("Erro ao excluir:", erro);
                    mostrarToast("Não deu pra excluir. Tenta de novo.");
                }
            }
        }

        if(acao === "editar"){
            const produtos = await obterProdutos();
            const produto = produtos.find(p => p.id === id);
            if(!produto) return;

            idEmEdicao = id;
            arquivoSelecionado = null;
            imagemAtualUrl = produto.imagem || "";

            formProduto.nome.value = produto.nome;
            formProduto.descricao.value = produto.descricao;
            formProduto.preco.value = formatarPreco(produto.preco);
            inputDesconto.value = produto.desconto || 0;
            atualizarPreviewDesconto();

            if(produto.imagem){
                previewImagem.src = produto.imagem;
                previewImagem.style.display = "block";
            }else{
                previewImagem.style.display = "none";
            }

            tituloFormProduto.textContent = "Editando: " + produto.nome;
            botaoCancelarEdicao.style.display = "inline-flex";
            formProduto.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    /* ---------- avaliações recebidas (moderação) ---------- */

    function estrelasTexto(nota){
        return "★".repeat(nota) + "☆".repeat(5 - nota);
    }

    async function renderizarAvaliacoesAdmin(){
        const [{ media, total }, avaliacoes] = await Promise.all([
            obterMediaAvaliacoes(),
            obterAvaliacoes()
        ]);

        resumoAvaliacoesAdminEl.innerHTML = total
            ? `Média geral: <strong style="color:var(--mostarda);">${media.toFixed(1)} ★</strong> (${total} avaliação${total > 1 ? "ões" : ""})`
            : "Ainda não há avaliações.";

        if(!avaliacoes.length){
            listaAvaliacoesAdminEl.innerHTML = `<div class="galeria-vazio">Nenhuma avaliação recebida ainda.</div>`;
            return;
        }

        listaAvaliacoesAdminEl.innerHTML = avaliacoes.map(av => `
            <div class="item-admin" data-id-avaliacao="${av.id}">
                <div class="sem-foto"><i class="fa-solid fa-user"></i></div>
                <div class="item-admin-info">
                    <h4>${av.nome} <span style="color:var(--mostarda); font-weight:400;">${estrelasTexto(av.nota)}</span></h4>
                    <p style="white-space:normal;">${av.comentario || "<em>(sem comentário)</em>"}</p>
                </div>
                <div class="item-admin-acoes">
                    <button class="icone-btn excluir" title="Excluir avaliação" data-acao="excluir-avaliacao" data-id="${av.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`).join("");
    }

    listaAvaliacoesAdminEl.addEventListener("click", async (e) => {
        const botao = e.target.closest("button[data-acao='excluir-avaliacao']");
        if(!botao) return;

        if(confirm("Excluir esta avaliação?")){
            try{
                await excluirAvaliacao(botao.dataset.id);
                mostrarToast("Avaliação excluída.");
                await renderizarAvaliacoesAdmin();
            }catch(erro){
                console.error("Erro ao excluir avaliação:", erro);
                mostrarToast("Não deu pra excluir a avaliação.");
            }
        }
    });

    /* ---------- inicialização ---------- */

    botaoCancelarEdicao.style.display = "none";
    await carregarFormularioLoja();
    await renderizarLista();
    await renderizarAvaliacoesAdmin();

});
