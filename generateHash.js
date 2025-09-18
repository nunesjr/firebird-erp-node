const bcrypt = require('bcryptjs');

const senha = 'admin123'; // nova senha desejada

bcrypt.hash(senha, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hash gerado:', hash);
});
