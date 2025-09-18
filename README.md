# Sistema de Gestão Integrado (ERP)

## 📖 Descrição do Projeto

Este é um sistema de gestão completo, desenvolvido para se conectar a um banco de dados Firebird existente e fornecer uma interface web moderna e responsiva para visualização e gerenciamento de dados críticos do negócio. A aplicação é construída com uma arquitetura robusta usando **Node.js** no backend e **React** no frontend.

O sistema oferece uma gama de funcionalidades que vão desde a análise de custos e vendas até o gerenciamento de usuários e controle de acesso remoto, servindo como uma poderosa ferramenta de apoio à decisão.

---

## ✨ Funcionalidades Principais

*   **🔐 Autenticação e Gerenciamento de Usuários:**
    *   Tela de login segura com autenticação via JSON Web Token (JWT).
    *   Páginas protegidas que só podem ser acessadas por usuários autenticados.
    *   Interface para administradores criarem, editarem e excluírem usuários.

*   **💹 Vendas e Finanças:**
    *   **Resumo de Vendas:** Visualize um resumo detalhado das vendas, com filtros por data e status.
    *   **Tabela de Preços:** Consulte e ajuste tabelas de preço de clientes.
    *   **Custo de Reposição:** Analise o custo de reposição dos produtos.

*   **📦 Estoque e Compras:**
    *   **Pedido de Compras:** Monitore o status de entrega de pedidos feitos a fornecedores.
    *   **Estoque Negativo:** Identifique rapidamente produtos com estoque zerado ou negativo.
    *   **Consulta de Fornecedores:** Acesse informações dos principais fornecedores.

*   **🔧 Ferramentas e Administração:**
    *   **Liberar Acesso RDP:** Painel para liberar o acesso à Área de Trabalho Remota (RDP) para o IP do usuário, com registro de logs.
    *   **Downloads de PDF:** Seção para baixar relatórios e documentos importantes.

---

## 🛠️ Tecnologias Utilizadas

*   **Backend**: Node.js, Express.js, JWT, node-firebird, SQLite
*   **Frontend**: React, React Router, Axios, Chart.js, Leaflet
*   **Banco de Dados**: Firebird (para dados do negócio), SQLite (para gerenciamento de usuários)
*   **Estilização**: CSS moderno com Flexbox, Grid e Design Responsivo.

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
*   Node.js (versão 16 ou superior)
*   Banco de dados Firebird configurado e acessível pela rede.

### 1. Backend
O servidor backend é responsável pela comunicação com os bancos de dados e pela lógica de negócio.

1.  **Navegue até a raiz do projeto:**
    ```bash
    cd c:\meu-projeto-firebird
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    *   Crie um arquivo chamado `.env` na raiz do projeto.
    *   Copie o conteúdo do arquivo `.env.example` e cole no novo arquivo `.env`.
    *   Preencha as variáveis com as informações do seu ambiente, especialmente a conexão com o banco de dados Firebird.

    ```ini
    # c:\meu-projeto-firebird\.env

    # Porta do servidor backend
    PORT=3002

    # Segredo para o JWT (use um valor forte e aleatório)
    JWT_SECRET=seu-segredo-super-secreto-aqui

    # Configurações do Banco de Dados Firebird
    DB_HOST=localhost
    DB_PORT=3050
    DB_USER=SYSDBA
    DB_PASSWORD=masterkey
    DB_PATH=C:\caminho\para\seu\banco.fdb # <-- ATENÇÃO: Altere este caminho

    # URL do frontend para a política de CORS
    CORS_ORIGIN=http://localhost:3000
    ```

4.  **Inicie o servidor:**
    *   Para produção, use `npm start`.
    *   Para desenvolvimento com reinicialização automática, use `npm run dev`.

### 2. Frontend
A aplicação React com a qual os usuários irão interagir.

1.  **Em um novo terminal, navegue até a pasta do frontend:**
    ```bash
    cd c:\meu-projeto-firebird\frontend-produtos
    ```

2.  **Instale as dependências:**
    ```bash
    npm install --legacy-peer-deps
    ```
    *Observação: A flag `--legacy-peer-deps` é usada para contornar possíveis conflitos de versão entre as dependências.*

3.  **Inicie a aplicação de desenvolvimento:**
    ```bash
    npm start
    ```
    A aplicação React estará disponível em `http://localhost:3000` e se comunicará com o backend na porta 3002.

---

## 📜 Scripts Disponíveis

### Backend (`package.json`)
*   `npm start`: Inicia o servidor em modo de produção.
*   `npm run dev`: Inicia o servidor em modo de desenvolvimento com `nodemon`, que reinicia o servidor automaticamente após alterações nos arquivos.

### Frontend (`frontend-produtos/package.json`)
*   `npm start`: Inicia o ambiente de desenvolvimento do React.
*   `npm run build`: Gera uma versão de produção otimizada da aplicação na pasta `build`.
*   `npm test`: Executa os testes automatizados.
*   `npm run eject`: Expõe as configurações do `react-scripts` (ação irreversível).

---

## 🚀 Implantação em Produção (Deployment)

### 1. Frontend
Para produção, você deve gerar os arquivos estáticos da aplicação React.

```bash
# Navegue até a pasta do frontend
cd c:\meu-projeto-firebird\frontend-produtos

# Execute o script de build
npm run build
```
A pasta `build` conterá todos os arquivos estáticos do seu frontend. Você pode servir esta pasta com um servidor web como Nginx ou Apache.

### 2. Backend
Para o backend em produção, é altamente recomendável usar um gerenciador de processos como o **PM2**, que mantém o servidor online e reinicia em caso de falhas.

1.  **Instale o PM2 globalmente:**
    ```bash
    npm install -g pm2
    ```

2.  **Inicie o servidor com PM2:**
    ```bash
    # Navegue até a raiz do projeto
    cd c:\meu-projeto-firebird

    # Inicie o servidor com um nome customizado
    pm2 start server.js --name "erp-backend"
    ```

3.  **Comandos úteis do PM2:**
    *   `pm2 list`: Lista todos os processos gerenciados pelo PM2.
    *   `pm2 stop erp-backend`: Para o servidor.
    *   `pm2 restart erp-backend`: Reinicia o servidor.
    *   `pm2 logs erp-backend`: Exibe os logs em tempo real.
    *   `pm2 startup`: Configura o PM2 para iniciar com o sistema operacional.
    *   `pm2 save`: Salva a lista de processos atual.

---

## 📝 Melhorias Futuras
- [ ] Implementar um dashboard com gráficos e indicadores de performance (KPIs).
- [ ] Adicionar um sistema de notificações em tempo real.
- [ ] Criar um sistema de cache para as consultas mais frequentes ao banco Firebird.
- [ ] Expandir os relatórios em PDF com mais opções de customização.
- [ ] Adicionar testes automatizados para garantir a estabilidade do código.

---

**Versão**: 3.1  
**Última atualização**: 16/09/2025