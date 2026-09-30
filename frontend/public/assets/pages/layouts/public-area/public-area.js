document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadNavbarComponent === 'function') {
    loadNavbarComponent('navbar-container');
  }

  // ===== CARRINHO =====
  let qtdCarrinho = parseInt(localStorage.getItem('carrinhoQtd') || '0', 10);

  /** Atualiza o badge do carrinho na navbar.
   * Como a navbar é injetada via fetch (assíncrono), usa MutationObserver
   * para aguardar o elemento #cartCount aparecer no DOM.
   */
  function atualizarBadge() {
    const badge = document.getElementById('cartCount');

    if (badge) {
      badge.textContent = qtdCarrinho;

      // Animação de "bump" a cada incremento
      badge.classList.remove('badge-bump');
      void badge.offsetWidth;
      badge.classList.add('badge-bump');
    }
  }

  /** Adiciona 1 item ao carrinho e persiste no localStorage */
  function adicionarAoCarrinho() {
    qtdCarrinho++;
    localStorage.setItem('carrinhoQtd', qtdCarrinho);
    atualizarBadge();
  }

  // Observa o container da navbar para detectar quando o badge for inserido
  const navbarContainer = document.getElementById('navbar-container');

  if (navbarContainer) {
    const observer = new MutationObserver(() => {
      if (document.getElementById('cartCount')) {
        atualizarBadge();
        observer.disconnect();
      }
    });

    observer.observe(navbarContainer, {
      childList: true,
      subtree: true
    });
  }

  // Delegação de eventos: botões "Adicionar ao carrinho" nos cards
  // (exclui o botão do modal)
  document.querySelectorAll('.btn-add:not(#modal-btn-add)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      adicionarAoCarrinho();

      const original = btn.textContent;
      btn.textContent = '✔ Adicionado!';
      btn.style.background = 'linear-gradient(135deg, #27ae60, #1e8449)';

      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
      }, 1200);
    });
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

  /** Abre o modal preenchendo os dados do card clicado */
  function abrirModal(card) {
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

    modalBtnAdd.textContent = '🛒 Adicionar ao carrinho';
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
  modalBtnAdd.addEventListener('click', () => {
    adicionarAoCarrinho();

    modalBtnAdd.textContent = '✔ Adicionado!';
    modalBtnAdd.style.background = 'linear-gradient(135deg, #27ae60, #1e8449)';

    setTimeout(() => {
      modalBtnAdd.textContent = '🛒 Adicionar ao carrinho';
      modalBtnAdd.style.background = '';
    }, 1200);
  });

  // Clique no card abre o modal (ignora clique no btn-add)
  document.querySelectorAll('.produto-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-add')) return;
      abrirModal(card);
    });
  });

  // Fechar pelo botão X
  btnFechar.addEventListener('click', fecharModal);

  // Fechar clicando no overlay
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModal();
    }
  });

  // Fechar com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('aberto')) {
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

      secoesCategorias.forEach(secao => {
        const produtos = secao.querySelectorAll('.produto-card');
        let encontrouProduto = false;

        produtos.forEach(produto => {
          const nome = normalizarTexto(produto.dataset.nome || '');
          const descricao = normalizarTexto(produto.dataset.desc || '');

          const corresponde =
            termo === '' ||
            nome.includes(termo) ||
            descricao.includes(termo);

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