import React, { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import '../styles/common.css';
import './MeusTitulos.css';

// Função para formatar a data de YYYY-MM-DD para DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

function MeusTitulos() {
    const [titulos, setTitulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'DATA_VENCIMENTO', direction: 'ascending' });

    useEffect(() => {
        const fetchTitulos = async () => {
            try {
                const token = Cookies.get('token');
                const response = await fetch('/api/cliente/meus-titulos', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error('Falha ao buscar títulos.');
                }

                const result = await response.json();
                setTitulos(result.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTitulos();
    }, []);

    const sortedTitulos = useMemo(() => {
        let sortableItems = [...titulos];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [titulos, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return null;
    };

    if (loading) {
        return <div className="meus-titulos-container"><p>Carregando títulos...</p></div>;
    }

    if (error) {
        return <div className="meus-titulos-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="meus-titulos-container">
            <h2>Meus Títulos em Aberto</h2>
            {sortedTitulos.length > 0 ? (
                <table className="titulos-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('DAV')}>
                                Cód. Venda{getSortIndicator('DAV')}
                            </th>
                            <th onClick={() => requestSort('DATA_VENCIMENTO')}>
                                Vencimento{getSortIndicator('DATA_VENCIMENTO')}
                            </th>
                            <th onClick={() => requestSort('DATA_EMISSAO')}>
                                Emissão{getSortIndicator('DATA_EMISSAO')}
                            </th>
                            <th onClick={() => requestSort('VALOR_ABERTO')}>
                                Valor Aberto{getSortIndicator('VALOR_ABERTO')}
                            </th>
                            <th onClick={() => requestSort('OBSERVACAO')}>
                                Observação{getSortIndicator('OBSERVACAO')}
                            </th>
                            <th onClick={() => requestSort('BLOQUETO_NOSSONUMERO')}>
                                Nosso Número (Boleto){getSortIndicator('BLOQUETO_NOSSONUMERO')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTitulos.map((titulo) => (
                            <tr key={titulo.CODIGO}>
                                <td>{titulo.DAV}</td>
                                <td>{formatDate(titulo.DATA_VENCIMENTO)}</td>
                                <td>{formatDate(titulo.DATA_EMISSAO)}</td>
                                <td>{`R$ ${titulo.VALOR_ABERTO.toFixed(2)}`}</td>
                                <td>{titulo.OBSERVACAO}</td>
                                <td>{titulo.BLOQUETO_NOSSONUMERO}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Nenhum título em aberto encontrado.</p>
            )}
        </div>
    );
}

export default MeusTitulos;