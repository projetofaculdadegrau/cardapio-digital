/* Inicializa os comportamentos interativos do Navbar */
function initNavbar() {
  const toggleBtn = document.getElementById('navbarToggle');
  const navbarContent = document.getElementById('navbarContent');
  const loginForm = document.getElementById('navbarLoginForm');

  // Alterna o menu mobile
  if (toggleBtn && navbarContent) {
    toggleBtn.addEventListener('click', () => {
      navbarContent.classList.toggle('active');
    });
  }

  // Manipulação da tentativa de Login rápida
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('navEmail').value;
      const password = document.getElementById('navPassword').value;

      console.log('Tentativa de login via Navbar:', { email, password });
      
      // Aqui integra o chamado da API/Backend
      alert(`Login iniciado para: ${email}`);
    });
  }
}

/** Função utilitária para carregar o componente Navbar via fetch
@param {string} containerId - ID do elemento onde a navbar será renderizada */

async function loadNavbarComponent(containerId = 'navbar-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch('../../components/navbar/navbar.html');
    if (!response.ok) {
      throw new Error(`Erro ao carregar o Navbar: ${response.status}`);
    }

    const htmlContent = await response.text();
    container.innerHTML = htmlContent;

    initNavbar();
  } catch (error) {
    console.error('Falha ao renderizar o componente Navbar:', error);
  }
}

/* Inicializa a lógica e os eventos do Navbar e Modal */
function initNavbar() {
  const toggleBtn = document.getElementById('navbarToggle');
  const navbarContent = document.getElementById('navbarContent');
  const loginForm = document.getElementById('navbarLoginForm');

  // Elementos do Modal de Recuperação
  const btnForgotPassword = document.getElementById('btnForgotPassword');
  const recoveryModal = document.getElementById('recoveryModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryFeedback = document.getElementById('recoveryFeedback');

  // Alterna Menu Mobile
  if (toggleBtn && navbarContent) {
    toggleBtn.addEventListener('click', () => {
      navbarContent.classList.toggle('active');
    });
  }

  // Abrir Modal de Recuperação
  if (btnForgotPassword && recoveryModal) {
    btnForgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      recoveryModal.classList.add('active');
    });
  }

  // Fechar Modal no botão 'X'
  if (btnCloseModal && recoveryModal) {
    btnCloseModal.addEventListener('click', () => {
      recoveryModal.classList.remove('active');
      if (recoveryFeedback) recoveryFeedback.style.display = 'none';
    });
  }

  // Fechar Modal ao clicar fora da caixa branca
  if (recoveryModal) {
    recoveryModal.addEventListener('click', (e) => {
      if (e.target === recoveryModal) {
        recoveryModal.classList.remove('active');
        if (recoveryFeedback) recoveryFeedback.style.display = 'none';
      }
    });
  }

  // Processar envio da recuperação de senha
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('recoveryEmail').value;

      console.log('Solicitação de redefinição para:', email);

      // Feedback para o usuário
      if (recoveryFeedback) {
        recoveryFeedback.textContent = `Instruções enviadas para ${email}!`;
        recoveryFeedback.className = 'recovery-feedback success';
        
        // Limpa o campo e fecha o modal após 2.5s
        setTimeout(() => {
          recoveryForm.reset();
          recoveryFeedback.style.display = 'none';
          recoveryModal.classList.remove('active');
        }, 2500);
      }
    });
  }

  // Evento do formulário de login padrão
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('navEmail').value;
      const password = document.getElementById('navPassword').value;
      console.log('Login:', { email, password });
      alert(`Tentativa de login enviada para: ${email}`);
    });
  }
}