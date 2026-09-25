const form = document.querySelector('.login');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const btnSubmit = document.querySelector('#btn-submit');
const reqLength = document.querySelector('#req-length');
const reqUppercase = document.querySelector('#req-uppercase');
const reqLowercase = document.querySelector('#req-lowercase');
const reqSpecial = document.querySelector('#req-special');

function validatePassword() {
    const value = password.value;

    // Regras de validação (RegEx)
    const hasMinLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    // Atualiza estado visual de cada item
    toggleRequirement(reqLength, hasMinLength);
    toggleRequirement(reqUppercase, hasUpper);
    toggleRequirement(reqLowercase, hasLower);
    toggleRequirement(reqSpecial, hasSpecial);

    // Habilita o botão se tudo estiver preenchido e válido
    const isPasswordValid = hasMinLength && hasUpper && hasLower && hasSpecial;
    const isEmailValid = email.value.trim() !== '';

    btnSubmit.disabled = !(isPasswordValid && isEmailValid);
}

function toggleRequirement(element, isValid) {
    if (isValid) {
        element.classList.remove('invalid');
        element.classList.add('valid');
    } else {
        element.classList.remove('valid');
        element.classList.add('invalid');
    }
}

// Escuta a digitação nos campos
password.addEventListener('input', validatePassword);
email.addEventListener('input', validatePassword);

form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (email.value === '' || password.value === '') {
        return;
    }

    alert('Login realizado com sucesso!');
});
