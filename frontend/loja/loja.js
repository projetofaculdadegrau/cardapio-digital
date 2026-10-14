const API_URL = "http://127.0.0.1:8000";

// Verifica token e permissões ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const nomeLoja = localStorage.getItem('user_nome');

    if (!token || role !== 'LOJA') {
        alert('Acesso restrito ou sessão expirada. Faça login com uma conta de Estabelecimento.');
        window.location.href = '../login/login.html';
        return;
    }

    if (nomeLoja) {
        document.getElementById('loja-nome-header').textContent = nomeLoja;
    }

    carregarProdutos();
    iniciarMonitoramentoPedidos();
});

function mostrarAlerta(mensagem, sucesso = false) {
    const alerta = document.getElementById('alerta');
    if (!alerta) return;
    alerta.textContent = mensagem;
    alerta.className = `mb-6 p-4 rounded-xl text-xs font-bold text-center card-animate ${sucesso ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container text-on-error-container'}`;
    alerta.classList.remove('hidden');
    setTimeout(() => alerta.classList.add('hidden'), 4000);
}

function realizarLogout() {
    localStorage.clear();
    window.location.href = '../login/login.html';
}

async function carregarProdutos() {
    const listaContainer = document.getElementById('lista-produtos');
    const contadorBadge = document.getElementById('contador-produtos');

    try {
        const response = await fetch(`${API_URL}/produtos/meus-produtos`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao buscar produtos.');

        const produtos = await response.json();
        contadorBadge.textContent = `${produtos.length} ${produtos.length === 1 ? 'item' : 'itens'}`;

        if (produtos.length === 0) {
            listaContainer.innerHTML = `
                <div class="text-center py-12 text-on-surface-variant text-sm">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-40">fastfood</span>
                    <p>Nenhum produto cadastrado no cardápio ainda.</p>
                </div>`;
            return;
        }

        listaContainer.innerHTML = produtos.map(p => `
            <div class="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 card-animate gap-4">
                <div class="flex items-center gap-3.5">
                    <img src="${p.imagem || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop'}" alt="${p.nome}" class="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0"/>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold text-sm text-on-surface">${p.nome}</h4>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${p.disponivel ? 'bg-tertiary-container/30 text-tertiary' : 'bg-error-container text-on-error-container'}">
                                ${p.disponivel ? 'Disponível' : 'Indisponível'}
                            </span>
                        </div>
                        <p class="text-xs text-on-surface-variant line-clamp-1 mt-0.5">${p.descricao || 'Sem descrição'}</p>
                        <span class="font-bold text-xs text-primary mt-1 block">R$ ${Number(p.preco).toFixed(2)} • <span class="text-on-surface-variant font-normal">${p.categoria}</span></span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick='prepararEdicao(${JSON.stringify(p)})' class="p-2 rounded-xl bg-surface hover:bg-surface-container text-on-surface transition-colors" title="Editar">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="alternarDisponibilidade(${p.id}, ${p.disponivel})" class="p-2 rounded-xl bg-surface hover:bg-surface-container text-on-surface transition-colors" title="Alternar Disponibilidade">
                        <span class="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button onclick="deletarProduto(${p.id})" class="p-2 rounded-xl bg-surface hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors" title="Excluir">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

async function salvarProduto(event) {
    event.preventDefault();

    const id = document.getElementById('produto-id').value;
    const payload = {
        nome: document.getElementById('prod-nome').value.trim(),
        descricao: document.getElementById('prod-descricao').value.trim(),
        preco: parseFloat(document.getElementById('prod-preco').value),
        categoria: document.getElementById('prod-categoria').value.trim(),
        imagem: document.getElementById('prod-imagem').value.trim() || null,
        disponivel: document.getElementById('prod-disponivel').checked
    };

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos/`;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Erro ao salvar produto.');

        mostrarAlerta(id ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!', true);
        resetarFormulario();
        carregarProdutos();

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

function prepararEdicao(p) {
    document.getElementById('produto-id').value = p.id;
    document.getElementById('prod-nome').value = p.nome;
    document.getElementById('prod-descricao').value = p.descricao || '';
    document.getElementById('prod-preco').value = p.preco;
    document.getElementById('prod-categoria').value = p.categoria;
    document.getElementById('prod-imagem').value = p.imagem || '';
    document.getElementById('prod-disponivel').checked = p.disponivel;

    document.getElementById('form-titulo').textContent = 'Editar Produto';
    document.getElementById('btn-salvar').innerHTML = `
        <span class="material-symbols-outlined text-[18px]">save</span>
        <span>Salvar Alterações</span>
    `;
    document.getElementById('btn-cancelar-edicao').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetarFormulario() {
    document.getElementById('form-produto').reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('form-titulo').textContent = 'Novo Produto';
    document.getElementById('btn-salvar').innerHTML = `
        <span class="material-symbols-outlined text-[18px]">add_circle</span>
        <span>Cadastrar Produto</span>
    `;
    document.getElementById('btn-cancelar-edicao').classList.add('hidden');
}

async function alternarDisponibilidade(id, atual) {
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ disponivel: !atual })
        });

        if (!response.ok) throw new Error('Erro ao atualizar status.');
        carregarProdutos();
    } catch (error) {
        mostrarAlerta(error.message);
    }
}

async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja remover este produto do cardápio?')) return;

    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao excluir produto.');

        mostrarAlerta('Produto removido com sucesso!', true);
        carregarProdutos();
    } catch (error) {
        mostrarAlerta(error.message);
    }
}

/* =====================================================================
   ESTEIRA DE PEDIDOS EM TEMPO REAL
   ===================================================================== */

// Aparência de cada status (cor do selo + ícone + nome amigável)
const STATUS_CONFIG = {
    PENDENTE:          { label: 'Pendente',   cor: 'bg-amber-100 text-amber-700',     icone: 'schedule' },
    RECEBIDO:          { label: 'Recebido',   cor: 'bg-slate-100 text-slate-700',     icone: 'inventory_2' },
    EM_PREPARO:        { label: 'Em preparo', cor: 'bg-blue-100 text-blue-700',       icone: 'cooking' },
    PRONTO_PARA_ENVIO: { label: 'Pronto',     cor: 'bg-violet-100 text-violet-700',   icone: 'check_circle' },
    A_CAMINHO:         { label: 'A caminho',  cor: 'bg-cyan-100 text-cyan-700',       icone: 'local_shipping' },
    ENTREGUE:          { label: 'Entregue',   cor: 'bg-emerald-100 text-emerald-700', icone: 'done_all' },
    CANCELADO:         { label: 'Cancelado',  cor: 'bg-red-100 text-red-700',         icone: 'cancel' }
};

// O que a LOJA pode fazer em cada status (botões de avançar o pedido)
const ACOES_LOJA = {
    PENDENTE: [
        { texto: 'Aceitar', status: 'EM_PREPARO', estilo: 'bg-primary hover:bg-primary-container text-white', icone: 'restaurant' },
        { texto: 'Recusar', status: 'CANCELADO',  estilo: 'bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant', icone: 'close' }
    ],
    EM_PREPARO: [
        { texto: 'Marcar como pronto', status: 'PRONTO_PARA_ENVIO', estilo: 'bg-primary hover:bg-primary-container text-white', icone: 'check' }
    ],
        PRONTO_PARA_ENVIO: []  // a loja termina em "Pronto"; "A caminho" é fase do entregador
    
};

let ultimoJsonPedidos = null;
let intervaloPedidos = null;

async function carregarPedidos() {
    const container = document.getElementById('lista-pedidos');
    const contador = document.getElementById('contador-pedidos');
    const statusLabel = document.getElementById('status-atualizacao');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/pedidos/loja/recebidos`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar pedidos.');

        const pedidos = await response.json();

        if (statusLabel) {
            statusLabel.textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;
        }

        const jsonAtual = JSON.stringify(pedidos);
        if (jsonAtual === ultimoJsonPedidos) return;
        ultimoJsonPedidos = jsonAtual;

        const ativos = pedidos.filter(p => !['ENTREGUE', 'CANCELADO'].includes(p.status));
        if (contador) contador.textContent = `${ativos.length} ${ativos.length === 1 ? 'ativo' : 'ativos'}`;

        if (pedidos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-on-surface-variant text-sm">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-40">receipt_long</span>
                    <p>Nenhum pedido recebido ainda. Os novos pedidos aparecem aqui automaticamente.</p>
                </div>`;
            return;
        }

        pedidos.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
        container.innerHTML = pedidos.map(montarCardPedido).join('');

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

function montarCardPedido(p) {
    const cfg = STATUS_CONFIG[p.status] || { label: p.status, cor: 'bg-slate-100 text-slate-700', icone: 'help' };
    const acoes = ACOES_LOJA[p.status] || [];

    const itensHtml = (p.itens || []).map(item => `
        <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span><span class="font-bold text-on-surface">${item.quantidade}x</span> ${item.nome_produto}</span>
            <span>R$ ${(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
        </div>
    `).join('');

    const acoesHtml = acoes.length ? `
        <div class="flex items-center gap-2 pt-3 mt-1 border-t border-surface-container-high/60">
            ${acoes.map(a => `
                <button onclick="atualizarStatusPedido(${p.id}, '${a.status}')"
                    class="flex-1 py-2 px-3 rounded-xl ${a.estilo} font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]">
                    <span class="material-symbols-outlined text-[16px]">${a.icone}</span>
                    <span>${a.texto}</span>
                </button>
            `).join('')}
        </div>` : '';

    const hora = p.criado_em
        ? new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';

    return `
        <div class="flex flex-col rounded-2xl bg-surface-container-low border border-surface-container-high/60 p-4 card-animate">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="font-headline-sm font-extrabold text-on-surface">#${p.id}</span>
                    <span class="text-xs text-on-surface-variant">${hora}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${cfg.cor}">
                    <span class="material-symbols-outlined text-[14px]">${cfg.icone}</span>
                    ${cfg.label}
                </span>
            </div>
            <div class="space-y-1.5 mb-3">
                ${itensHtml || '<span class="text-xs text-on-surface-variant">Sem itens</span>'}
            </div>
            ${p.observacao ? `
                <div class="flex items-start gap-1.5 mb-3 p-2 rounded-lg bg-amber-50 text-amber-800 text-xs">
                    <span class="material-symbols-outlined text-[16px]">sticky_note_2</span>
                    <span>${p.observacao}</span>
                </div>` : ''}
            <div class="flex items-center gap-1.5 text-xs text-on-surface-variant mb-2">
                <span class="material-symbols-outlined text-[16px]">location_on</span>
                <span class="line-clamp-1">${p.endereco_entrega || 'Sem endereço'}</span>
            </div>
            <div class="flex items-center justify-between mt-auto pt-2">
                <span class="text-xs text-on-surface-variant">Total</span>
                <span class="font-bold text-sm text-primary">R$ ${Number(p.total).toFixed(2)}</span>
            </div>
            ${acoesHtml}
        </div>`;
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
    if (novoStatus === 'CANCELADO' && !confirm('Tem certeza que deseja recusar/cancelar este pedido?')) return;

    try {
        const response = await fetch(`${API_URL}/pedidos/${pedidoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ status: novoStatus })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Erro ao atualizar o pedido.');

        const label = (STATUS_CONFIG[novoStatus] || {}).label || novoStatus;
        mostrarAlerta(`Pedido #${pedidoId} atualizado para "${label}".`, true);

        ultimoJsonPedidos = null;
        carregarPedidos();

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

function iniciarMonitoramentoPedidos() {
    carregarPedidos();
    if (intervaloPedidos) clearInterval(intervaloPedidos);
    intervaloPedidos = setInterval(carregarPedidos, 15000);
}