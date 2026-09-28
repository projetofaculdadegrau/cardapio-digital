document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadNavbarComponent === 'function') {
    loadNavbarComponent('navbar-container');
  }

  console.log('Página Área Pública carregada com sucesso!');
});