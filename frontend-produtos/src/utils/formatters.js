// formatters.js

export const formatarMoeda = (valor) =>
    valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

export const formatarData = (dataString) => {
    if (!dataString) return 'N/A';
    const data = new Date(dataString);
    // Adiciona o fuso horário para evitar problemas de dia a mais/menos
    const dataCorrigida = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
    return dataCorrigida.toLocaleDateString('pt-BR');
};

export const formatarNumero = (valor) => {
    if (typeof valor !== 'number') return '0,00';
    return valor.toFixed(2).replace('.', ',');
};

const vendedorMap = {
    1: 'TECMIC',
    2: 'SUPORTE',
    3: 'MARCO ANTONIO',
    4: 'FABIANA',
    5: 'CLAUDIA',
    6: 'LUAN',
    7: 'NICHOLAS',
    8: 'TARIK',
    9: 'THAISA',
    10: 'TATIANE',
    11: 'CLEYDER',
    12: 'JOAO',
    13: 'ANTÔNIO CARLOS',
    14: 'DANIELE',
    15: 'FELIPE',
    16: 'EMILLY',
    17: 'JAMILY',
    19: 'THAYS',
    20: 'ANDERSON',
    21: 'KAMILA',
    22: 'PAULO SERGIO',
    23: 'THAIS DOS SANTOS SOUZA',
    24: 'TATYANNE FREITAS',
    25: 'LIVYA',
    26: 'MONALISA ANDRADE SILVA',
    27: 'JAINARA GOMES DA CONCEIÇÃO',
    28: 'MAIARA INGRID SILVA BRITO DEMENEZES',
    29: 'RAFAEL DE BORJA REIS ARAUJO',
};

export const getVendedorName = (codigo) => {
    return vendedorMap[codigo] || `Código ${codigo}`;
};

export const formatarDataParaExibicao = (isoDateString) => {
    if (!isoDateString) return '';
    try {
        const date = new Date(isoDateString + 'T00:00:00');
        if (isNaN(date.getTime())) {
            const parts = isoDateString.split('.');
            if (parts.length === 3) {
                return `${parts[0]}/${parts[1]}/${parts[2]}`;
            }
            return isoDateString;
        }
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        console.warn('Erro ao formatar data para exibição:', isoDateString, error);
        return isoDateString;
    }
};
