# 🚀 Guia de Instalação - Sistema de Consulta ERP

Este guia fornece instruções detalhadas para instalar e configurar o Sistema de Consulta ERP em seu computador.

## 📋 Pré-requisitos

### Software Necessário
1. **Node.js** (versão 16 ou superior)
   - Download: https://nodejs.org/
   - Verificar instalação: `node --version`

2. **Banco de dados Firebird** (já configurado)
   - Certifique-se de que o serviço está rodando
   - Tenha as credenciais de acesso

3. **Git** (opcional, para versionamento)
   - Download: https://git-scm.com/

### Informações do Banco
Você precisará das seguintes informações:
- **Host**: Endereço do servidor Firebird (ex: 127.0.0.1)
- **Porta**: Porta do Firebird (padrão: 3050)
- **Caminho do banco**: Localização do arquivo .IB
- **Usuário**: Nome do usuário (ex: CONSULTA)
- **Senha**: Senha do usuário

## 📁 Estrutura de Pastas Recomendada

```
C:\ERP-Sistema\
├── meu-projeto-firebird\     # Pasta principal do projeto
├── logs\                     # Logs do sistema (opcional)
└── backup\                   # Backups (opcional)
```

## ⚙️ Instalação Passo a Passo

### Passo 1: Preparar o Ambiente

1. **Criar pasta do projeto:**
```cmd
mkdir C:\ERP-Sistema
cd C:\ERP-Sistema
```

2. **Extrair os arquivos do projeto** na pasta criada

### Passo 2: Configurar o Backend

1. **Navegar para a pasta do projeto:**
```cmd
cd C:\ERP-Sistema\meu-projeto-firebird
```

2. **Instalar dependências do backend:**
```cmd
npm install
```

3. **Configurar conexão com banco:**
   - Abrir o arquivo `server.js` em um editor de texto
   - Localizar a seção `dbOptions`
   - Ajustar as configurações conforme seu ambiente:

```javascript
const dbOptions = {
  host: '127.0.0.1',           // IP do servidor Firebird
  port: 3050,                  // Porta do Firebird
  database: 'C:\\Ganso\\Dados\\Ganso.IB', // AJUSTAR CAMINHO
  user: 'CONSULTA',            // AJUSTAR USUÁRIO
  password: '90807060'         // AJUSTAR SENHA
};
```

4. **Testar conexão do backend:**
```cmd
node server.js
```
   - Deve aparecer: "Servidor rodando em http://0.0.0.0:3002"
   - Pressione `Ctrl+C` para parar

### Passo 3: Configurar o Frontend

1. **Navegar para a pasta do frontend:**
```cmd
cd frontend-produtos
```

2. **Instalar dependências do frontend:**
```cmd
npm install --legacy-peer-deps
```
   - O parâmetro `--legacy-peer-deps` resolve conflitos de dependências

3. **Testar o frontend:**
   ```cmd
   npm start
   ```
   - A aplicação frontend será iniciada por padrão em `http://localhost:3000`.
   - Ela se comunicará automaticamente com o backend que está rodando na porta 3002, graças à configuração de proxy.

### Passo 4: Verificar Instalação

1. **Iniciar o backend** (em um terminal):
```cmd
cd C:\ERP-Sistema\meu-projeto-firebird
node server.js
```

2. **Iniciar o frontend** (em outro terminal):
```cmd
cd C:\ERP-Sistema\meu-projeto-firebird\frontend-produtos
npm start
```

3. **Acessar o sistema:**
    - Abrir navegador: http://localhost:3002
   - Testar as páginas: Custo de Reposição e Estoque e Fornecedores

## 🔧 Configurações Avançadas

### Alterar Portas (se necessário)

**Backend (server.js):**
```javascript
app.listen(3002, '0.0.0.0', () => {
  // Alterar 3002 para outra porta se necessário
});
```

**Frontend (package.json):**
```json
{
  "scripts": {
    "start": "PORT=3000 react-scripts start"
  }
}
```

### Configurar para Rede Local

Para acessar de outros computadores na rede:

1. **No backend (server.js)**, certifique-se de que está usando `0.0.0.0`:
```javascript
app.listen(3002, '0.0.0.0', () => {
  console.log('Servidor rodando em http://0.0.0.0:3002');
});
```

2. **No frontend**, alterar as URLs da API para o IP do servidor:
```javascript
// Em vez de localhost, usar o IP do servidor
const response = await axios.get('http://192.168.1.100:3002/produtos');
```

## 🚀 Executar em Produção

### Opção 1: Scripts de Inicialização

**Criar arquivo `iniciar-backend.bat`:**
```batch
@echo off
cd /d "C:\ERP-Sistema\meu-projeto-firebird"
echo Iniciando servidor backend...
node server.js
pause
```

**Criar arquivo `iniciar-frontend.bat`:**
```batch
@echo off
cd /d "C:\ERP-Sistema\meu-projeto-firebird\frontend-produtos"
echo Iniciando interface web...
npm start
pause
```

### Opção 2: PM2 (Recomendado para produção)

1. **Instalar PM2:**
```cmd
npm install -g pm2
```

2. **Criar arquivo de configuração `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'erp-backend',
    script: 'server.js',
    cwd: 'C:\\ERP-Sistema\\meu-projeto-firebird',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

3. **Iniciar com PM2:**
```cmd
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🐛 Solução de Problemas Comuns

### Erro: "node não é reconhecido"
- **Solução**: Reinstalar Node.js e reiniciar o terminal

### Erro: "Cannot connect to database"
- **Verificar**: Firebird está rodando
- **Verificar**: Credenciais estão corretas
- **Verificar**: Caminho do banco está correto

### Erro: "Port 3002 already in use"
- **Solução**: Alterar porta no server.js ou parar processo existente

### Erro: "npm install falha"
- **Solução**: Limpar cache do npm:
```cmd
npm cache clean --force
npm install
```

### Frontend não carrega dados
- **Verificar**: Backend está rodando
- **Verificar**: URLs da API estão corretas
- **Verificar**: Firewall não está bloqueando

## 📱 Configurar para Mobile

Para acessar de dispositivos móveis na mesma rede:

1. **Descobrir IP do computador:**
```cmd
ipconfig
```

2. **Acessar pelo celular:**
   - Conectar na mesma rede Wi-Fi
   - Abrir navegador: http://[IP-DO-COMPUTADOR]:3000

## 🔒 Configurações de Segurança

### Firewall Windows
Adicionar exceções para as portas:
- **Porta 3000**: Frontend React
- **Porta 3002**: Backend Node.js

### Antivírus
Adicionar pasta do projeto às exceções se houver problemas.

## 📊 Monitoramento

### Logs do Sistema
Os logs aparecem no terminal. Para salvar em arquivo:

**Windows:**
```cmd
node server.js > logs.txt 2>&1
```

**Verificar uso de recursos:**
- **Memória**: Task Manager → Processos → node.exe
- **CPU**: Monitorar durante uso intenso

## 🆘 Suporte Técnico

### Informações para Suporte
Ao solicitar ajuda, forneça:
1. **Sistema operacional** e versão
2. **Versão do Node.js**: `node --version`
3. **Mensagens de erro** completas
4. **Logs** do terminal
5. **Configurações** do banco de dados (sem senhas)

### Contatos
- **Email**: [seu-email@empresa.com]
- **Telefone**: [seu-telefone]
- **Horário**: Segunda a Sexta, 8h às 18h

---

**Última atualização**: 26/06/2025  
**Versão do guia**: 1.0
