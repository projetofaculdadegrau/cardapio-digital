# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]
- Planejamento e desenvolvimento das próximas versões.

## [v0.2.0] - Backend & Banco de Dados
### Adicionado
- **Arquitetura de API RESTful:** Estruturação completa com FastAPI, Uvicorn e Pydantic para validação de dados.
- **Banco de Dados Relacional:** Configuração do PostgreSQL via Docker e mapeamento ORM com SQLAlchemy (`User`, `Product`, `Order`, `OrderItem`).
- **Autenticação & Segurança (JWT):** Endpoints de login (`/auth/login`), cadastro (`/auth/cadastrar`) e perfil (`/auth/me`), com criptografia de senhas (bcrypt) e controle de acesso baseado em funções (`CLIENTE`, `LOJA`, `ENTREGADOR`).
- **Gestão de Cardápio/Produtos:** Rotas completas para criação, edição, exclusão e alternância de disponibilidade de itens por estabelecimento.
- **Esteira de Pedidos em Tempo Real:** Fluxo de criação de pedidos pelo cliente e atualização de status pelas lojas e entregadores.
- **Guardas de Rota (Route Guards):** Verificação automática de token e redirecionamento no frontend (`cliente`, `loja`, `entregador`) prevenindo acessos não autorizados.

### Alterado / Melhorias de UX
- **Refinamento do Fluxo de Status de Pedido (BUG-17):**
  - Quando a loja conclui o preparo, o status interno passa para "Pronto para entrega" (`PRONTO_PARA_ENVIO`).
  - Para o cliente, o status permanece como "Na cozinha" (`EM_PREPARO`) até que o entregador aceite a corrida, momento em que transiciona para "A caminho" (`A_CAMINHO`) para ambos os painéis.

---

## [v0.1.0] - Área Pública (Frontend Estático / Legado)
### Adicionado
- **Estrutura Inicial do Frontend:** Protótipos visuais de interface desenvolvidos de forma isolada, sem integração ou conexão direta com o backend.
- **Telas e Layouts Estáticos:**
  - Vitrine inicial e páginas de navegação pública para visualização de pratos.
  - Estrutura base de componentes visuais utilizando HTML, CSS customizado e utilitários de estilo.
  - Componentes de layout para simulação de navegação e listagem de estabelecimentos parceiros.

---

## Roadmap de Lançamentos

- **v0.3.0** -> Integrações
- **v0.4.0** -> Testes e ajustes
- **v1.0.0** -> Versão final