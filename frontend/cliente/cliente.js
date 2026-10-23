const API_URL = "http://127.0.0.1:8000";

// Estado Global da Aplicação do Cliente
let todosProdutos = [];
let todasLojas = [];
let lojaSelecionadaId = null;
let categoriaSelecionada = null;
let termoBusca = "";
let debounceBuscaTimeout = null;
let intervaloMeusPedidos = null;
let pendenteTrocaProduto = null;

// Carrinho de Compras persistido no localStorage
let carrinho = [];
let carrinhoLojaId = null;
let carrinhoLojaNome = null;

// Método de Pagamento selecionado
let metodoPagamento = 'dinheiro';

// Configuração de Frete
const FRETE_CONFIG = {
    GRATIS_ACIMA: 30.00,   // Frete grátis para pedidos acima deste valor
    VALOR_FIXO: 5.00       // Valor fixo quando abaixo do limite
};

// Banco visual de imagens gastronômicas em alta resolução (Unsplash Food)
const IMAGENS_CATEGORIA = {
    hamburguer: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop",
    bebida: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop",
    refrigerante: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop",
    suco: "https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=600&auto=format&fit=crop",
    sobremesa: "https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop",
    doce: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?q=80&w=600&auto=format&fit=crop",
    salgado: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=600&auto=format&fit=crop",
    porcao: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=600&auto=format&fit=crop",
    prato: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop"
};

const STATUS_PEDIDO = {
    PENDENTE:            { label: 'Pendente',   cor: 'bg-amber-100 text-amber-800 border-amber-200',    icone: 'schedule' },
    RECEBIDO:            { label: 'Recebido',   cor: 'bg-slate-100 text-slate-700 border-slate-200',    icone: 'inventory_2' },
    EM_PREPARO:          { label: 'Na cozinha', cor: 'bg-blue-100 text-blue-800 border-blue-200',      icone: 'soup_kitchen' },
    PRONTO_PARA_ENVIO:   { label: 'Na cozinha', cor: 'bg-blue-100 text-blue-800 border-blue-200',      icone: 'soup_kitchen' },
    A_CAMINHO:           { label: 'A caminho',  cor: 'bg-cyan-100 text-cyan-800 border-cyan-200',      icone: 'moped' },
    ENTREGUE:            { label: 'Entregue',   cor: 'bg-emerald-100 text-emerald-800 border-emerald-200', icone: 'done_all' },
    CANCELADO:           { label: 'Cancelado',  cor: 'bg-red-100 text-red-800 border-red-200',         icone: 'cancel' }
};

/* INICIALIZAÇÃO & AUTENTICAÇÃO FLEXÍVEL */
document.addEventListener("DOMContentLoaded", () => {
    configurarSessaoUsuario();
    restaurarCarrinho();
    inicializarBusca();
    carregarLojas();
    carregarProdutos();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            fecharModalProduto();
        }
    });
});

function configurarSessaoUsuario() {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const nome = localStorage.getItem('user_nome');

    const containerLogado = document.getElementById('usuario-logado-container');
    const containerVisitante = document.getElementById('usuario-visitante-container');
    const headerNome = document.getElementById('cliente-nome-header');

    // Se estiver logado como LOJA, redireciona para a tela de loja
    if (token && role === 'LOJA') {
        window.location.href = '../loja/loja.html';
        return;
    }

    if (token) {
        // Usuário logado
        if (containerLogado) {
            containerLogado.classList.remove('hidden');
            containerLogado.classList.add('flex');
        }
        if (containerVisitante) {
            containerVisitante.classList.add('hidden');
        }
        if (headerNome && nome) {
            headerNome.textContent = nome.split(' ')[0];
        }
        buscarPerfilUsuario();
    } else {
        // Visitante não logado (permite navegar pela vitrine sem bloqueios)
        if (containerLogado) {
            containerLogado.classList.add('hidden');
            containerLogado.classList.remove('flex');
        }
        if (containerVisitante) {
            containerVisitante.classList.remove('hidden');
            containerVisitante.classList.add('flex');
        }
    }
}

async function buscarPerfilUsuario() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            if (user.endereco) {
                const inputEnd = document.getElementById('pedido-endereco');
                if (inputEnd && !inputEnd.value) {
                    inputEnd.value = user.endereco;
                }
            }
        }
    } catch (e) {
        console.warn("Perfil não carregado:", e);
    }
}

function realizarLogout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_id');
        localStorage.removeItem('cardapio_carrinho_cliente');
        window.location.href = '../login/index.html';
    }
}

/* BUSCA E FILTROS DINÂMICOS */
function inicializarBusca() {
    const inputDesktop = document.getElementById('input-busca-desktop');
    const inputMobile = document.getElementById('input-busca-mobile');
    const btnLimparDesktop = document.getElementById('btn-limpar-busca-desktop');
    const btnLimparMobile = document.getElementById('btn-limpar-busca-mobile');
    const formDesktop = document.getElementById('form-busca-desktop');
    const formMobile = document.getElementById('form-busca-mobile');

    const handleInput = (e) => {
        termoBusca = e.target.value.trim();

        // Sincroniza ambos os campos de busca
        if (inputDesktop && inputDesktop !== e.target) inputDesktop.value = termoBusca;
        if (inputMobile && inputMobile !== e.target) inputMobile.value = termoBusca;

        if (btnLimparDesktop) btnLimparDesktop.classList.toggle('hidden', !termoBusca);
        if (btnLimparMobile) btnLimparMobile.classList.toggle('hidden', !termoBusca);

        clearTimeout(debounceBuscaTimeout);
        debounceBuscaTimeout = setTimeout(() => {
            aplicarFiltrosEExibir();
        }, 200);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const input = event.target.querySelector('input');
        if (!input || !input.value.trim()) return;
        buscarNaVitrine();
    };

    if (inputDesktop) {
        inputDesktop.addEventListener('input', handleInput);
        inputDesktop.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (!inputDesktop.value.trim()) {
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
                buscarNaVitrine();
            }
        });
    }

    if (inputMobile) {
        inputMobile.addEventListener('input', handleInput);
        inputMobile.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (!inputMobile.value.trim()) {
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
                buscarNaVitrine();
            }
        });
    }

    if (formDesktop) formDesktop.addEventListener('submit', handleSubmit);
    if (formMobile) formMobile.addEventListener('submit', handleSubmit);
}

function buscarNaVitrine() {
    const inputDesktop = document.getElementById('input-busca-desktop');
    const inputMobile = document.getElementById('input-busca-mobile');

    const inputAtivo = document.activeElement && (document.activeElement.id === 'input-busca-desktop' || document.activeElement.id === 'input-busca-mobile')
        ? document.activeElement
        : (inputDesktop && inputDesktop.value.trim() ? inputDesktop : inputMobile);

    if (!inputAtivo || !inputAtivo.value.trim()) {
        return;
    }

    termoBusca = inputAtivo.value.trim();
    if (inputDesktop && inputDesktop !== inputAtivo) inputDesktop.value = termoBusca;
    if (inputMobile && inputMobile !== inputAtivo) inputMobile.value = termoBusca;

    aplicarFiltrosEExibir();

    const vitrine = document.getElementById('vitrine-cardapios');
    if (vitrine) {
        vitrine.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function limparBusca() {
    termoBusca = "";
    const inputDesktop = document.getElementById('input-busca-desktop');
    const inputMobile = document.getElementById('input-busca-mobile');
    const btnLimparDesktop = document.getElementById('btn-limpar-busca-desktop');
    const btnLimparMobile = document.getElementById('btn-limpar-busca-mobile');

    if (inputDesktop) inputDesktop.value = "";
    if (inputMobile) inputMobile.value = "";
    if (btnLimparDesktop) btnLimparDesktop.classList.add('hidden');
    if (btnLimparMobile) btnLimparMobile.classList.add('hidden');

    aplicarFiltrosEExibir();
}

function resetarFiltros() {
    termoBusca = "";
    lojaSelecionadaId = null;
    categoriaSelecionada = null;
    limparBusca();
    atualizarChipsCategorias();
    atualizarSelecaoLojaUI();
    aplicarFiltrosEExibir();
}

/* CONSUMO DA API: ESTABELECIMENTOS (LOJAS)*/
async function carregarLojas() {
    const container = document.getElementById('container-lojas');
    if (!container) return;

    try {
        let res = await fetch(`${API_URL}/lojas`);
        if (!res.ok) {
            res = await fetch(`${API_URL}/produtos/lojas`);
        }
        if (!res.ok) throw new Error('Erro ao buscar estabelecimentos parceiros.');

        todasLojas = await res.json();

        if (todasLojas.length === 0) {
            container.innerHTML = `
                <div class="p-4 rounded-2xl bg-surface-container-low text-xs text-on-surface-variant">
                    Nenhum restaurante parceiro cadastrado no momento.
                </div>`;
            return;
        }

        renderizarLojas(todasLojas);

    } catch (e) {
        console.error("Erro ao carregar lojas:", e);
        container.innerHTML = `
            <div class="p-4 rounded-2xl bg-error-container text-on-error-container text-xs font-semibold">
                Não foi possível listar as lojas parceiras. Verifique a conexão com a API.
            </div>`;
    }
}

function renderizarLojas(lojas) {
    const container = document.getElementById('container-lojas');
    if (!container) return;

    const cardsHtml = lojas.map(loja => {
        const isAtiva = Number(lojaSelecionadaId) === Number(loja.id);
        const borda = isAtiva 
            ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md' 
            : 'border-surface-container-high/60 bg-surface-container-low hover:border-primary/50 hover:bg-surface-container';

        return `
            <div 
                onclick="selecionarLoja(${loja.id}, '${escapeJs(loja.nome)}')" 
                class="min-w-[240px] max-w-[280px] p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 card-animate shrink-0 shadow-xs hover:shadow-md ${borda}">
                <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl">restaurant</span>
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-sm text-on-surface truncate">${escapeHtml(loja.nome)}</h4>
                    <p class="text-[11px] text-on-surface-variant truncate flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-[13px]">location_on</span>
                        ${escapeHtml(loja.endereco || 'Entrega local')}
                    </p>
                    <span class="inline-block mt-1 text-[10px] font-bold text-primary">
                        ${isAtiva ? '● Loja Selecionada' : 'Ver cardápio &rarr;'}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHtml;
}

function selecionarLoja(lojaId, lojaNome = "") {
    if (Number(lojaSelecionadaId) === Number(lojaId)) {
        lojaSelecionadaId = null;
    } else {
        lojaSelecionadaId = lojaId;
    }

    atualizarSelecaoLojaUI(lojaNome);
    aplicarFiltrosEExibir();
}

function atualizarSelecaoLojaUI(lojaNome = "") {
    const btnLimparLoja = document.getElementById('btn-limpar-loja');
    const labelLojaAtiva = document.getElementById('label-loja-ativa');
    const nomeLojaAtiva = document.getElementById('nome-loja-ativa');

    if (lojaSelecionadaId !== null) {
        if (btnLimparLoja) {
            btnLimparLoja.classList.remove('hidden');
            btnLimparLoja.classList.add('inline-flex');
        }
        if (labelLojaAtiva) labelLojaAtiva.classList.remove('hidden');
        if (nomeLojaAtiva) nomeLojaAtiva.textContent = lojaNome || `Loja #${lojaSelecionadaId}`;
    } else {
        if (btnLimparLoja) {
            btnLimparLoja.classList.add('hidden');
            btnLimparLoja.classList.remove('inline-flex');
        }
        if (labelLojaAtiva) labelLojaAtiva.classList.add('hidden');
    }

    renderizarLojas(todasLojas);
}

/* CONSUMO DA API: PRODUTOS (CRITÉRIO: DISPONÍVEL = TRUE) */
async function carregarProdutos() {
    const gridContainer = document.getElementById('grid-produtos');
    const contadorBadge = document.getElementById('contador-produtos');

    try {
        const res = await fetch(`${API_URL}/produtos?apenas_disponiveis=true`);
        if (!res.ok) throw new Error('Erro ao buscar pratos do cardápio.');

        todosProdutos = await res.json();

        // Monta chips de categorias dinamicamente
        montarFiltrosCategorias(todosProdutos);

        // Aplica e exibe na vitrine
        aplicarFiltrosEExibir();

    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div class="col-span-full p-8 text-center bg-error-container text-on-error-container rounded-3xl text-sm font-semibold">
                    Não foi possível conectar à vitrine de produtos. Certifique-se de que o backend está ativo.
                </div>`;
        }
        if (contadorBadge) contadorBadge.textContent = 'Erro';
    }
}

function montarFiltrosCategorias(produtos) {
    const container = document.getElementById('container-categorias');
    if (!container) return;

    const categoriasSet = new Set();
    produtos.forEach(p => {
        if (p.categoria && p.categoria.trim()) {
            categoriasSet.add(p.categoria.trim());
        }
    });

    const categorias = Array.from(categoriasSet).sort();

    let html = `
        <button 
            type="button"
            onclick="selecionarCategoria(null)" 
            data-cat="" 
            class="chip-categoria px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${!categoriaSelecionada ? 'bg-primary text-white shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}">
            <span class="material-symbols-outlined text-[16px]">restaurant</span>
            Todos os Pratos
        </button>
    `;

    categorias.forEach(cat => {
        const isAtiva = categoriaSelecionada && categoriaSelecionada.toLowerCase() === cat.toLowerCase();
        const icone = obterIconeCategoria(cat);

        html += `
            <button 
                type="button"
                onclick="selecionarCategoria('${escapeJs(cat)}')" 
                data-cat="${escapeHtml(cat)}" 
                class="chip-categoria px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${isAtiva ? 'bg-primary text-white shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}">
                <span class="material-symbols-outlined text-[16px]">${icone}</span>
                ${escapeHtml(cat)}
            </button>
        `;
    });

    container.innerHTML = html;
}

function obterIconeCategoria(cat) {
    const c = cat.toLowerCase();
    if (c.includes('burger') || c.includes('lanche')) return 'lunch_dining';
    if (c.includes('pizza')) return 'local_pizza';
    if (c.includes('bebida') || c.includes('refri') || c.includes('suco')) return 'local_bar';
    if (c.includes('sobremesa') || c.includes('doce')) return 'icecream';
    if (c.includes('salgado') || c.includes('pastel') || c.includes('porcao') || c.includes('porções')) return 'bakery_dining';
    return 'fastfood';
}

function selecionarCategoria(categoria) {
    categoriaSelecionada = categoria;
    atualizarChipsCategorias();
    aplicarFiltrosEExibir();
}

function atualizarChipsCategorias() {
    const chips = document.querySelectorAll('.chip-categoria');
    chips.forEach(chip => {
        const cat = chip.getAttribute('data-cat');
        const isAtiva = (!categoriaSelecionada && !cat) || (categoriaSelecionada && cat && cat.toLowerCase() === categoriaSelecionada.toLowerCase());
        
        if (isAtiva) {
            chip.className = "chip-categoria px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer bg-primary text-white shadow-xs";
        } else {
            chip.className = "chip-categoria px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer bg-surface-container hover:bg-surface-container-high text-on-surface";
        }
    });
}

function obterImagemProduto(produto) {
    if (produto.imagem && produto.imagem.startsWith('http')) {
        return produto.imagem;
    }

    const textoCompleto = `${produto.nome} ${produto.categoria} ${produto.descricao || ''}`.toLowerCase();

    for (const [chave, url] of Object.entries(IMAGENS_CATEGORIA)) {
        if (textoCompleto.includes(chave)) {
            return url;
        }
    }

    return IMAGENS_CATEGORIA.prato;
}

/* RENDERIZAÇÃO DA VITRINE E BOTÃO ADICIONAR */
function aplicarFiltrosEExibir() {
    const gridContainer = document.getElementById('grid-produtos');
    const emptyState = document.getElementById('empty-state-produtos');
    const contadorBadge = document.getElementById('contador-produtos');

    if (!gridContainer) return;

    // Critério de aceite: Apenas produtos com disponivel == true
    let produtosFiltrados = todosProdutos.filter(p => p.disponivel === true);

    // Filtro por Loja
    if (lojaSelecionadaId !== null) {
        produtosFiltrados = produtosFiltrados.filter(p => Number(p.loja_id) === Number(lojaSelecionadaId));
    }

    // Filtro por Categoria
    if (categoriaSelecionada) {
        produtosFiltrados = produtosFiltrados.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoriaSelecionada.toLowerCase()
        );
    }

    // Filtro por Busca textual
    if (termoBusca) {
        const buscaLower = termoBusca.toLowerCase();
        produtosFiltrados = produtosFiltrados.filter(p => 
            p.nome.toLowerCase().includes(buscaLower) || 
            (p.descricao && p.descricao.toLowerCase().includes(buscaLower)) ||
            (p.categoria && p.categoria.toLowerCase().includes(buscaLower))
        );
    }

    // Atualiza contador
    if (contadorBadge) {
        contadorBadge.textContent = `${produtosFiltrados.length} ${produtosFiltrados.length === 1 ? 'prato disponível' : 'pratos disponíveis'}`;
    }

    if (produtosFiltrados.length === 0) {
        gridContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    gridContainer.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    gridContainer.innerHTML = produtosFiltrados.map(p => {
        const imagemUrl = obterImagemProduto(p);
        const precoFormatado = Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const lojaNome = p.loja_nome || `Loja #${p.loja_id}`;

        return `
            <div data-produto-card data-produto-id="${p.id}" class="group flex flex-col justify-between rounded-3xl bg-surface-container-low border border-surface-container-high/60 overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300 card-animate cursor-pointer">
                
                <!-- Imagem com Badges -->
                <div class="relative w-full h-48 overflow-hidden bg-surface-container">
                    <img 
                        src="${imagemUrl}" 
                        alt="${escapeHtml(p.nome)}" 
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none"></div>
                    
                    <!-- Badge Categoria -->
                    <span class="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider pointer-events-none">
                        ${escapeHtml(p.categoria)}
                    </span>

                    <!-- Badge Loja -->
                    <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-black/70 backdrop-blur-md text-white/95 flex items-center gap-1 pointer-events-none">
                        <span class="material-symbols-outlined text-[13px] text-primary-fixed">store</span>
                        ${escapeHtml(lojaNome)}
                    </span>
                </div>

                <!-- Informações e Botão Adicionar -->
                <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 class="font-display font-bold text-base text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                            ${escapeHtml(p.nome)}
                        </h3>
                        <p class="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                            ${escapeHtml(p.descricao || 'Receita especial preparada com ingredientes selecionados.')}
                        </p>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-surface-container-high/60">
                        <div>
                            <span class="text-[10px] uppercase font-bold text-on-surface-variant block">Valor</span>
                            <span class="font-display font-extrabold text-lg text-primary">${precoFormatado}</span>
                        </div>

                        <button 
                            type="button"
                            data-acao="adicionar-carrinho"
                            onclick="event.stopPropagation(); adicionarAoCarrinhoPorId(${p.id})" 
                            class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Adicionar ao carrinho">
                            <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                            <span>Adicionar</span>
                        </button>
                    </div>
                </div>

            </div>
        `;
    }).join('');

    gridContainer.querySelectorAll('[data-produto-card]').forEach(card => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('[data-acao="adicionar-carrinho"]')) return;

            const produtoId = Number(card.dataset.produtoId);
            const produto = todosProdutos.find(item => Number(item.id) === produtoId);

            if (produto) {
                abrirModalProduto(produto);
            }
        });
    });
}

function abrirModalProduto(produto) {
    const modal = document.getElementById('modal-produto');
    const conteudo = document.getElementById('modal-produto-conteudo');

    if (!modal || !conteudo || !produto) return;

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            fecharModalProduto();
        }
    });

    const imagemUrl = obterImagemProduto(produto);
    const precoFormatado = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const categoria = produto.categoria || 'Gourmet';
    const descricao = produto.descricao || 'Receita especial preparada com ingredientes selecionados.';
    const lojaNome = produto.loja_nome || `Loja #${produto.loja_id}`;

    conteudo.innerHTML = `
        <div class="overflow-hidden">
            <div class="relative w-full h-56 sm:h-72 bg-surface-container">
                <img src="${imagemUrl}" alt="${escapeHtml(produto.nome)}" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
                <span class="absolute top-4 left-4 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                    ${escapeHtml(categoria)}
                </span>
            </div>

            <div class="p-5 sm:p-6">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-[10px] uppercase font-bold text-on-surface-variant tracking-[0.14em]">${escapeHtml(lojaNome)}</p>
                        <h3 id="modal-produto-titulo" class="font-display font-black text-2xl text-on-surface mt-1 leading-tight">
                            ${escapeHtml(produto.nome)}
                        </h3>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-[10px] uppercase font-bold text-on-surface-variant block">Preço</span>
                        <span class="font-display font-extrabold text-xl text-primary">${precoFormatado}</span>
                    </div>
                </div>

                <div class="mt-5">
                    <h4 class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Descrição</h4>
                    <div class="modal-produto-scroll mt-2">
                        <p class="text-sm leading-relaxed text-on-surface whitespace-pre-line">${escapeHtml(descricao)}</p>
                    </div>
                </div>

                <div class="mt-6 flex flex-col sm:flex-row gap-3">
                    <button type="button" onclick="event.stopPropagation(); adicionarAoCarrinhoPorId(${produto.id}); fecharModalProduto();" class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary hover:bg-primary-container text-white text-sm font-bold shadow-md shadow-primary/20 transition-all cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                        Adicionar ao Carrinho
                    </button>
                    <button type="button" onclick="fecharModalProduto()" class="px-4 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-bold transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalProduto() {
    const modal = document.getElementById('modal-produto');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function adicionarAoCarrinhoPorId(produtoId) {
    const p = todosProdutos.find(item => Number(item.id) === Number(produtoId));
    if (!p) {
        console.warn("Produto não encontrado pelo ID:", produtoId);
        return;
    }
    
    const lojaNome = p.loja_nome || `Loja #${p.loja_id}`;
    const imagemUrl = obterImagemProduto(p);
    
    // Chama a função centralizada que valida a loja e gere o modal se necessário
    adicionarAoCarrinho({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        loja_id: p.loja_id,
        loja_nome: lojaNome,
        categoria: p.categoria,
        imagem: imagemUrl
    });
}

/* CARRINHO DE COMPRAS E PERSISTÊNCIA */
function restaurarCarrinho() {
    try {
        const salvo = localStorage.getItem('cardapio_carrinho_cliente');
        if (salvo) {
            const data = JSON.parse(salvo);
            carrinho = data.itens || [];
            carrinhoLojaId = data.loja_id !== undefined ? data.loja_id : null;
            carrinhoLojaNome = data.loja_nome || null;
        }
    } catch (e) {
        console.warn("Erro ao restaurar carrinho:", e);
        carrinho = [];
    }
    atualizarUIcarrinho();
}

function salvarCarrinhoStorage() {
    try {
        localStorage.setItem('cardapio_carrinho_cliente', JSON.stringify({
            loja_id: carrinhoLojaId,
            loja_nome: carrinhoLojaNome,
            itens: carrinho
        }));
    } catch (e) {
        console.warn("Erro ao salvar carrinho no storage:", e);
    }
    atualizarUIcarrinho();
}

function adicionarAoCarrinho(produto) {
    // Regra: se o carrinho já tiver itens de outra loja, guarda na variável correta e abre o modal
    if (carrinho.length > 0 && carrinhoLojaId !== null && Number(carrinhoLojaId) !== Number(produto.loja_id)) {
        pendenteTrocaProduto = produto;
        abrirModalTrocaLoja();
        return;
    }

    carrinhoLojaId = produto.loja_id;
    carrinhoLojaNome = produto.loja_nome;

    const itemExistente = carrinho.find(item => Number(item.id) === Number(produto.id));
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            categoria: produto.categoria,
            imagem: produto.imagem,
            quantidade: 1
        });
    }

    salvarCarrinhoStorage();
    mostrarToast(`"${produto.nome}" adicionado ao carrinho!`, 'sucesso');
    alternarCarrinho(true);

    // Animação pop no botão do produto
    const botoes = document.querySelectorAll(`[onclick*="adicionarAoCarrinhoPorId(${produto.id})"]`);
    botoes.forEach(btn => {
        btn.classList.remove('btn-adicionado-pop');
        void btn.offsetWidth; // reflow para restartar animação
        btn.classList.add('btn-adicionado-pop');
        btn.addEventListener('animationend', () => btn.classList.remove('btn-adicionado-pop'), { once: true });
    });

    alternarCarrinho(true);
}

function alterarQuantidade(produtoId, delta) {
    const item = carrinho.find(i => Number(i.id) === Number(produtoId));
    if (!item) return;

    item.quantidade += delta;
    if (item.quantidade <= 0) {
        carrinho = carrinho.filter(i => Number(i.id) !== Number(produtoId));
    }

    if (carrinho.length === 0) {
        carrinhoLojaId = null;
        carrinhoLojaNome = null;
    }

    salvarCarrinhoStorage();
}

function removerDoCarrinho(produtoId) {
    const item = carrinho.find(i => Number(i.id) === Number(produtoId));
    const nome = item ? item.nome : 'Item';
    carrinho = carrinho.filter(i => Number(i.id) !== Number(produtoId));
    if (carrinho.length === 0) {
        carrinhoLojaId = null;
        carrinhoLojaNome = null;
    }
    salvarCarrinhoStorage();
    mostrarToast(`"${nome}" removido do carrinho.`, 'exclusao');
}

function limparCarrinhoConfirmado() {
    if (confirm('Deseja realmente esvaziar todos os itens do seu carrinho?')) {
        carrinho = [];
        carrinhoLojaId = null;
        carrinhoLojaNome = null;
        salvarCarrinhoStorage();
        mostrarToast('Carrinho esvaziado com sucesso!', 'sucesso');
    }
}

function confirmarTrocaLoja() {
    console.log("Confirmando troca de loja. Produto pendente:", pendenteTrocaProduto);

    // Esvazia completamente o carrinho atual
    carrinho = [];
    carrinhoLojaId = null;
    carrinhoLojaNome = null;

    // Se existe um produto pendente, injeta ele como o primeiro item da nova loja
    if (pendenteTrocaProduto) {
        carrinhoLojaId = pendenteTrocaProduto.loja_id;
        carrinhoLojaNome = pendenteTrocaProduto.loja_nome || "Nova Loja";
        carrinho.push({
            id: pendenteTrocaProduto.id,
            nome: pendenteTrocaProduto.nome,
            preco: pendenteTrocaProduto.preco,
            categoria: pendenteTrocaProduto.categoria,
            imagem: pendenteTrocaProduto.imagem,
            quantidade: 1
        });
        pendenteTrocaProduto = null;
    }

    salvarCarrinhoStorage();
    atualizarUIcarrinho();
    fecharModalTrocaLoja();
    mostrarToast('Carrinho atualizado para o novo estabelecimento.', 'sucesso');
    alternarCarrinho(true);
}

function atualizarUIcarrinho() {
    const badge = document.getElementById('carrinho-badge');
    const containerItens = document.getElementById('carrinho-itens-container');
    const containerCheckout = document.getElementById('carrinho-checkout-container');
    const infoLoja = document.getElementById('carrinho-loja-info');
    const nomeLoja = document.getElementById('carrinho-loja-nome');
    const subtitulo = document.getElementById('carrinho-subtitulo');
    const subtotalEl = document.getElementById('carrinho-subtotal');
    const totalEl = document.getElementById('carrinho-total');

    const totalItens = carrinho.reduce((acc, curr) => acc + curr.quantidade, 0);
    const subtotalValor = carrinho.reduce((acc, curr) => acc + (curr.preco * curr.quantidade), 0);

    // Atualiza Badge na Barra de Navegação
    if (badge) {
        if (totalItens > 0) {
            badge.textContent = totalItens;
            badge.classList.remove('hidden');
            badge.classList.add('inline-flex', 'pulse-badge');
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('inline-flex', 'pulse-badge');
        }
    }

    if (subtitulo) {
        subtitulo.textContent = `${totalItens} ${totalItens === 1 ? 'item adicionado' : 'itens adicionados'}`;
    }

    if (carrinho.length === 0) {
        if (infoLoja) infoLoja.classList.add('hidden');
        if (containerCheckout) containerCheckout.classList.add('hidden');
        if (containerItens) {
            containerItens.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                    <div class="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-3 text-on-surface-variant/60">
                        <span class="material-symbols-outlined text-3xl">remove_shopping_cart</span>
                    </div>
                    <h4 class="font-display font-bold text-sm text-on-surface mb-1">Seu carrinho está vazio</h4>
                    <p class="text-xs mb-4">Escolha pratos deliciosos na vitrine e monte seu pedido!</p>
                    <button 
                        type="button"
                        onclick="alternarCarrinho(false, true)" 
                        class="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-container transition-all cursor-pointer">
                        Explorar Cardápio
                    </button>
                </div>
            `;
        }
        return;
    }

    if (infoLoja && carrinhoLojaNome) {
        infoLoja.classList.remove('hidden');
        if (nomeLoja) nomeLoja.textContent = carrinhoLojaNome;
    }

    if (containerCheckout) containerCheckout.classList.remove('hidden');

    if (containerItens) {
        containerItens.innerHTML = carrinho.map(item => {
            const precoFormatado = Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const subtotalItem = Number(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            return `
                <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/60 gap-3 card-animate">
                    <img 
                        src="${item.imagem || IMAGENS_CATEGORIA.prato}" 
                        alt="${escapeHtml(item.nome)}" 
                        class="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                        <h5 class="text-xs font-bold text-on-surface truncate">${escapeHtml(item.nome)}</h5>
                        <p class="text-[11px] text-on-surface-variant">${precoFormatado} un.</p>
                        <span class="text-xs font-black text-primary block mt-0.5">${subtotalItem}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button 
                            type="button"
                            onclick="alterarQuantidade(${item.id}, -1)" 
                            class="w-7 h-7 rounded-lg bg-surface border border-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container font-bold text-xs cursor-pointer"
                            title="Diminuir">
                            -
                        </button>
                        <span class="text-xs font-bold w-5 text-center">${item.quantidade}</span>
                        <button 
                            type="button"
                            onclick="alterarQuantidade(${item.id}, 1)" 
                            class="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-container font-bold text-xs cursor-pointer"
                            title="Aumentar">
                            +
                        </button>
                        <button 
                            type="button"
                            onclick="removerDoCarrinho(${item.id})" 
                            class="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 ml-1 cursor-pointer"
                            title="Remover">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Cálculo unificado de subtotal, frete e totais finais
    const valorSubtotalFormatado = subtotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const freteValor = subtotalValor >= FRETE_CONFIG.GRATIS_ACIMA ? 0 : FRETE_CONFIG.VALOR_FIXO;
    const totalFinal = subtotalValor + freteValor;
    const totalFormatado = totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (subtotalEl) subtotalEl.textContent = valorSubtotalFormatado;

    const freteEl = document.getElementById('carrinho-frete');
    if (freteEl) {
        if (freteValor === 0) {
            freteEl.className = 'badge-frete-gratis';
            freteEl.innerHTML = '<span class="material-symbols-outlined text-[11px]">check</span> Grátis';
        } else {
            freteEl.className = 'text-on-surface-variant font-semibold';
            freteEl.textContent = freteValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    if (totalEl) totalEl.textContent = totalFormatado;
}

function irParaVitrineCardapios() {
    const vitrine = document.getElementById('secao-filtros-categoria');
    if (!vitrine) return;

    window.location.hash = '#secao-filtros-categoria';

    requestAnimationFrame(() => {
        const topo = vitrine.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({
            top: topo,
            behavior: 'smooth'
        });

        setTimeout(() => {
            vitrine.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 80);
    });
}

function alternarCarrinho(abrir = null, irParaCardapio = false) {
    const drawer = document.getElementById('drawer-carrinho');
    const painel = document.getElementById('drawer-painel');

    if (!drawer || !painel) return;

    const estaFechado = drawer.classList.contains('hidden');
    const novoEstadoAberto = abrir !== null ? abrir : estaFechado;

    if (novoEstadoAberto) {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');

        setTimeout(() => {
            painel.classList.remove('translate-x-full');
        }, 15);
    } else {
        painel.classList.add('translate-x-full');

        setTimeout(() => {
            drawer.classList.add('hidden');
            drawer.classList.remove('flex');

            if (irParaCardapio) {
                irParaVitrineCardapios();
            }
        }, 250);
    }
}

/* MODAL DE TROCA DE LOJA NO CARRINHO */
function abrirModalTrocaLoja() {
    const modal = document.getElementById('modal-troca-loja');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalTrocaLoja() {
    const modal = document.getElementById('modal-troca-loja');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    pendenteTrocaProduto = null;
}

/* METODO DE PAGAMENTO */
function selecionarPagamento(metodo) {
    metodoPagamento = metodo;
    const chips = document.querySelectorAll('.chip-pagamento');
    chips.forEach(chip => chip.classList.remove('selecionado'));
    const alvo = document.getElementById(`pag-${metodo}`);
    if (alvo) alvo.classList.add('selecionado');

    // Limpa erro de pagamento se houver
    const erroEl = document.getElementById('erro-pagamento');
    if (erroEl) erroEl.classList.add('hidden');
}

/* CALCULO DE FRETE FIXO/DINAMICO */
function calcularFrete(subtotal) {
    if (subtotal <= 0) return 0;
    if (subtotal >= FRETE_CONFIG.GRATIS_ACIMA) return 0;
    return FRETE_CONFIG.VALOR_FIXO;
}

/* FINALIZAR PEDIDO (POST /pedidos) */
async function realizarPedido() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        mostrarToast('Faça login para realizar seu pedido.', 'aviso');
        setTimeout(() => { window.location.href = '../login/index.html'; }, 1500);
        return;
    }

    if (carrinho.length === 0 || !carrinhoLojaId) {
        mostrarToast('Seu carrinho está vazio.', 'aviso');
        return;
    }

    const inputEndereco  = document.getElementById('pedido-endereco');
    const inputObs       = document.getElementById('pedido-observacao');
    const btnConfirmar   = document.getElementById('btn-confirmar-pedido');
    const btnTexto       = document.getElementById('btn-confirmar-texto');
    const btnIcone       = document.getElementById('btn-confirmar-icone');
    const erroEndereco   = document.getElementById('erro-endereco');
    const erroPagamento  = document.getElementById('erro-pagamento');

    const endereco   = inputEndereco ? inputEndereco.value.trim() : '';
    const observacao = inputObs      ? inputObs.value.trim()      : '';

    // -- Validação visual --
    let temErro = false;

    if (!endereco) {
        temErro = true;
        if (inputEndereco) {
            inputEndereco.classList.add('input-erro');
            inputEndereco.addEventListener('input', () => {
                inputEndereco.classList.remove('input-erro');
                if (erroEndereco) erroEndereco.classList.add('hidden');
            }, { once: true });
        }
        if (erroEndereco) erroEndereco.classList.remove('hidden');
        mostrarToast('Informe o endereço de entrega.', 'erro');
    } else {
        if (inputEndereco) inputEndereco.classList.remove('input-erro');
        if (erroEndereco)  erroEndereco.classList.add('hidden');
    }

    if (!metodoPagamento) {
        temErro = true;
        if (erroPagamento) erroPagamento.classList.remove('hidden');
        mostrarToast('Selecione a forma de pagamento.', 'erro');
    } else {
        if (erroPagamento) erroPagamento.classList.add('hidden');
    }

    if (temErro) return;

    // Compõe observação final com o método de pagamento
    const labelPag = { dinheiro: 'Dinheiro', cartao: 'Cartão na entrega', pix: 'Pix' };
    const pagLabel = labelPag[metodoPagamento] || metodoPagamento;
    const obsFinal = observacao
        ? `${observacao} | Pagamento: ${pagLabel}`
        : `Pagamento: ${pagLabel}`;

    const subtotalValor = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const frete = calcularFrete(subtotalValor);

    const payload = {
        loja_id: Number(carrinhoLojaId),
        itens: carrinho.map(item => ({
            produto_id: Number(item.id),
            quantidade: Number(item.quantidade)
        })),
        endereco_entrega: endereco,
        observacao: obsFinal
    };

    // -- Estado de carregamento --
    if (btnConfirmar) btnConfirmar.disabled = true;
    if (btnIcone)  btnIcone.outerHTML = '<span class="btn-spinner" id="btn-confirmar-icone"></span>';
    if (btnTexto)  btnTexto.textContent = 'Processando Pedido...';

    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Não foi possível registrar seu pedido.');
        }

        // -- Sucesso: limpar carrinho --
        carrinho = [];
        carrinhoLojaId = null;
        carrinhoLojaNome = null;
        metodoPagamento = 'dinheiro';
        salvarCarrinhoStorage();
        alternarCarrinho(false);

        abrirModalSucesso(data.id);

    } catch (e) {
        mostrarToast(`Erro: ${e.message}`, 'erro');
    } finally {
        // Restaura botão
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            const spinnerAtual = document.getElementById('btn-confirmar-icone');
            if (spinnerAtual) {
                spinnerAtual.outerHTML = '<span class="material-symbols-outlined text-[20px]" id="btn-confirmar-icone">check_circle</span>';
            }
            if (btnTexto) btnTexto.textContent = 'Confirmar e Realizar Pedido';
        }
    }
}

function abrirModalSucesso(pedidoId) {
    const modal = document.getElementById('modal-sucesso');
    const elId = document.getElementById('sucesso-pedido-id');
    if (!modal) return;

    if (elId) elId.textContent = `#${pedidoId}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalSucesso() {
    const modal = document.getElementById('modal-sucesso');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function fecharModalSucessoEVerPedidos() {
    fecharModalSucesso();
    abrirModalPedidos();
}

/* MEUS PEDIDOS (HISTÓRICO E TEMPO REAL) */
function abrirModalPedidos() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Faça login com sua conta para visualizar seu histórico de pedidos.', 'aviso');
        }
        window.location.href = '../login/index.html';
        return;
    }

    const modal = document.getElementById('modal-pedidos');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    carregarMeusPedidos();

    // Limpa qualquer intervalo preexistente antes de iniciar um novo
    if (intervaloMeusPedidos) {
        clearInterval(intervaloMeusPedidos);
    }

    intervaloMeusPedidos = setInterval(() => {
        carregarMeusPedidos(false);
    }, 5000);
}

function fecharModalPedidos() {
    const modal = document.getElementById('modal-pedidos');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    // Limpeza rigorosa para evitar memory leak
    if (intervaloMeusPedidos) {
        clearInterval(intervaloMeusPedidos);
        intervaloMeusPedidos = null;
    }
}

async function carregarMeusPedidos(mostrarLoading = true) {
    const container = document.getElementById('lista-meus-pedidos');
    const token = localStorage.getItem('access_token');
    if (!container || !token) return;

    if (mostrarLoading && container.children.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-on-surface-variant text-xs">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Buscando seus pedidos...</p>
                </div>`;
    }

    try {
        const res = await fetch(`${API_URL}/pedidos/meus-pedidos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Não foi possível carregar os pedidos.');

        const pedidos = await res.json();

        if (pedidos.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-on-surface-variant">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-50">receipt</span>
                    <h4 class="font-bold text-sm text-on-surface">Nenhum pedido realizado ainda</h4>
                    <p class="text-xs mt-1">Quando você confirmar um pedido, ele aparecerá aqui com acompanhamento em tempo real.</p>
                </div>`;
            return;
        }

        container.innerHTML = pedidos.map(ped => {
            const statusInfo = STATUS_PEDIDO[ped.status] || { label: ped.status, cor: 'bg-slate-100 text-slate-700 border-slate-200', icone: 'info' };
            const dataHora = ped.criado_em ? new Date(ped.criado_em).toLocaleString('pt-BR') : 'Data não informada';
            const totalFormatado = Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const podeCancelar = ped.status === 'PENDENTE' || ped.status === 'RECEBIDO';
            const botaoCancelarHtml = podeCancelar ? `
                <button 
                    type="button"
                    onclick="cancelarPedidoCliente(${ped.id})"
                    class="px-3 py-1.5 rounded-xl bg-error-container/60 hover:bg-error-container text-on-error-container text-xs font-bold transition-all cursor-pointer flex items-center gap-1">
                    <span class="material-symbols-outlined text-[15px]">cancel</span>
                    Cancelar Pedido
                </button>
            ` : '';

            const itensHtml = (ped.itens || []).map(i => `
                <div class="flex justify-between text-xs py-1 border-b border-surface-container-high/40 last:border-none">
                    <span class="text-on-surface font-medium">${i.quantidade}x ${escapeHtml(i.nome_produto)}</span>
                    <span class="text-on-surface-variant">${Number(i.preco_unitario * i.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            `).join('');

            return `
                <div class="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 space-y-3 card-animate">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high pb-3">
                        <div class="flex items-center gap-2">
                            <span class="font-display font-extrabold text-sm sm:text-base text-on-surface">Pedido #${ped.id}</span>
                            <span class="text-xs text-on-surface-variant">&bull; ${dataHora}</span>
                        </div>
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.cor}">
                            <span class="material-symbols-outlined text-[16px]">${statusInfo.icone}</span>
                            ${statusInfo.label}
                        </span>
                    </div>

                    <div class="bg-surface p-3 rounded-xl border border-surface-container-high/40">
                        ${itensHtml || '<p class="text-xs text-on-surface-variant">Itens do pedido</p>'}
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-container-high/60 text-xs">
                        <span class="text-on-surface-variant flex items-center gap-1 truncate max-w-xs">
                            <span class="material-symbols-outlined text-[15px] text-primary">pin_drop</span>
                            ${escapeHtml(ped.endereco_entrega || 'Endereço padrão')}
                        </span>
                        <div class="flex items-center gap-3">
                            ${botaoCancelarHtml}
                            <div class="text-right">
                                <span class="text-on-surface-variant">Total:</span>
                                <strong class="font-display font-black text-sm sm:text-base text-primary ml-1">${totalFormatado}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro ao carregar pedidos:", e);
        container.innerHTML = `
            <div class="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold text-center">
                Erro ao obter histórico de pedidos. Tente novamente mais tarde.
            </div>`;
    }
}

async function cancelarPedidoCliente(pedidoId) {
    if (!confirm(`Deseja realmente cancelar o pedido #${pedidoId}?`)) {
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/cancelar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Não foi possível cancelar o pedido.');
        }

        mostrarToast(`Pedido #${pedidoId} cancelado com sucesso.`, 'aviso');
        carregarMeusPedidos(false); // Atualiza a lista sem mostrar o loading bruto
    } catch (e) {
        mostrarToast(`Erro: ${e.message}`, 'erro');
    }
}

/* UTILITARIOS E REGISTRO GLOBAL */

let toastTimer = null;

function mostrarToast(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-flutuante');
    if (!toast) {
        console.log(`[Toast ${tipo}]:`, mensagem);
        return;
    }

    const tipoNormalizado = (function(t) {
        const str = String(t || 'sucesso').toLowerCase();
        if (str === 'cadastro' || str === 'sucesso') return 'sucesso';
        if (str === 'edicao' || str === 'edição' || str === 'alteracao' || str === 'alteração' || str === 'info') return 'edicao';
        if (str === 'exclusao' || str === 'exclusão' || str === 'erro' || str === 'delete') return 'erro';
        if (str === 'aviso' || str === 'warn' || str === 'warning') return 'aviso';
        return 'sucesso';
    })(tipo);

    const icones = {
        sucesso: '<span class="material-symbols-outlined" style="font-size:18px">check_circle</span>',
        edicao:  '<span class="material-symbols-outlined" style="font-size:18px">edit</span>',
        erro:    '<span class="material-symbols-outlined" style="font-size:18px">error</span>',
        aviso:   '<span class="material-symbols-outlined" style="font-size:18px">warning</span>'
    };

    clearTimeout(toastTimer);
    toast.className = `toast-${tipoNormalizado}`; // limpa classes anteriores
    toast.innerHTML = `${icones[tipoNormalizado] || ''} <span>${escapeHtml(mensagem)}</span>`;

    // Trigga reflow para reiniciar transição se já estava visível
    void toast.offsetWidth;
    toast.classList.add('toast-visivel');

    toastTimer = setTimeout(() => {
        toast.classList.remove('toast-visivel');
    }, 3200);
}

/** Alias de compatibilidade para código legado que chama mostrarAlertaToast */
function mostrarAlertaToast(mensagem, sucesso = false) {
    mostrarToast(mensagem, sucesso ? 'sucesso' : 'erro');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Expõe todas as funções para o escopo global window
window.selecionarLoja = selecionarLoja;
window.selecionarCategoria = selecionarCategoria;
window.limparBusca = limparBusca;
window.resetarFiltros = resetarFiltros;
window.adicionarAoCarrinhoPorId = adicionarAoCarrinhoPorId;
window.alternarCarrinho = alternarCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.removerDoCarrinho = removerDoCarrinho;
window.limparCarrinhoConfirmado = limparCarrinhoConfirmado;
window.realizarPedido = realizarPedido;
window.selecionarPagamento = selecionarPagamento;
window.abrirModalPedidos = abrirModalPedidos;
window.fecharModalPedidos = fecharModalPedidos;
window.abrirModalTrocaLoja = abrirModalTrocaLoja;
window.fecharModalTrocaLoja = fecharModalTrocaLoja;
window.fecharModalSucesso = fecharModalSucesso;
window.fecharModalSucessoEVerPedidos = fecharModalSucessoEVerPedidos;
window.carregarMeusPedidos = carregarMeusPedidos;
window.realizarLogout = realizarLogout;
window.cancelarPedidoCliente = cancelarPedidoCliente;
window.abrirModalTrocaLoja = abrirModalTrocaLoja;
window.confirmarTrocaLoja = confirmarTrocaLoja;

window.addEventListener('beforeunload', () => {
    if (intervaloMeusPedidos) {
        clearInterval(intervaloMeusPedidos);
    }
});