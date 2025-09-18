import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { debounce } from 'lodash';
import '../styles/common.css';
/* import './FinanceiroPage.css'; */

import { formatarMoeda, formatarData } from '../utils/formatters';

const FinanceiroPage = () => {
    // --- Estados de Dados ---
    const [allTitulos, setAllTitulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    // --- Estados de Filtro e Ordenação ---
    const [filtros, setFiltros] = useState({
        dataInicio: '',
        dataFim: '',
        status: 'A', // Inicia mostrando os títulos em Aberto
        empresa: 'TODAS',
        codigoCliente: '',
        apenasComBoleto: false, // Novo estado para o filtro de boleto
    });
    const [sortConfig, setSortConfig] = useState({ key: 'DATA_VENCIMENTO', direction: 'ascending' });

    // --- Estados para a busca de cliente ---
    const [termoBusca, setTermoBusca] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- Estados de Paginação ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(250); // Aumentado para 250

    // --- Debounce para a busca de cliente ---
    const debouncedSearch = useRef(
        debounce(async (termo) => {
            if (termo.length < 2) {
                setSearchResults([]);
                return;
            }

            const token = Cookies.get('token');
            if (!token) return;

            setIsSearching(true);
            try {
                const response = await axios.get(`/api/clientes/search?termo=${termo}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setSearchResults(response.data);
            } catch (error) {
                console.error('Erro ao buscar clientes:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500)
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    // --- Handler para mudança no campo de busca de cliente ---
    const handleSearchChange = (e) => {
        const termo = e.target.value;
        setTermoBusca(termo);
        if (termo === '') {
            setFiltros(prev => ({ ...prev, codigoCliente: '' }));
        }
        debouncedSearch(termo);
    };

    // --- Handler para seleção de cliente nos resultados da busca ---
    const handleSelectClient = (cliente) => {
        setFiltros(prevFiltros => ({
            ...prevFiltros,
            codigoCliente: cliente.CODIGO,
        }));
        setTermoBusca(`${cliente.CODIGO} - ${cliente.NOME}`);
        setSearchResults([]);
    };


    // --- Busca inicial dos dados ---
    const fetchTitulos = useCallback(async () => {
        setLoading(true);
        setErro(null);
        const token = Cookies.get('token');
        if (!token) {
            setErro('Sessão expirada. Faça login novamente.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get('/api/financeiro/titulos', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllTitulos(response.data || []);
        } catch (err) {
            console.error('Erro ao buscar títulos:', err);
            setErro('Falha ao carregar títulos. Verifique a conexão e o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTitulos();
    }, [fetchTitulos]);

    // --- Lógica de Filtragem e Ordenação no Frontend ---
    const titulosFiltrados = useMemo(() => {
        let titulos = [...allTitulos];

        // Filtro por Status
        if (filtros.status) {
            titulos = titulos.filter(t => t.STATUS === filtros.status);
        }

        // Filtro por Empresa (CODIGO_FILIAL)
        if (filtros.empresa !== 'TODAS') {
            const codFilial = parseInt(filtros.empresa, 10);
            titulos = titulos.filter(t => t.CODIGO_FILIAL === codFilial);
        }

        // Filtro por Data de Vencimento
        if (filtros.dataInicio) {
            const dataInicio = new Date(filtros.dataInicio + 'T00:00:00');
            titulos = titulos.filter(t => {
                if (!t.DATA_VENCIMENTO) return false;
                return new Date(t.DATA_VENCIMENTO) >= dataInicio;
            });
        }
        if (filtros.dataFim) {
            const dataFim = new Date(filtros.dataFim + 'T00:00:00');
            titulos = titulos.filter(t => {
                if (!t.DATA_VENCIMENTO) return false;
                return new Date(t.DATA_VENCimento) <= dataFim;
            });
        }

        // Filtro por Cliente
        if (filtros.codigoCliente) {
            titulos = titulos.filter(t => t.CODIGO_CLIENTE === filtros.codigoCliente);
        }

        // Novo Filtro: Apenas com Boleto
        if (filtros.apenasComBoleto) {
            titulos = titulos.filter(t => t.BLOQUETO_NOSSONUMERO != null && t.BLOQUETO_NOSSONUMERO !== '');
        }

        // Lógica de Ordenação
        if (sortConfig.key) {
            titulos.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                // Tratamento para valores nulos ou indefinidos
                if (aValue == null) return 1;
                if (bValue == null) return -1;

                let comparison = 0;

                // Lógica de comparação baseada no tipo de dado da coluna
                switch (sortConfig.key) {
                    case 'DATA_EMISSAO':
                    case 'DATA_VENCIMENTO':
                        comparison = new Date(aValue) - new Date(bValue);
                        break;
                    case 'NOME_CLIENTE':
                    case 'STATUS':
                    case 'OBSERVACAO':
                        comparison = aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' });
                        break;
                    case 'CODIGO_FILIAL':
                        const empresaA = a.CODIGO_FILIAL === 1 ? 'Matriz' : 'Filial';
                        const empresaB = b.CODIGO_FILIAL === 1 ? 'Matriz' : 'Filial';
                        comparison = empresaA.localeCompare(empresaB, 'pt-BR');
                        break;
                    default: // Para colunas numéricas (CODIGO, DAV, VALOR_NOMINAL, etc.)
                        comparison = aValue - bValue;
                        break;
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }

        return titulos;
    }, [allTitulos, filtros, sortConfig]);

    // --- Cálculo dos Totais ---
    const totais = useMemo(() => {
        return titulosFiltrados.reduce((acc, titulo) => {
            acc.totalNominal += titulo.VALOR_NOMINAL || 0;
            acc.totalAberto += titulo.VALOR_ABERTO || 0;
            return acc;
        }, { totalNominal: 0, totalAberto: 0 });
    }, [titulosFiltrados]);

    // --- Lógica de Paginação ---
    const titulosPaginados = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return titulosFiltrados.slice(startIndex, startIndex + itemsPerPage);
    }, [titulosFiltrados, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(titulosFiltrados.length / itemsPerPage);

    // --- Handlers ---
    const handleFiltroChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFiltros(prev => ({ ...prev, [name]: newValue }));
        setCurrentPage(1); // Resetar a página ao aplicar filtro
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Resetar para a primeira página ao ordenar
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleClearFilters = () => {
        setFiltros({
            dataInicio: '',
            dataFim: '',
            status: 'A',
            empresa: 'TODAS',
            codigoCliente: '',
            apenasComBoleto: false,
        });
        setTermoBusca('');
        setCurrentPage(1);
    };

    // --- Renderização ---
    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
                <h2>Títulos a Receber</h2>
                <p>Consulte e filtre os títulos da empresa.</p>
            </div>

            <div className="filters-card">
                <h3>Filtros</h3>
                <div className="filter-grid" style={{ position: 'relative' }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <div className="label-with-tooltip">
                            <label htmlFor="termoBusca">Buscar Cliente:</label>
                            <div className="tooltip">
                                <span className="tooltip-icon">?</span>
                                <span className="tooltip-text">Código, Nome, Razão Social ou CNPJ</span>
                            </div>
                        </div>
                        <input
                            type="text"
                            id="termoBusca"
                            name="termoBusca"
                            value={termoBusca}
                            onChange={handleSearchChange}
                            placeholder="Digite para buscar..."
                        />
                        {isSearching && <div className="search-loading">Buscando...</div>}
                        {searchResults.length > 0 && (
                            <ul className="search-results">
                                {searchResults.map((cliente) => (
                                    <li key={cliente.CODIGO} onClick={() => handleSelectClient(cliente)}>
                                        <strong>{cliente.CODIGO}</strong> - {cliente.NOME} ({cliente.RAZAO_SOCIAL || 'N/A'}) - {cliente.CNPJ || 'N/A'})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="dataInicio">Vencimento (Início)</label>
                        <input type="date" name="dataInicio" id="dataInicio" value={filtros.dataInicio} onChange={handleFiltroChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dataFim">Vencimento (Fim)</label>
                        <input type="date" name="dataFim" id="dataFim" value={filtros.dataFim} onChange={handleFiltroChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select name="status" id="status" value={filtros.status} onChange={handleFiltroChange}>
                            <option value="A">Aberto</option>
                            <option value="P">Pago</option>
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="empresa">Empresa</label>
                        <select name="empresa" id="empresa" value={filtros.empresa} onChange={handleFiltroChange}>
                            <option value="TODAS">Todas</option>
                            <option value="1">Matriz</option>
                            <option value="2">Filial</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="apenasComBoleto"
                                checked={filtros.apenasComBoleto}
                                onChange={handleFiltroChange}
                            />
                            Mostrar apenas com boleto
                        </label>
                    </div>
                </div>
                <div className="actions">
                    <button onClick={handleClearFilters} disabled={loading} className="btn btn-secondary">Limpar Filtros</button>
                </div>
            </div>

            {loading && <p className="loading-message">Carregando títulos...</p>}
            {erro && <div className="error-message"><p>{erro}</p></div>}

            {!loading && !erro && (
                <>
                    <div className="erp-summary-card">
                        <p>{titulosFiltrados.length} títulos encontrados.</p>
                        <div className={`erp-card erp-summary-card ${totais.totalNominal >= 0 ? 'positivo' : 'negativo'}`}>
                            Valor Nominal Total:
                            <strong>{formatarMoeda(totais.totalNominal)}</strong>
                        </div>
                        <div className={`erp-card erp-summary-card ${totais.totalAberto <= 0 ? 'positivo' : 'negativo'}`}>
                            Valor Aberto Total:
                            <strong>{formatarMoeda(totais.totalAberto)}</strong>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('CODIGO')}>Código{getSortIndicator('CODIGO')}</th>
                                    <th onClick={() => requestSort('NOME_CLIENTE')}>Cliente{getSortIndicator('NOME_CLIENTE')}</th>
                                    <th onClick={() => requestSort('DAV')}>DAV{getSortIndicator('DAV')}</th>
                                    <th onClick={() => requestSort('DATA_EMISSAO')}>Emissão{getSortIndicator('DATA_EMISSAO')}</th>
                                    <th onClick={() => requestSort('DATA_VENCIMENTO')}>Vencimento{getSortIndicator('DATA_VENCIMENTO')}</th>
                                    <th onClick={() => requestSort('STATUS')}>Status{getSortIndicator('STATUS')}</th>
                                    <th onClick={() => requestSort('VALOR_NOMINAL')}>Valor Nominal{getSortIndicator('VALOR_NOMINAL')}</th>
                                    <th onClick={() => requestSort('VALOR_ABERTO')}>Valor Aberto{getSortIndicator('VALOR_ABERTO')}</th>
                                    <th onClick={() => requestSort('OBSERVACAO')}>Observação{getSortIndicator('OBSERVACAO')}</th>
                                    <th onClick={() => requestSort('CODIGO_FILIAL')}>Empresa{getSortIndicator('CODIGO_FILIAL')}</th>
                                    <th onClick={() => requestSort('BLOQUETO_NOSSONUMERO')}>Boleto{getSortIndicator('BLOQUETO_NOSSONUMERO')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {titulosPaginados.map(t => (
                                    <tr key={t.CODIGO}>
                                        <td>{t.CODIGO}</td>
                                        <td>{`${t.CODIGO_CLIENTE} - ${t.NOME_CLIENTE}`}</td>
                                        <td>{t.DAV}</td>
                                        <td>{formatarData(t.DATA_EMISSAO)}</td>
                                        <td>{formatarData(t.DATA_VENCIMENTO)}</td>
                                        <td>
                                            <span className={`status ${t.STATUS === 'A' ? 'status-open' : 'status-closed'}`}>
                                                {t.STATUS === 'A' ? 'Aberto' : 'Pago'}
                                            </span>
                                        </td>
                                        <td>{formatarMoeda(t.VALOR_NOMINAL)}</td>
                                        <td>{formatarMoeda(t.VALOR_ABERTO)}</td>
                                        <td>{t.OBSERVACAO}</td>
                                        <td>{t.CODIGO_FILIAL === 1 ? 'Matriz' : 'Filial'}</td>
                                        <td>{t.BLOQUETO_NOSSONUMERO}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="btn">Primeira</button>
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn">Anterior</button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn">Próxima</button>
                        <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="btn">Última</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default FinanceiroPage;