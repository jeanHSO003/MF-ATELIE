/* ==========================================================
   MF ATELIÊ — CHAT DA MIH

   Por enquanto é um bot simples de perguntas frequentes (baseado
   em regras, sem IA de verdade ainda) — a ideia é evoluir aos
   poucos pra Mih responder cada vez mais coisas sozinha. Sempre
   tem a opção de pular direto pro WhatsApp com uma pessoa de
   verdade.
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const painel = document.getElementById("chatPainel");
    const toggle = document.getElementById("chatToggle");
    const fechar = document.getElementById("chatFechar");
    const mensagensEl = document.getElementById("chatMensagens");
    const opcoesEl = document.getElementById("chatOpcoes");
    if(!painel || !toggle) return;

    let lojaCache = null;
    let jaAbriu = false;

    function bolha(texto, tipo){
        const div = document.createElement("div");
        div.className = "chat-bolha " + tipo;
        div.innerHTML = texto;
        mensagensEl.appendChild(div);
        mensagensEl.scrollTop = mensagensEl.scrollHeight;
    }

    async function obterLojaCache(){
        if(!lojaCache) lojaCache = await obterLoja();
        return lojaCache;
    }

    const MENU_PRINCIPAL = [
        { texto: "Horário de atendimento", resposta: async () => {
            const loja = await obterLojaCache();
            return `A gente atende <strong>${loja?.horario || "de segunda a sábado"}</strong>. Fora desse horário, pode mandar mensagem que respondemos assim que possível! 💛`;
        }},
        { texto: "Como faço uma encomenda?", resposta: () =>
            `É bem simples: escolhe a peça lá na <a href="#galeria">galeria</a>, toca em "Encomendar" (ou ajusta a quantidade primeiro, clicando na peça) e a mensagem já vai pronta pro WhatsApp, com o nome, a quantidade e o valor. 🧶`
        },
        { texto: "Formas de pagamento", resposta: () =>
            `Aceitamos Pix, cartão e dinheiro na entrega — combinamos certinho com você direto no WhatsApp antes de fechar o pedido.`
        },
        { texto: "Prazo de entrega", resposta: () =>
            `O prazo varia de acordo com a peça e a fila de produção do momento — a artesã confirma uma data certinha assim que você fala com ela pelo WhatsApp.`
        },
        { texto: "Quero falar com uma pessoa", resposta: async () => {
            const loja = await obterLojaCache();
            const link = linkWhatsApp(loja?.whatsapp, `Olá! Vim do chat do site e queria falar com uma pessoa 🧶`);
            return `Claro! <a href="${link}" target="_blank" rel="noopener"><strong>Toque aqui pra chamar no WhatsApp</strong></a> 💬`;
        }}
    ];

    function montarOpcoes(){
        opcoesEl.innerHTML = "";
        MENU_PRINCIPAL.forEach(item => {
            const btn = document.createElement("button");
            btn.textContent = item.texto;
            btn.addEventListener("click", async () => {
                bolha(item.texto, "usuario");
                const resposta = await item.resposta();
                setTimeout(() => bolha(resposta, "bot"), 350);
            });
            opcoesEl.appendChild(btn);
        });
    }

    function abrirPrimeiraVez(){
        if(jaAbriu) return;
        jaAbriu = true;
        bolha("Oi! Eu sou a Mih 👋 Ainda tô aprendendo, mas já consigo ajudar com essas dúvidas mais comuns:", "bot");
        montarOpcoes();
    }

    toggle.addEventListener("click", () => {
        const estaAberto = !painel.hidden;
        painel.hidden = estaAberto;
        if(!estaAberto) abrirPrimeiraVez();
    });

    fechar.addEventListener("click", () => { painel.hidden = true; });
});
