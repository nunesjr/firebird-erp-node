// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa a aplicação Express configurada de src/app.js
const app = require('./src/app');

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`⚡ Servidor rodando em http://${HOST}:${PORT}`);
  console.log('✅ Usando a configuração de app a partir de src/app.js');
});
