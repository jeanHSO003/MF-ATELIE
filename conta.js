/* ==========================================================
   FIO & PONTO — ESTADO DA CONTA NO SITE PÚBLICO

   Mostra "Entrar / Cadastrar" para visitantes, ou o nome da
   pessoa + botão "Sair" para quem já está logado. Se quem está
   logado for a crocheteira, mostra também um atalho pro painel.
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const areaConta = document.getElementById("areaConta");
    if(!areaConta) return;

    const perfil = await obterPerfilAtual();

    if(!perfil){
        return; // mantém o "Entrar / Cadastrar" que já está no HTML
    }

    const primeiroNome = (perfil.nome || perfil.email || "").split(" ")[0];

    const atalhoPainel = perfil.papel === "crocheteira"
        ? `<a href="painel.html" class="btn btn-outline btn-small"><i class="fa-solid fa-scissors"></i> Painel</a>`
        : "";

    areaConta.innerHTML = `
        <span class="saudacao">Olá, ${primeiroNome} 👋</span>
        ${atalhoPainel}
        <button class="link-sair" id="botaoSair">Sair</button>
    `;

    document.getElementById("botaoSair").addEventListener("click", fazerLogout);
});
