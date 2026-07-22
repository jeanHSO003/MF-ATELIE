/* ==========================================================
   FIO & PONTO — SITE PÚBLICO (visão do cliente)
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const galeria = document.getElementById("galeria-produtos");
    if(galeria){
        galeria.innerHTML = `<div class="galeria-vazio">Carregando peças...</div>`;
    }

    const loja = await obterLoja();
    const produtos = await obterProdutos();

    if(!loja){
        // Sem conexão com o Supabase (chaves não configuradas, projeto pausado, etc.)
        if(galeria){
            galeria.innerHTML = `<div class="galeria-vazio">Não foi possível carregar a loja agora. Tente novamente em instantes.</div>`;
        }
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
        if(loja.foto_perfil){
            fotoPerfilEl.innerHTML = `<img src="${loja.foto_perfil}" alt="Foto de ${loja.nome}">`;
        }else{
            fotoPerfilEl.innerHTML = `<i class="fa-solid fa-heart"></i>`;
        }
    }

    const logoLojaEl = document.getElementById("logoLoja");
    if(logoLojaEl && loja.logo){
        logoLojaEl.innerHTML = `<img src="${loja.logo}" alt="Logo ${loja.nome}">`;
    }

    /* mensagem padrão do botão flutuante e do CTA final */
    const mensagemGeral = `Olá! Vi o site da ${loja.nome} e queria fazer uma encomenda 🧶`;
    document.querySelectorAll("[data-whats-geral]").forEach(el => {
        el.href = linkWhatsApp(loja.whatsapp, mensagemGeral);
    });

    /* ---------- galeria de produtos ---------- */

    if(galeria){
        if(!produtos.length){
            galeria.innerHTML = `<div class="galeria-vazio">Nenhuma peça cadastrada ainda. Volte em breve! 🧶</div>`;
        }else{
            galeria.innerHTML = produtos.map(produto => {
                const mensagem = `Olá! Tenho interesse na peça "${produto.nome}" que vi no site da ${loja.nome} 🧶`;
                const link = linkWhatsApp(loja.whatsapp, mensagem);

                const imagemHtml = produto.imagem
                    ? `<img src="${produto.imagem}" alt="${produto.nome}">`
                    : `<i class="fa-solid fa-mitten"></i>`;

                return `
                <div class="produto-card">
                    <div class="produto-imagem">${imagemHtml}</div>
                    <div class="produto-conteudo">
                        <h3>${produto.nome}</h3>
                        <p>${produto.descricao}</p>
                        <div class="produto-preco">R$ ${produto.preco}</div>
                        <a class="btn btn-whats btn-small" href="${link}" target="_blank" rel="noopener">
                            <i class="fa-brands fa-whatsapp"></i> Encomendar
                        </a>
                    </div>
                </div>`;
            }).join("");
        }
    }

});
