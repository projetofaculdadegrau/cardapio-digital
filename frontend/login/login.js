const API_URL = "http://127.0.0.1:8000";

function mudarAba(aba) {
    const fLogin = document.getElementById('form-login');
    const fCadastro = document.getElementById('form-cadastro');
    const btnNavLogin = document.getElementById('nav-btn-login');
    const btnNavCadastro = document.getElementById('nav-btn-cadastro');
    
    const cardTag = document.getElementById('card-tag');
    const cardTitle = document.getElementById('card-title');
    const cardSubtitle = document.getElementById('card-subtitle');
    const footerTexto = document.getElementById('footer-texto');
    const cardCard = document.getElementById('auth-card');

    esconderAlerta();

    if (cardCard) {
        cardCard.classList.remove('card-animate');
        void cardCard.offsetWidth; // Força reflow para reiniciar animação
        cardCard.classList.add('card-animate');
    }

    if (aba === 'login') {
        fLogin.classList.remove('hidden');
        fCadastro.classList.add('hidden');

        if (cardTag) cardTag.textContent = "Acesso ao Sistema";
        if (cardTitle) cardTitle.textContent = "Bom ter você de volta!";
        if (cardSubtitle) cardSubtitle.textContent = "Entre na sua conta e continue de onde parou.";
        if (footerTexto) footerTexto.innerHTML = `Ainda não tem uma conta? <button type="button" onclick="mudarAba('cadastro')" class="font-bold text-primary hover:underline ml-1 cursor-pointer">Criar conta</button>`;

        if (btnNavLogin && btnNavCadastro) {
            btnNavLogin.className = "px-4 py-2 transition-colors bg-primary text-on-primary font-bold rounded-xl text-sm shadow-sm";
            btnNavCadastro.className = "px-4 py-2 rounded-xl text-on-surface-variant font-label-md text-sm hover:bg-surface-container-high hover:text-on-surface transition-colors";
        }
    } else {
        fLogin.classList.add('hidden');
        fCadastro.classList.remove('hidden');

        if (cardTag) cardTag.textContent = "Registro de Usuário";
        if (cardTitle) cardTitle.textContent = "Crie sua conta";
        if (cardSubtitle) cardSubtitle.textContent = "Tudo pronto para facilitar seus pedidos ou gestão.";
        if (footerTexto) footerTexto.innerHTML = `Já tem uma conta? <button type="button" onclick="mudarAba('login')" class="font-bold text-primary hover:underline ml-1 cursor-pointer">Entrar</button>`;

        if (btnNavLogin && btnNavCadastro) {
            btnNavCadastro.className = "px-4 py-2 transition-colors bg-primary text-on-primary font-bold rounded-xl text-sm shadow-sm";
            btnNavLogin.className = "px-4 py-2 rounded-xl text-on-surface-variant font-label-md text-sm hover:bg-surface-container-high hover:text-on-surface transition-colors";
        }
    }
}

function alternarVisibilidadeSenha(inputId, iconId) {
    const pwdInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    if (!pwdInput || !eyeIcon) return;

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
    } else {
        pwdInput.type = 'password';
        eyeIcon.textContent = 'visibility';
    }
}

function mostrarAlerta(mensagem, tipoOuSucesso = false) {
    let tipo = 'erro';
    if (tipoOuSucesso === true || tipoOuSucesso === 'sucesso' || tipoOuSucesso === 'cadastro') {
        tipo = 'sucesso';
    } else if (tipoOuSucesso === 'edicao' || tipoOuSucesso === 'alteracao' || tipoOuSucesso === 'info') {
        tipo = 'edicao';
    } else if (tipoOuSucesso === 'exclusao') {
        tipo = 'exclusao';
    } else if (tipoOuSucesso === 'aviso') {
        tipo = 'aviso';
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast(mensagem, tipo);
    }

    const alerta = document.getElementById('alerta');
    if (!alerta) return;
    alerta.textContent = mensagem;
    const isSuccess = tipo === 'sucesso';
    alerta.className = `mb-4 p-3 rounded-xl text-xs font-bold text-center card-animate ${isSuccess ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container text-on-error-container'}`;
    alerta.classList.remove('hidden');
}

function esconderAlerta() {
    const alerta = document.getElementById('alerta');
    if (alerta) alerta.classList.add('hidden');
}

async function realizarLogin(event) {
    event.preventDefault();
    esconderAlerta();

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Erro ao realizar login.');

        let userRole = null;
        let userNome = email;
        let userId = '';

        if (data.user && data.user.role) {
            userRole = typeof data.user.role === 'object' ? (data.user.role.value || data.user.role.name) : data.user.role;
            userNome = data.user.nome || userNome;
            userId = data.user.id || '';
        } 
        
        if (!userRole && data.access_token) {
            try {
                const payloadBase64 = data.access_token.split('.')[1];
                const decodedPayload = JSON.parse(atob(payloadBase64));
                userRole = decodedPayload.role;
            } catch (e) {
                console.error("Erro no token JWT:", e);
            }
        }

        userRole = userRole ? String(userRole).toUpperCase() : 'CLIENTE';

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', userRole);
        localStorage.setItem('user_nome', userNome);
        localStorage.setItem('user_id', userId);

        mostrarAlerta(`Acesso autorizado (${userRole})! Redirecionando...`, true);

        setTimeout(() => {
            if (userRole === 'LOJA') {
                window.location.assign('../loja/index.html');
            } else if (userRole === 'CLIENTE') {
                window.location.assign('../cliente/index.html');
            } else if (userRole === 'ENTREGADOR') {
    window.location.assign('../entregador/index.html');
}
        }, 800);

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

async function realizarCadastro(event) {
    event.preventDefault();
    esconderAlerta();

    const telInput = document.getElementById('cad-telefone');
    if (telInput) {
        const numerosTel = telInput.value.replace(/\D/g, "");
        if (numerosTel.length > 0 && numerosTel.length !== 10 && numerosTel.length !== 11) {
            telInput.setCustomValidity("Digite um telefone válido com DDD: 10 dígitos para fixo ou 11 para celular.");
            telInput.reportValidity();
            return;
        } else {
            telInput.setCustomValidity("");
        }
    }

    const roleSelect = document.getElementById('cad-role');
    const selectedRole = roleSelect.options[roleSelect.selectedIndex].value;

    const payload = {
        nome: document.getElementById('cad-nome').value.trim(),
        email: document.getElementById('cad-email').value.trim(),
        senha: document.getElementById('cad-senha').value,
        role: selectedRole,
        telefone: document.getElementById('cad-telefone').value.replace(/\D/g, "") || null,
        endereco: document.getElementById('cad-endereco').value.trim() || null
    };

    try {
        const response = await fetch(`${API_URL}/auth/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Erro ao cadastrar conta.');

        mostrarAlerta(`Conta de ${data.role || selectedRole} criada com sucesso! Faça login.`, true);
        document.getElementById('form-cadastro').reset();
        
        setTimeout(() => {
            mudarAba('login');
            document.getElementById('login-email').value = payload.email;
        }, 1500);

    } catch (error) {
        mostrarAlerta(error.message);
    }
}

// Formata o telefone conforme a quantidade de números
function formatarTelefone(valor) {
  const numeros = valor
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length === 0) {
    return "";
  }

  if (numeros.length <= 2) {
    return `(${numeros}`;
  }

  const ddd = numeros.slice(0, 2);
  const numero = numeros.slice(2);

  // Até 10 dígitos: telefone fixo
  if (numeros.length <= 10) {
    if (numero.length <= 4) {
      return `(${ddd}) ${numero}`;
    }

    return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
  }

  // 11 dígitos: celular
  return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
}

// Retorna a posição do cursor após determinada quantidade de dígitos
function posicaoDoCursor(valor, quantidade) {
  if (quantidade === 0) {
    return 0;
  }

  let contagem = 0;

  for (let i = 0; i < valor.length; i++) {
    if (/\d/.test(valor[i])) {
      contagem++;
    }

    if (contagem === quantidade) {
      return i + 1;
    }
  }

  return valor.length;
}

function inicializarFormatacaoTelefone() {
  const telefone = document.getElementById("cad-telefone");
  const formulario = document.getElementById("form-cadastro");

  if (!telefone || !formulario) return;

  // Formata automaticamente ao digitar ou colar
  telefone.addEventListener("input", function () {
    telefone.setCustomValidity("");

    const cursor = telefone.selectionStart ?? telefone.value.length;

    const digitosAntesDoCursor = telefone.value
      .slice(0, cursor)
      .replace(/\D/g, "")
      .length;

    telefone.value = formatarTelefone(telefone.value);

    const novaPosicao = posicaoDoCursor(
      telefone.value,
      Math.min(
        digitosAntesDoCursor,
        telefone.value.replace(/\D/g, "").length
      )
    );

    telefone.setSelectionRange(novaPosicao, novaPosicao);
  });

  // Valida se o telefone está completo ao enviar o formulário (se informado)
  formulario.addEventListener("submit", function (event) {
    const numeros = telefone.value.replace(/\D/g, "");

    if (numeros.length > 0 && numeros.length !== 10 && numeros.length !== 11) {
      event.preventDefault();

      telefone.setCustomValidity(
        "Digite um telefone válido com DDD: 10 dígitos para fixo ou 11 para celular."
      );

      telefone.reportValidity();
    } else {
      telefone.setCustomValidity("");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
    mudarAba('login');
    inicializarFormatacaoTelefone();
});