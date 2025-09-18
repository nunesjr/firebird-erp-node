import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import '../styles/common.css';
import './PrecosDeVenda.css'; // Estilo a ser criado
import { formatarMoeda } from '../utils/formatters';

const secoesOptions = {
    1: 'Ativo', 2: 'Brinquedos', 3: 'Combustível', 4: 'Uso e Consumo',
    5: 'Diversos', 6: 'Hortifruti', 7: 'Laticínios', 8: 'Mercearia'
};

const gruposOptions = {
    1: 'Ativo', 2: 'Bebidas', 5: 'Bombonier', 7: 'Brinquedos', 9: 'Combustivel',
    10: 'Condimentos', 11: 'Consumo', 12: 'Folhas', 14: 'Frutas', 15: 'Mercearia',
    19: 'Padaria', 20: 'Picadinhos', 22: 'Sucos', 23: 'Verdura', 25: 'Sorvetes'
};

const PrecosDeVenda = () => {
    const [produtos, setProdutos] = useState([]);
    const [filters, setFilters] = useState({ codigo: '', descricao: '', secao: '', grupo: '', filial: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProdutos = useCallback(async () => {
        setLoading(true);
        setError(null);
        const token = Cookies.get('token');
        const params = new URLSearchParams();

        // Adiciona apenas filtros que não estão vazios
        for (const key in filters) {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        }

        try {
            const response = await axios.get(`/api/produtos/precos?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProdutos(response.data || []);
        } catch (err) {
            setError('Não foi possível carregar os produtos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchProdutos();
    }, [fetchProdutos]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
                <h2>Consulta de Preços de Venda</h2>
            </div>

            <div className="filters-card">
                <h3>Filtros</h3>
                <div className="filters-grid">
                    <div className="form-group">
                        <label>Código do Produto</label>
                        <input type="text" name="codigo" value={filters.codigo} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label>Descrição</label>
                        <input type="text" name="descricao" value={filters.descricao} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label>Filial/Matriz</label>
                        <select name="filial" value={filters.filial} onChange={handleFilterChange}>
                            <option value="">Todas</option>
                            <option value="1">Matriz</option>
                            <option value="2">Filial</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Seção</label>
                        <select name="secao" value={filters.secao} onChange={handleFilterChange}>
                            <option value="">Todas</option>
                            {Object.entries(secoesOptions).map(([cod, desc]) => (
                                <option key={cod} value={cod}>{desc}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Grupo</label>
                        <select name="grupo" value={filters.grupo} onChange={handleFilterChange}>
                            <option value="">Todos</option>
                            {Object.entries(gruposOptions).map(([cod, desc]) => (
                                <option key={cod} value={cod}>{desc}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && <p>Carregando...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="produtos-table-container">
                <table className="produtos-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Filial/Matriz</th>
                            <th>Custo de Reposição</th>
                            <th>Preço de Venda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {produtos.map(produto => (
                            <tr key={`${produto.CODIGO}-${produto.CODIGO_FILIAL}`}>
                                <td>{produto.CODIGO}</td>
                                <td>{produto.DESCRICAO}</td>
                                <td>{produto.CODIGO_FILIAL === 1 ? 'Matriz' : 'Filial'}</td>
                                <td>{formatarMoeda(produto.F_CUSTO_REPOSICAO)}</td>
                                <td>{formatarMoeda(produto.PRECO_VENDA)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PrecosDeVenda;