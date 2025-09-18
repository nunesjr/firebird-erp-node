const firebirdService = require('../services/firebirdService');

const getTitulos = async (req, res, next) => {
    try {
        // A lógica de filtro foi movida para o frontend.
        // O backend agora busca todos os títulos relevantes de uma vez.
        const titulos = await firebirdService.getTitulosFinanceiros();
        
        res.json(titulos);
    } catch (err) {
        // Passa o erro para o middleware de tratamento de erros
        next(err);
    }
};

module.exports = {
    getTitulos
};