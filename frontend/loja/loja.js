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
        const response = await fetch(`${API_URL}/produtos/`, {
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