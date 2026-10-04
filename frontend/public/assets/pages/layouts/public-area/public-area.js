document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadNavbarComponent === 'function') {
    loadNavbarComponent('navbar-container');
  }

  // ===== CARROSSEL DA HERO SECTION (ROLAGEM LATERAL) =====
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('.dot');
  const totalSlides = 4;
  let currentSlide = 0;
  const slideInterval = 4000; // Tempo de cada slide (4 segundos)

  function showSlide(index) {
    if (!track) return;

    // Desloca o trilho para a esquerda (cada slide ocupa 25% da largura total)
    track.style.transform = `translateX(-${index * 25}%)`;

    // Atualiza os pontos (dots)
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentSlide = index;
  }

  function nextSlide() {
    const nextIndex = (currentSlide + 1) % totalSlides;
    showSlide(nextIndex);
  }

  if (track) {
    let timer = setInterval(nextSlide, slideInterval);

    // Permite trocar ao clicar nas bolinhas
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        clearInterval(timer);
        showSlide(index);
        timer = setInterval(nextSlide, slideInterval);
      });
    });
  }

  // ===== CARRINHO =====

// Carrega os itens do carrinho salvos no navegador
let carrinhoItens = JSON.parse(localStorage.getItem('carrinhoItens') || '[]');

/** Retorna a quantidade total de itens do carrinho */
function obterQuantidadeTotal() {
  return carrinhoItens.reduce((total, item) => total + item.quantidade, 0);
}

/** Atualiza o badge do carrinho na navbar.
 * Como a navbar é injetada via fetch (assíncrono), usa MutationObserver
 * para aguardar o elemento #cartCount aparecer no DOM.
 */
function atualizarBadge() {
  const badge = document.getElementById('cartCount');

  if (badge) {
    badge.textContent = obterQuantidadeTotal();

    // Animação de "bump" a cada incremento
    badge.classList.remove('badge-bump');
    void badge.offsetWidth;
    badge.classList.add('badge-bump');
  }
}

/** Converte o preço exibido no produto para número */
function converterPreco(precoTexto) {
  return Number(
    precoTexto
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  ) || 0;
}

/** Adiciona um produto ao carrinho */
function adicionarAoCarrinho(card) {
  const nome = card?.dataset.nome || 'Produto';
  const precoTexto = card?.dataset.preco || 'R$ 0,00';
  const imagem = card?.dataset.img || '';
  const preco = converterPreco(precoTexto);

  const itemExistente = carrinhoItens.find((item) => item.nome === nome);

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinhoItens.push({
      nome,
      preco,
      imagem,
      quantidade: 1
    });
  }

  localStorage.setItem('carrinhoItens', JSON.stringify(carrinhoItens));

  atualizarBadge();
  renderizarCarrinho();
}

// taxa de entrega fixa (ajuste à vontade)
const TAXA_ENTREGA = 7.00;

// formata número como "R$ 22,90"
function formatarReais(valor) {
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

/** Exibe os itens com botões +/− e remover, e calcula subtotal, taxa e total */
function renderizarCarrinho() {
  const lista = document.getElementById('cartDrawerItems');
  const subtotalElement = document.getElementById('cartSubtotal');
  const taxaEl = document.getElementById('cartTaxa');
  const totalEl = document.getElementById('cartTotal');
  if (!lista) return;

  if (carrinhoItens.length === 0) {
    lista.innerHTML = '<p class="cart-vazio">Seu carrinho está vazio.</p>';
    if (subtotalElement) subtotalElement.textContent = 'R$ 0,00';
    if (taxaEl) taxaEl.textContent = 'R$ 0,00';
    if (totalEl) totalEl.textContent = 'R$ 0,00';
    return;
  }

  let subtotal = 0;
  lista.innerHTML = carrinhoItens.map((item, index) => {
    const totalItem = item.preco * item.quantidade;
    subtotal += totalItem;
    return `
      <div class="cart-drawer-item">
        <div class="cart-item-info">
          <strong>${item.nome}</strong>
          <span class="cart-item-preco">${formatarReais(totalItem)}</span>
        </div>
        <div class="cart-item-controles">
          <button class="cart-qtd-btn" data-acao="menos" data-index="${index}">−</button>
          <span class="cart-qtd">${item.quantidade}</span>
          <button class="cart-qtd-btn" data-acao="mais" data-index="${index}">+</button>
          <button class="cart-remover" data-acao="remover" data-index="${index}">remover</button>
        </div>
      </div>
    `;
  }).join('');

  const taxa = TAXA_ENTREGA;
  const total = subtotal + taxa;
  if (subtotalElement) subtotalElement.textContent = formatarReais(subtotal);
  if (taxaEl) taxaEl.textContent = formatarReais(taxa);
  if (totalEl) totalEl.textContent = formatarReais(total);
}

/** Observa o container da navbar para detectar quando o badge for inserido */
const navbarContainer = document.getElementById('navbar-container');

if (navbarContainer) {
  const observer = new MutationObserver(() => {
    if (document.getElementById('cartCount')) {
      atualizarBadge();
      renderizarCarrinho();
      observer.disconnect();
    }
  });

  observer.observe(navbarContainer, {
    childList: true,
    subtree: true,
  });
}

/** Adiciona os produtos dos cards ao carrinho */
document.querySelectorAll('.btn-add:not(#modal-btn-add)').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    const card = btn.closest('.produto-card');

    if (card) {
      adicionarAoCarrinho(card);
    }

    const original = btn.textContent;
    btn.textContent = '✔ Adicionado!';
    btn.style.background = 'linear-gradient(135deg, #27ae60, #1e8449)';

    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 1200);
  });
});

  /** Cliques nos botões +, − e remover dentro do carrinho (delegação a partir do document, à prova de carregamento tardio) */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cart-drawer-items [data-acao]');
    if (!btn) return;

    const index = Number(btn.dataset.index);
    const item = carrinhoItens[index];
    if (!item) return;

    const acao = btn.dataset.acao;
    if (acao === 'mais') item.quantidade++;
    else if (acao === 'menos') item.quantidade--;
    else if (acao === 'remover') item.quantidade = 0;

    if (item.quantidade <= 0) carrinhoItens.splice(index, 1);

    localStorage.setItem('carrinhoItens', JSON.stringify(carrinhoItens));
    atualizarBadge();
    renderizarCarrinho();
  });
  
    /** Limpar o carrinho inteiro (com confirmação) */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btnLimparCarrinho')) return;
    if (carrinhoItens.length === 0) return;
    if (!confirm('Deseja limpar todo o carrinho?')) return;

    carrinhoItens = [];
    localStorage.setItem('carrinhoItens', JSON.stringify(carrinhoItens));
    atualizarBadge();
    renderizarCarrinho();
  });

  // ===== MODAL DE DETALHES DO PRODUTO =====

  const modal = document.getElementById('produto-modal');
  const modalImg = document.getElementById('modal-img');
  const modalNome = document.getElementById('modal-nome');
  const modalDesc = document.getElementById('modal-desc');
  const modalPreco = document.getElementById('modal-preco');
  const modalBadge = document.getElementById('modal-badge-preco');
  const btnFechar = document.getElementById('modal-fechar-btn');
  const modalBtnAdd = document.getElementById('modal-btn-add');
  let produtoSelecionado = null;

  /** Abre o modal preenchendo os dados do card clicado */
  function abrirModal(card) {
  produtoSelecionado = card;

  const nome = card.dataset.nome || '';
  const desc = card.dataset.desc || '';
  const preco = card.dataset.preco || '';
  const img = card.dataset.img || '';

    modalImg.src = img;
    modalImg.alt = nome;
    modalNome.textContent = nome;
    modalDesc.textContent = desc;
    modalPreco.textContent = preco;
    modalBadge.textContent = preco;

    modalBtnAdd.textContent = 'Adicionar ao carrinho';
    modalBtnAdd.style.background = '';

    modal.classList.add('aberto');
    document.body.style.overflow = 'hidden';
  }

  /** Fecha o modal */
  function fecharModal() {
    modal.classList.remove('aberto');
    document.body.style.overflow = '';
  }

  // Botão "Adicionar ao carrinho" dentro do modal
  if (modalBtnAdd) {
    modalBtnAdd.addEventListener('click', () => {
      adicionarAoCarrinho(produtoSelecionado);

      modalBtnAdd.textContent = '✔ Adicionado!';
      modalBtnAdd.style.background = 'linear-gradient(135deg, #27ae60, #1e8449)';

      setTimeout(() => {
        modalBtnAdd.textContent = 'Adicionar ao carrinho';
        modalBtnAdd.style.background = '';
      }, 1200);
    });
  }

  // Clique no card abre o modal (ignora clique no btn-add)
  document.querySelectorAll('.produto-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-add')) return;
      abrirModal(card);
    });
  });

  // Fechar pelo botão X
  if (btnFechar) btnFechar.addEventListener('click', fecharModal);

  // Fechar clicando no overlay
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModal();
      }
    });
  }

  // Fechar com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('aberto')) {
      fecharModal();
    }
  });

  // ===== BUSCA DE PRODUTOS =====

  const campoBusca = document.getElementById('busca');
  const secoesCategorias = document.querySelectorAll('.categoria-section');

  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  if (campoBusca) {
    campoBusca.addEventListener('input', () => {
      const termo = normalizarTexto(campoBusca.value.trim());

      secoesCategorias.forEach((secao) => {
        const produtos = secao.querySelectorAll('.produto-card');
        let encontrouProduto = false;

        produtos.forEach((produto) => {
          const nome = normalizarTexto(produto.dataset.nome || '');
          const descricao = normalizarTexto(produto.dataset.desc || '');

          const corresponde = termo === '' || nome.includes(termo) || descricao.includes(termo);

          produto.style.display = corresponde ? '' : 'none';

          if (corresponde) {
            encontrouProduto = true;
          }
        });

        secao.style.display = encontrouProduto ? '' : 'none';
      });
    });
  }

  console.log('Página Área Pública carregada com sucesso!');
});
