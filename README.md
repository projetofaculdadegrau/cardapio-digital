# Cardápio Digital (Projeto Acadêmico - Faculdade Grau)

[![Licença MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-005571?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Frontend-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## Descrição

Muitas empresas do ramo alimentício atualmente não possuem um site ou sistema oficial para consulta e pedidos. Quando possuem, frequentemente enfrentam instabilidades ou falhas de usabilidade, dificultando a experiência digital dos clientes. 

Este projeto consiste em um sistema web completo de cardápio digital, projetado para conectar **empresas (lojas)**, **entregadores** e **clientes** em um ecossistema intuitivo, rápido, responsivo e totalmente funcional.

---

## Funcionalidades

- **Autenticação e Perfis:** Cadastro e login unificados com suporte a múltiplos papéis (`Cliente`, `Estabelecimento` e `Entregador`).
- **Gestão de Produtos (Loja):** Cadastro, edição, remoção e controle de disponibilidade de pratos em tempo real.
- **Experiência do Cliente:** Visualização interativa do cardápio e filtragem por categorias.
- **Gerenciamento de Pedidos:** Fluxo completo para processamento e acompanhamento de status.

---

## Tecnologias Utilizadas

- **Frontend:** HTML5, JavaScript Moderno (Vanilla JS) e Tailwind CSS (Design System Material 3).
- **Backend:** Python com **FastAPI**, autenticação via tokens JWT.
- **Banco de Dados:** PostgreSQL (orquestrado via Docker).

---

## Manual de Execução

Siga o passo a passo abaixo para rodar o projeto localmente em sua máquina.

### 1. Pré-requisitos
Certifique-se de ter as seguintes ferramentas instaladas:
- [Python](https://www.python.org/) (versão 3.10 ou superior)
- [Docker e Docker Compose](https://www.docker.com/) (para o banco de dados)
- [Git](https://git-scm.com/)
- Extensão **Live Server** (no VS Code) ou similar para servir os arquivos estáticos.

---

### 2. Configuração do Banco de Dados (Docker)
Com o Docker rodando em sua máquina, acesse a raiz do projeto (onde está o arquivo `docker-compose.yml`) e suba o container do PostgreSQL:

```bash
docker compose up -d
```
*(O banco de dados estará ativo na porta padrão configurada).*

---

### 3. Inicialização do Backend (FastAPI)
Abra o terminal na pasta do backend:

```bash
cd backend
```

Crie e ative um ambiente virtual Python:

* **No Windows:**
  ```bash
  python -m venv venv
  venv\Scripts\activate
  ```
* **No Linux / macOS:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

Instale as dependências do projeto:
```bash
pip install -r requirements.txt
```

Inicie o servidor da API com o Uvicorn:
```bash
uvicorn main:app --reload
```
*(O servidor backend rodará em `http://127.0.0.1:8000`)*

---

### 4. Execução do Frontend
Como o projeto utiliza uma arquitetura estática organizada na pasta pública:

1. Abra a pasta do projeto no **Visual Studio Code**.
2. Navegue até a pasta de login (`frontend/login/login.html`).
3. Clique com o botão direito no arquivo HTML e selecione **"Open with Live Server"**.
4. O navegador abrirá automaticamente (geralmente em `http://127.0.0.1:5500`), comunicando-se diretamente com a API na porta `8000`.

---

## Equipe de Desenvolvimento

- **Jr. Silva**
- **Anderson Souza**
- **Marih Andrade**
- **Oseias Araujo**

---

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.