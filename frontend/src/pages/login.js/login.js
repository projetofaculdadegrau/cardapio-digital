const form = document.querySelector('.login');
const email = document.querySelector('#email');
const password = document.querySelector('#password');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (email.value === '' || password.value === '') {
        return;
    }

    alert('Login realizado com sucesso!');
});
