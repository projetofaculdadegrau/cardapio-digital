const API_URL = "http://127.0.0.1:8000";
const INTERVALO_ATUALIZACAO = 15000;

let atualizacaoEmAndamento = false;
let acaoEmAndamento = false;
let lojasPorId = new Map();

document.addEventListener("DOMContentLoaded", iniciarPainel);

async function iniciarPainel() {
    document.getElementById("botao-sair").addEventListener("click", realizarLogout);
    document.getElementById("botao-atualizar").addEventListener("click", atualizarPainel);

    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");

    if (!token || role !== "ENTREGADOR") {
        realizarLogout();
        return;
    }

    document.getElementById("boas-vindas").textContent =
        `Olá, ${localStorage.getItem("user_nome") || "entregador"}!`;

    try {
        const resposta = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (resposta.status === 401 || resposta.status === 403) {
            realizarLogout();
            return;
        }

        if (resposta.ok) {
            const usuario = await resposta.json();
            if (usuario.role && usuario.role !== "ENTREGADOR") {
                realizarLogout();
                return;
            }
            if (usuario.nome) {
                document.getElementById("boas-vindas").textContent =
                    `Olá, ${usuario.nome}!`;
            }
        }

        await atualizarPainel();
        window.setInterval(atualizarPainel, INTERVALO_ATUALIZACAO);
    } catch (erro) {
        mostrarMensagem("Não foi possível conectar à API. Verifique se o backend está ligado.", true);
    }
}

function realizarLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_nome");
    localStorage.removeItem("user_id");
    window.location.href = "../login/index.html";
}

function mostrarMensagem(texto, tipoOuErro = false) {
    let tipo = 'sucesso';
    if (tipoOuErro === true || tipoOuErro === 'erro' || tipoOuErro === 'error') {
        tipo = 'erro';
    } else if (tipoOuErro === 'edicao' || tipoOuErro === 'alteracao') {
        tipo = 'edicao';
    } else if (tipoOuErro === 'exclusao') {
        tipo = 'exclusao';
    } else if (tipoOuErro === 'aviso') {
        tipo = 'aviso';
    } else if (typeof tipoOuErro === 'string') {
        tipo = tipoOuErro;
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast(texto, tipo);
    }
}

function limparMensagem() {
    // Mantém compatibilidade com código antigo sem renderizar caixa inline no body.
}

async function requisicaoAPI(caminho, opcoes = {}) {
    const token = localStorage.getItem("access_token");
    const resposta = await fetch(`${API_URL}${caminho}`, {
        ...opcoes,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401 || resposta.status === 403) {
        realizarLogout();
        throw new Error("Sua sessão expirou ou não tem permissão para esta operação.");
    }

    const texto = await resposta.text();
    let dados = null;

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch {
            dados = null;
        }
    }

    if (!resposta.ok) {
        throw new Error(dados?.detail || `A API retornou o erro ${resposta.status}.`);
    }

    return dados;
}

async function atualizarPainel() {
    if (atualizacaoEmAndamento || acaoEmAndamento) return;

    atualizacaoEmAndamento = true;
    const botaoAtualizar = document.getElementById("botao-atualizar");
    botaoAtualizar.disabled = true;

    try {
        limparMensagem();

        const [disponiveis, minhasEntregas, lojas] = await Promise.all([
            requisicaoAPI("/pedidos/disponiveis"),
            requisicaoAPI("/pedidos/entregador/minhas-entregas"),
            buscarLojas()
        ]);

        lojasPorId = new Map(lojas.map(loja => [Number(loja.id), loja]));

        renderizarEntregas(
            "lista-disponiveis",
            disponiveis,
            "disponivel"
        );
        renderizarEntregas(
            "lista-minhas-entregas",
            minhasEntregas,
            "andamento"
        );

        document.getElementById("ultima-atualizacao").textContent =
            `Última atualização: ${new Date().toLocaleTimeString("pt-BR")}`;
    } catch (erro) {
        mostrarMensagem(erro.message || "Erro ao carregar as entregas.", true);
    } finally {
        atualizacaoEmAndamento = false;
        botaoAtualizar.disabled = false;
    }
}

async function buscarLojas() {
    const token = localStorage.getItem("access_token");
    const resposta = await fetch(`${API_URL}/lojas`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!resposta.ok) {
        return [];
    }

    const lojas = await resposta.json();
    return Array.isArray(lojas) ? lojas : [];
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function renderizarEntregas(containerId, pedidos, modo) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        const mensagem = modo === "disponivel"
            ? "Nenhuma entrega disponível no momento."
            : "Você ainda não tem entregas em andamento.";
        container.appendChild(criarElemento("p", "vazio", mensagem));
        return;
    }

    pedidos.forEach(pedido => {
        container.appendChild(criarCartao(pedido, modo));
    });
}

function criarCartao(pedido, modo) {
    const cartao = criarElemento("article", "cartao");
    const loja = lojasPorId.get(Number(pedido.loja_id));
    const nomeLoja = loja?.nome || `Loja #${pedido.loja_id}`;
    const enderecoLoja = loja?.endereco || "Endereço de coleta não informado";

    cartao.appendChild(criarElemento("h3", "", `Pedido #${pedido.id}`));
    cartao.appendChild(criarElemento("span", "status", formatarStatus(pedido.status)));

    cartao.appendChild(criarElemento("p", "", `Estabelecimento: ${nomeLoja}`));

    const coleta = criarElemento("p", "endereco");
    coleta.appendChild(criarElemento("strong", "", "Endereço de retirada: "));
    coleta.appendChild(document.createTextNode(enderecoLoja));
    cartao.appendChild(coleta);

    const entrega = criarElemento("p", "endereco");
    entrega.appendChild(criarElemento("strong", "", "Endereço de entrega: "));
    entrega.appendChild(document.createTextNode(
        pedido.endereco_entrega || "Endereço de entrega não informado"
    ));
    cartao.appendChild(entrega);

    cartao.appendChild(criarElemento(
        "p",
        "",
        `Total do pedido: ${formatarMoeda(pedido.total)}`
    ));

    if (Array.isArray(pedido.itens) && pedido.itens.length > 0) {
        const lista = document.createElement("ul");
        pedido.itens.forEach(item => {
            lista.appendChild(criarElemento(
                "li",
                "",
                `${item.quantidade} × ${item.nome_produto}`
            ));
        });
        cartao.appendChild(lista);
    }

    const botao = criarElemento(
        "button",
        "botao botao-primario",
        modo === "disponivel" ? "Aceitar Entrega" : "Marcar como entregue"
    );
    botao.type = "button";
    botao.addEventListener("click", () => {
        if (modo === "disponivel") {
            executarAcao(pedido.id, "aceitar");
        } else {
            executarAcao(pedido.id, "finalizar");
        }
    });
    cartao.appendChild(botao);

    return cartao;
}

function formatarStatus(status) {
    const nomes = {
        PRONTO_PARA_ENVIO: "Pronto para envio",
        A_CAMINHO: "Em andamento",
        ENTREGUE: "Entregue"
    };
    return nomes[status] || status || "Status desconhecido";
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "Valor indisponível";
    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function executarAcao(pedidoId, acao) {
    if (acaoEmAndamento) return;

    const confirmar = acao === "finalizar"
        ? "Confirmar que este pedido foi entregue ao cliente?"
        : `Deseja aceitar a entrega do pedido #${pedidoId}?`;

    if (!window.confirm(confirmar)) return;

    acaoEmAndamento = true;

    try {
        limparMensagem();

        await requisicaoAPI(`/pedidos/${pedidoId}/${acao}`, {
            method: "PATCH"
        });

        mostrarMensagem(
            acao === "aceitar"
                ? `Pedido #${pedidoId} aceito com sucesso.`
                : `Pedido #${pedidoId} marcado como entregue.`
        );

        await atualizarPainel();
    } catch (erro) {
        mostrarMensagem(erro.message || "Não foi possível concluir a operação.", true);
    } finally {
        acaoEmAndamento = false;
    }
}
