/* ==========================================================
   MF ATELIÊ — ESTADO DA CONTA NO SITE PÚBLICO

   Desktop: mostra "Entrar / Cadastrar" ou "Olá, fulano + Sair" na
   linha do topo. Mobile: a linha some (some no CSS) e um botãozinho
   de usuário abre/fecha um menu suspenso com as mesmas opções.
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const areaConta = document.getElementById("areaConta");
    const contaToggle = document.getElementById("contaToggle");
    const contaDropdown = document.getElementById("contaDropdown");
    if(!areaConta || !contaDropdown) return;

    const perfil = await obterPerfilAtual();

    function montarConteudo(){
        if(!perfil){
            return `
                <a href="login.html" class="link-sair">Entrar</a>
                <a href="cadastro.html" class="btn btn-outline btn-small">Cadastrar</a>
            `;
        }

        const primeiroNome = (perfil.nome || perfil.email || "").split(" ")[0];
        const atalhoPainel = perfil.papel === "crocheteira"
            ? `<a href="painel.html" class="btn btn-outline btn-small"><i class="fa-solid fa-scissors"></i> Painel</a>`
            : "";

        return `
            <span class="saudacao">Olá, ${primeiroNome} 👋</span>
            ${atalhoPainel}
            <button class="link-sair botao-sair">Sair</button>
        `;
    }

    if(perfil){
        areaConta.innerHTML = montarConteudo();
        areaConta.querySelector(".botao-sair").addEventListener("click", fazerLogout);
    }

    // mesmo conteúdo, dentro do menu suspenso do mobile
    contaDropdown.innerHTML = montarConteudo();
    const botaoSairMobile = contaDropdown.querySelector(".botao-sair");
    if(botaoSairMobile) botaoSairMobile.addEventListener("click", fazerLogout);

    contaToggle.addEventListener("click", () => {
        contaDropdown.classList.toggle("aberto");
    });
});
