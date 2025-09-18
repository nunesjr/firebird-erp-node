const fs = require('fs');
const path = 'C:\\Ganso\\Dados\\Ganso.IB'; // Altere aqui se o caminho estiver diferente

fs.access(path, fs.constants.F_OK | fs.constants.R_OK, (err) => {
  if (err) {
    console.error(`❌ Não foi possível acessar o arquivo: ${err.message}`);
  } else {
    console.log('✅ Arquivo existe e pode ser lido. Conexão com o Firebird deve funcionar.');
  }
});
