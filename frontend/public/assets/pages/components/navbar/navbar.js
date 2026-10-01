/* Inicializa a lógica e os eventos do Navbar, Popover e Modal */
function initNavbar() {
  const toggleBtn = document.getElementById('navbarToggle');
  const navbarContent = document.getElementById('navbarContent');

  // Elementos do Popover de Login
  const btnLoginTrigger = document.getElementById('btnLoginTrigger');
  const loginPopover = document.getElementById('loginPopover');
  const loginForm = document.getElementById('navbarLoginForm');

  // Elementos do Olho (Mostrar/Ocultar Senha)
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const navPasswordInput = document.getElementById('navPassword');

  // Elementos do Modal de Recuperação
  const btnForgotPassword = document.getElementById('btnForgotPassword');
  const recoveryModal = document.getElementById('recoveryModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryFeedback = document.getElementById('recoveryFeedback');

  // 1. Alterna Menu Mobile
  if (toggleBtn && navbarContent) {
    toggleBtn.addEventListener('click', () => {
      navbarContent.classList.toggle('active');
    });
  }

  // 2. Alterna o Popover de Login
  if (btnLoginTrigger && loginPopover) {
    btnLoginTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = loginPopover.classList.contains('show');

      loginPopover.classList.toggle('show');
      btnLoginTrigger.classList.toggle('active');
      btnLoginTrigger.setAttribute('aria-expanded', !isOpen);
    });

    // Impede o fechamento ao clicar dentro do próprio popover
    loginPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Fechar popover ao clicar fora ou apertar Esc
    document.addEventListener('click', () => {
      loginPopover.classList.remove('show');
      btnLoginTrigger.classList.remove('active');
      btnLoginTrigger.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        loginPopover.classList.remove('show');
        btnLoginTrigger.classList.remove('active');
        btnLoginTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 3. Alternar visibilidade da Senha (Ver / Ocultar)
  if (btnTogglePassword && navPasswordInput) {
    btnTogglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = navPasswordInput.type === 'password';
      navPasswordInput.type = isPassword ? 'text' : 'password';

      // Altera o estilo para dar feedback visual do estado
      btnTogglePassword.style.opacity = isPassword ? '1' : '0.6';
    });
  }

  // 4. Abrir Modal de Recuperação de Senha
  if (btnForgotPassword && recoveryModal) {
    btnForgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginPopover) loginPopover.classList.remove('show');
      recoveryModal.classList.add('active');
    });
  }

  // 5. Fechar Modal no botão 'X'
  if (btnCloseModal && recoveryModal) {
    btnCloseModal.addEventListener('click', () => {
      recoveryModal.classList.remove('active');
      if (recoveryFeedback) recoveryFeedback.style.display = 'none';
    });
  }

  // 6. Fechar Modal ao clicar no fundo escuro (overlay)
  if (recoveryModal) {
    recoveryModal.addEventListener('click', (e) => {
      if (e.target === recoveryModal) {
        recoveryModal.classList.remove('active');
        if (recoveryFeedback) recoveryFeedback.style.display = 'none';
      }
    });
  }

  // 7. Envio do Formulário de Recuperação de Senha
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('recoveryEmail').value;

      if (recoveryFeedback) {
        recoveryFeedback.textContent = `Instruções enviadas para ${email}!`;
        recoveryFeedback.className = 'recovery-feedback success';

        setTimeout(() => {
          recoveryForm.reset();
          recoveryFeedback.style.display = 'none';
          recoveryModal.classList.remove('active');
        }, 2500);
      }
    });
  }

  // 8. Envio do Formulário de Login Popover
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('navEmail').value;
      const password = document.getElementById('navPassword').value;

      console.log('Login solicitado:', { email, password });
      alert(`Login efetuado com sucesso para: ${email}`);

      if (loginPopover) loginPopover.classList.remove('show');
    });
  }
}

/** Carrega o componente Navbar via Fetch usando o caminho original do seu projeto */
async function loadNavbarComponent(containerId = 'navbar-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Caminho exato indicado pelo servidor do projeto
  const navbarPath = '/public/assets/pages/components/navbar/navbar.html';

  try {
    const response = await fetch(navbarPath);
    if (response.ok) {
      const htmlContent = await response.text();
      container.innerHTML = htmlContent;
      initNavbar();
    } else {
      console.error(`Erro ao carregar ${navbarPath}:`, response.statusText);
    }
  } catch (err) {
    console.error(`Falha na requisição de ${navbarPath}:`, err);
  }
}


// Executa o carregamento assim que a página estiver pronta
document.addEventListener('DOMContentLoaded', () => {
  loadNavbarComponent();
});
