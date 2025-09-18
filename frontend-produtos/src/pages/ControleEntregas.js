import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { debounce } from 'lodash';
import '../styles/common.css';
/* import './ControleEntregas.css';
 */
const ControleEntregas = () => {
    // --- Estados ---
    const [vendas, setVendas] = useState([]);
    const [entregadores, setEntregadores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ codigoCliente: '', dav: '' });
    const [editingData, setEditingData] = useState({});

    // --- Estados de Paginação ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // --- Estados para Busca de DAV ---
    const [termoBuscaDav, setTermoBuscaDav] = useState('');
    const [searchResultsDav, setSearchResultsDav] = useState([]);
    const [isSearchingDav, setIsSearchingDav] = useState(false);

    // --- Busca de Dados ---
    const fetchEntregadores = async () => {
        const token = Cookies.get('token');
        try {
            const response = await axios.get('/api/entregas/entregadores', { headers: { Authorization: `Bearer ${token}` } });
            setEntregadores(response.data || []);
        } catch (err) {
            setError('Não foi possível carregar a lista de entregadores.');
        }
    };

    const fetchVendas = useCallback(async () => {
        setLoading(true);
        setError(null);
        setCurrentPage(1);
        const token = Cookies.get('token');
        const params = new URLSearchParams();
        if (filters.codigoCliente) params.append('codigoCliente', filters.codigoCliente);
        if (filters.dav) params.append('dav', filters.dav);

        try {
            const response = await axios.get(`/api/entregas/vendas?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            const vendasData = response.data.data || [];
            setVendas(vendasData);

            const initialEditingData = {};
            vendasData.forEach(venda => {
                if (venda.entrega) {
                    initialEditingData[venda.CODIGO] = { ...venda.entrega };
                }
            });
            setEditingData(initialEditingData);
        } catch (err) {
            setError('Não foi possível carregar as vendas.');
        } finally {
            setLoading(false);
        }
    }, [filters.codigoCliente, filters.dav]);

    useEffect(() => {
        fetchEntregadores();
        fetchVendas();
    }, [fetchVendas]);

    // --- Lógica de Busca de DAV ---
    const debouncedSearchDav = useRef(
        debounce(async (termo) => {
            if (termo.length < 1) {
                setSearchResultsDav([]);
                return;
            }
            const token = Cookies.get('token');
            setIsSearchingDav(true);
            try {
                const response = await axios.get(`/api/entregas/vendas/search?termo=${termo}`, { headers: { Authorization: `Bearer ${token}` } });
                setSearchResultsDav(response.data || []);
            } catch (error) {
                setSearchResultsDav([]);
            } finally {
                setIsSearchingDav(false);
            }
        }, 500)
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearchDav.cancel();
        };
    }, [debouncedSearchDav]);

    const handleSearchChangeDav = (e) => {
        const termo = e.target.value;
        setTermoBuscaDav(termo);
        debouncedSearchDav(termo);
    };

    const handleSelectDav = (dav) => {
        setFilters(prev => ({ ...prev, dav: dav.CODIGO }));
        setTermoBuscaDav(`${dav.CODIGO} - ${dav.NOME_CLIENTE}`);
        setSearchResultsDav([]);
    };

    // --- Lógica de Paginação ---
    const paginatedVendas = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return vendas.slice(startIndex, startIndex + itemsPerPage);
    }, [vendas, currentPage]);

    const totalPages = Math.ceil(vendas.length / itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // --- Handlers ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (vendaId, field, value) => {
        setEditingData(prev => ({ ...prev, [vendaId]: { ...prev[vendaId], [field]: value } }));
    };

    const handleSave = async (venda) => {
        const token = Cookies.get('token');
        const dataToSave = editingData[venda.CODIGO];
        if (!dataToSave) return alert('Nenhum dado para salvar.');

        try {
            await axios.post('/api/entregas', { vendaId: venda.CODIGO, codigoCliente: venda.CODIGO_CLIENTE, ...dataToSave }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Entrega salva com sucesso!');
            fetchVendas();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erro ao salvar. Tente novamente.';
            setError(errorMsg);
            alert(errorMsg);
        }
    };

    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
            <h2>Controle de Entregas</h2>
            </div>

            <div className="filters-card">
                <h3>Filtros</h3>
                <div className="filters-grid">
                    <div className="form-group">
                        <label htmlFor="codigoCliente">Código do Cliente:</label>
                        <input type="text" id="codigoCliente" name="codigoCliente" value={filters.codigoCliente} onChange={handleFilterChange} placeholder="Digite o código..." />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label htmlFor="dav">Buscar Venda (DAV):</label>
                        <input type="text" id="dav" name="dav" value={termoBuscaDav} onChange={handleSearchChangeDav} placeholder="Digite o DAV..." />
                        {isSearchingDav && <div className="search-loading">Buscando...</div>}
                        {searchResultsDav.length > 0 && (
                            <ul className="search-results">
                                {searchResultsDav.map((venda) => {
                                    const dataCorrigida = venda.DATA_ORCAMENTO
                                        // Corrige o problema da data tratando a string como fuso local
                                        ? new Date(venda.DATA_ORCAMENTO.replace(/-/g, '/')).toLocaleDateString('pt-BR')
                                        : '';
                                    return (
                                        <li key={venda.CODIGO} onClick={() => handleSelectDav(venda)}>
                                            <strong>{venda.CODIGO}</strong> - {venda.NOME_CLIENTE} ({dataCorrigida})
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                <button onClick={fetchVendas} disabled={loading} className="btn btn-primary">Aplicar Filtros</button>
            </div>

            {loading && <p>Carregando...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="erp-summary-card">
                <div className={`erp-card erp-summary-card ${vendas.length >= 0 ? 'positivo' : 'negativo'}`}>Vendas Encontradas<strong>{vendas.length}</strong></div>
                <div className={`erp-card erp-summary-card ${entregadores.length >= 0 ? 'positivo' : 'negativo'}`}>Entregadores Registrados<strong>{entregadores.length}</strong></div>
                <div className={`erp-card erp-summary-card ${totalPages >= 0 ? 'positivo' : 'negativo'}`}>Página<strong>{currentPage} de {totalPages}</strong></div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>DAV</th>
                            <th>Cliente</th>
                            <th>Data</th>
                            <th>Entregador</th>
                            <th>Caixas (Saída)</th>
                            <th>Caixas (Retorno)</th>
                            <th>Conferido Por</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedVendas.map(venda => {
                            // Corrige o problema da data tratando a string como fuso local
                            const dataCorrigida = venda.DATA_ORCAMENTO
                                ? new Date(venda.DATA_ORCAMENTO.replace(/-/g, '/')).toLocaleDateString('pt-BR')
                                : '';

                            return (
                                <tr key={venda.CODIGO}>
                                    <td>{venda.CODIGO}</td>
                                    <td>{venda.NOME_CLIENTE}</td>
                                    <td>{dataCorrigida}</td>
                                    <td>
                                        <select value={editingData[venda.CODIGO]?.entregadorId || ''} onChange={(e) => handleInputChange(venda.CODIGO, 'entregadorId', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {entregadores.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                        </select>
                                    </td>
                                    <td><input type="number" value={editingData[venda.CODIGO]?.caixasSaida || ''} onChange={(e) => handleInputChange(venda.CODIGO, 'caixasSaida', e.target.value)} /></td>
                                    <td><input type="number" value={editingData[venda.CODIGO]?.caixasRetorno || ''} onChange={(e) => handleInputChange(venda.CODIGO, 'caixasRetorno', e.target.value)} /></td>
                                    <td><input type="text" value={editingData[venda.CODIGO]?.conferidoPor || ''} onChange={(e) => handleInputChange(venda.CODIGO, 'conferidoPor', e.target.value)} /></td>
                                    <td><button onClick={() => handleSave(venda)} className="btn-salvar">Salvar</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1}>Primeira</button>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
                <span>Página {currentPage} de {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Próxima</button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>Última</button>
            </div>
        </div>
    );
};

export default ControleEntregas;
