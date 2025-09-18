import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '../context/AuthContext'; // Importar useAuth
import '../styles/common.css';
import './MinhasCompras.css'; // Importando o CSS específico

// --- Componente para os Itens da Compra (Tabela Aninhada) ---
const ItensCompra = ({ orcamentoCodigo }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const token = Cookies.get('token');
                const response = await fetch(`/api/cliente/minhas-compras/${orcamentoCodigo}`,
                 {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Falha ao carregar itens.');
                const data = await response.json();
                setItems(data.items || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [orcamentoCodigo]);

    if (loading) return <tr><td colSpan="5">Carregando itens...</td></tr>;
    if (error) return <tr><td colSpan="5" style={{ color: 'red' }}>{error}</td></tr>;

    return (
        <td colSpan="4">
            <div style={{ padding: '15px', backgroundColor: '#f9f9f9' }}>
                <h4>Itens do Pedido</h4>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Qtd.</th>
                            <th>Valor Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.SEQUENCIA}>
                                <td>{item.PAF_DESCRICAO_PRODUTO}</td>
                                <td>{item.QUANTIDADE}</td>
                                <td className="currency-mc">{item.PRECO_UNITARIO.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="currency-mc">{item.VALOR_TOTAL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </td>
    );
};

// --- Componente Principal da Página ---
function MinhasCompras() {
    const { usuario } = useAuth(); // Destruturar usuario do useAuth
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        if (!usuario) {
            setLoading(false);
            return;
        }
        const fetchCompras = async () => {
            try {
                const token = Cookies.get('token');
                if (!token) {
                    setError('Token de autenticação não encontrado.');
                    setLoading(false);
                    return;
                }
                const response = await fetch('/api/cliente/minhas-compras', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Falha ao carregar histórico.');
                const data = await response.json();
                setCompras(data.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCompras();
    }, [usuario]);

    const toggleRow = (codigo) => {
        setExpandedRow(expandedRow === codigo ? null : codigo);
    };

    if (loading) return <p>Carregando histórico de compras...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        console.log('Rendering MinhasCompras'), // Debug log
        <div className="page-container">
            <h2>Meu Histórico de Compras</h2>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nº Pedido</th>
                            <th>Data</th>
                            <th>Valor Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compras.map(compra => (
                            <React.Fragment key={compra.CODIGO}>
                                <tr onClick={() => toggleRow(compra.CODIGO)} style={{ cursor: 'pointer' }}>
                                    <td>{compra.CODIGO}</td>
                                    <td>{new Date(compra.DATA_ORCAMENTO).toLocaleDateString('pt-BR')}</td>
                                    <td className="currency-mc">{compra.ORCAMENTO_LIQUIDO.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td>{compra.STATUS}</td>
                                </tr>
                                {expandedRow === compra.CODIGO && (
                                    <tr>
                                        <ItensCompra orcamentoCodigo={compra.CODIGO} />
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MinhasCompras;