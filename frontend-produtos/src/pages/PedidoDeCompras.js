import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { debounce } from 'lodash';
import '../styles/common.css';

import { formatarDataParaExibicao, formatarMoeda, formatarNumero } from '../utils/formatters';

const PedidoDeCompras = () => {
    // --- Estados para Dados e Carregamento ---
    const [entregas, setEntregas] = useState([]);
    const [datasHeader, setDatasHeader] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [erro, setErro] = useState(null);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

    // --- Estados para Filtros ---
    const [filters, setFilters] = useState({
        dataInicio: '',
        dataFim: '',
        codigoCliente: '',
        situacaoEntrega: 'AR'
    });
    const [termoBusca, setTermoBusca] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);


    // --- Estado para a Ordenação ---
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc', or null

    // --- Estados para o Detalhe Expansível ---
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [expandedDetails, setExpandedDetails] = useState([]);

    // --- Lógica de Ordenação e Cálculo da Quantidade Total ---
    const entregasOrdenadas = useMemo(() => {
        if (entregas.length === 0) {
            return [];
        }

        // Primeiro, calcule os totais para cada item
        const entregasComTotal = entregas.map(item => {
            const totalQuantidade = Object.values(item.quantidadesPorData).reduce((sum, current) => sum + current, 0);
            const fracaoCompra = Number(item.FRACAO_COMPRA3) || 1; // Evita divisão por zero
            const totalCaixas = totalQuantidade / fracaoCompra;
            const custoTotal = (item.F_CUSTO_REPOSICAO || 0) * totalQuantidade;

            return { ...item, totalQuantidade, totalCaixas, custoTotal };
        });

        // Em seguida, ordene o array se a direção de ordenação estiver definida
        if (!sortDirection) {
            return entregasComTotal;
        }
        const sortedData = [...entregasComTotal];
        sortedData.sort((a, b) => {
            const descA = a.PAF_DESCRICAO_PRODUTO.toUpperCase();
            const descB = b.PAF_DESCRICAO_PRODUTO.toUpperCase();

            if (descA < descB) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (descA > descB) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortedData;
    }, [entregas, sortDirection]);

    // --- Cálculo dos Totais Gerais ---
    const totaisGerais = useMemo(() => {
        if (entregasOrdenadas.length === 0) {
            return { totalCaixas: 0, custoTotal: 0 };
        }

        return entregasOrdenadas.reduce((acc, item) => {
            acc.totalCaixas += item.totalCaixas || 0;
            acc.custoTotal += item.custoTotal || 0;
            return acc;
        }, { totalCaixas: 0, custoTotal: 0 });
    }, [entregasOrdenadas]);

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
        }, 500) // 500ms delay
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleSearchChange = (e) => {
        const termo = e.target.value;
        setTermoBusca(termo);
        setFilters(prev => ({ ...prev, codigoCliente: '' }));
        debouncedSearch(termo);
    };

    const handleSelectClient = (cliente) => {
        setFilters(prev => ({ ...prev, codigoCliente: cliente.CODIGO }));
        setTermoBusca(`${cliente.CODIGO} - ${cliente.NOME}`);
        setSearchResults([]);
    };

    // --- Função para buscar os detalhes do pedido do backend ---
    const fetchProductDetails = useCallback(async (codigoProduto) => {
        setLoadingDetails(true);
        setErro(null);

        const token = Cookies.get('token');
        try {
            const response = await axios.get(`http://varejaofdt.ddns.net/api/pedido-detalhes`, {
                params: {
                    codigoProduto: codigoProduto,
                    dataInicio: filters.dataInicio,
                    dataFim: filters.dataFim,
                    codigoCliente: filters.codigoCliente,
                    situacaoEntrega: filters.situacaoEntrega
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setExpandedDetails(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes do produto:', error);
            setErro('Erro ao carregar detalhes. Tente novamente.');
            setExpandedDetails([]);
        } finally {
            setLoadingDetails(false);
        }
    }, [filters]);

    // --- Função para buscar as entregas no backend ---
    const fetchEntregas = useCallback(async () => {
        setLoading(true);
        setErro(null);
        setPesquisaRealizada(false);
        setEntregas([]);
        setDatasHeader([]);
        setDatasHeader([]);
        setExpandedProduct(null); // Reseta expansão
        setExpandedDetails([]); // Reseta detalhes

        const token = Cookies.get('token');
        if (!token) {
            setErro('Usuário não autenticado. Faça login para continuar.');
            setLoading(false);
            return;
        }

        if (!filters.dataInicio || !filters.dataFim) {
            setErro('Por favor, selecione as datas de início e fim.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`http://varejaofdt.ddns.net/api/pedido-compras`, {
                params: {
                    dataInicio: filters.dataInicio,
                    dataFim: filters.dataFim,
                    codigoCliente: filters.codigoCliente,
                    situacaoEntrega: filters.situacaoEntrega
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setEntregas(response.data.data || []);
            setDatasHeader(response.data.datas || []);
            setPesquisaRealizada(true);
        } catch (error) {
            console.error('Erro ao buscar entregas futuras:', error);
            if (error.response && error.response.data && error.response.data.error) {
                setErro(`Erro ao carregar entregas: ${error.response.data.error}`);
            } else {
                setErro('Erro ao carregar entregas. Verifique o servidor e sua conexão.');
            }
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // --- Handlers de Interação ---
    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value,
        }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({
            dataInicio: '',
            dataFim: '',
            codigoCliente: '',
            situacaoEntrega: 'AR'
        });
        setTermoBusca('');
        setEntregas([]);
        setDatasHeader([]);
        setPesquisaRealizada(false);
        setErro(null);
        setSortDirection('asc');
        setExpandedProduct(null);
        setExpandedDetails([]);
    }, []);

    // Função para exportar para CSV usando ponto e vírgula, compatível com Excel
    const handleExportToExcel = useCallback(() => {
        if (entregasOrdenadas.length === 0) {
            return;
        }

        // ✨ ATUALIZAÇÃO: Cabeçalhos para o CSV com as novas colunas
        const headers = [
            'Cód. Produto', 'Descrição Produto', 'Custo',
            ...datasHeader.map(data => formatarDataParaExibicao(data)),
            'Total Qtd', 'Qtd. por Caixa', 'Total Caixas', 'Custo Total'
        ];

        const csvContent = [
            headers.join(';'),
            ...entregasOrdenadas.map(item => {
                const rowData = [
                    item.CODIGO_PRODUTO,
                    `"${item.PAF_DESCRICAO_PRODUTO.replace(/"/g, '""')}"`, // Corrigido para escapar aspas duplas dentro de uma string entre aspas duplas
                    formatarMoeda(item.F_CUSTO_REPOSICAO).replace('R$', '').trim(), // Custo formatado sem R$
                    ...datasHeader.map(data => formatarNumero(item.quantidadesPorData[data] || 0)),
                    formatarNumero(item.totalQuantidade),
                    formatarNumero(item.FRACAO_COMPRA3),
                    formatarNumero(item.totalCaixas),
                    formatarMoeda(item.custoTotal).replace('R$', '').trim() // Custo Total formatado sem R$
                ];
                return rowData.join(';');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'entregas_futuras.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [entregasOrdenadas, datasHeader]);

    // Handler para alternar a ordenação
    const handleSort = () => {
        setSortDirection(prev => {
            if (prev === 'asc') return 'desc';
            if (prev === 'desc') return null;
            return 'asc';
        });
    };

    // Handler para expandir/colapsar a linha
    const handleToggleExpand = (codigoProduto) => {
        if (expandedProduct === codigoProduto) {
            setExpandedProduct(null);
            setExpandedDetails([]);
        } else {
            setExpandedProduct(codigoProduto);
            fetchProductDetails(codigoProduto);
        }
    };

    // --- Renderização do Componente (JSX) ---
    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
                <h2>Entregas Futuras</h2>
                <p>Visualize as entregas futuras por produto e por data, e expanda para ver os detalhes do pedido.</p>
            </div>

            <div className="filters-card">
                <h3>Filtros</h3>
                <div className="filters-grid">
                    <div className="form-group">
                        <label htmlFor="dataInicio">Data de Início:</label>
                        <input
                            type="date"
                            id="dataInicio"
                            name="dataInicio"
                            value={filters.dataInicio}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dataFim">Data de Fim:</label>
                        <input
                            type="date"
                            id="dataFim"
                            name="dataFim"
                            value={filters.dataFim}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <div class="label-with-tooltip">
                            <label htmlFor="codigoCliente">Buscar Cliente:</label>
                            <div class="tooltip">
                                <span class="tooltip-icon">?</span>
                                <span class="tooltip-text">Código, Nome, Razão Social ou CNPJ</span>
                            </div>
                        </div>
                        <input
                            type="text"
                            id="codigoCliente"
                            name="codigoCliente"
                            value={termoBusca}
                            onChange={handleSearchChange}
                            placeholder="Digite para buscar..."
                        />
                        {isSearching && <div className="search-loading">Buscando...</div>}
                        {searchResults.length > 0 && (
                            <ul className="search-results">
                                {searchResults.map((cliente) => (
                                    <li key={cliente.CODIGO} onClick={() => handleSelectClient(cliente)}>
                                        <strong>{cliente.CODIGO}</strong> - {cliente.NOME} ({cliente.RAZAO_SOCIAL || 'N/A'}) - {cliente.CNPJ || 'N/A'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="situacaoEntrega">Situação de Entrega:</label>
                        <select
                            id="situacaoEntrega"
                            name="situacaoEntrega"
                            value={filters.situacaoEntrega}
                            onChange={handleFilterChange}
                        >
                            <option value="AR">AR (Aguardando Rota)</option>
                            <option value="AE">AE (À Entregar)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="actions">
                <button onClick={fetchEntregas} disabled={loading} className="btn btn-primary"> {loading ? 'Buscando...' : 'Buscar Entregas'}</button>
                <button onClick={handleClearFilters} disabled={loading} className="btn btn-secondary">Limpar Filtros</button>
                {entregas.length > 0 && (
                    <button onClick={handleExportToExcel} disabled={loading} className="btn btn-secondary">Exportar para Excel</button>
                )}
            </div>

            {loading && (
                <div className="loading-message">
                    <p>Carregando entregas...</p>
                </div>
            )}
            {erro && (
                <div className="error-message">
                    <p>{erro}</p>
                </div>
            )}

            {pesquisaRealizada && !loading && (
                <div className="results-container">
                    {entregas.length === 0 ? (
                        <p className="no-results-message">Nenhuma entrega futura encontrada para o período selecionado.</p>
                    ) : (
                        <div className="table-container">
                            <table className="deliveries-table-pc">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Cód. Produto</th>
                                        <th onClick={handleSort} style={{ cursor: 'pointer' }}>
                                            Descrição
                                            {sortDirection && (
                                                <span style={{ marginLeft: '5px' }}>
                                                    {sortDirection === 'asc' ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </th>
                                        <th>Custo Reposição</th>
                                        {datasHeader.map((data, index) => (
                                            <th key={index}>{formatarDataParaExibicao(data)}</th>
                                        ))}
                                        <th>Total Qtd</th>
                                        <th>Qtd por Caixa</th>
                                        <th>Total Caixas</th>
                                        <th>Custo Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entregasOrdenadas.map((item) => (
                                        <React.Fragment key={item.CODIGO_PRODUTO}>
                                            <tr onClick={() => handleToggleExpand(item.CODIGO_PRODUTO)} style={{ cursor: 'pointer' }}>
                                                <td>
                                                    <span style={{ fontSize: '1.2rem' }}>
                                                        {expandedProduct === item.CODIGO_PRODUTO ? '▼' : '▶'}
                                                    </span>
                                                </td>
                                                <td>{item.CODIGO_PRODUTO}</td>
                                                <td>{item.PAF_DESCRICAO_PRODUTO}</td>
                                                <td>{formatarMoeda(item.F_CUSTO_REPOSICAO)}</td>
                                                {datasHeader.map((data, dataIndex) => (
                                                    <td key={dataIndex}>{formatarNumero(item.quantidadesPorData[data] || 0)}</td>
                                                ))}
                                                <td>{formatarNumero(item.totalQuantidade)}</td>
                                                <td>{formatarNumero(item.FRACAO_COMPRA3)}</td>
                                                <td>{formatarNumero(item.totalCaixas)}</td>
                                                <td>{formatarMoeda(item.custoTotal)}</td>
                                            </tr>
                                            {expandedProduct === item.CODIGO_PRODUTO && (
                                                <tr>
                                                    <td colSpan={datasHeader.length + 7}>
                                                        {loadingDetails ? (
                                                            <div className="loading-message">Carregando detalhes...</div>
                                                        ) : expandedDetails.length > 0 ? (
                                                            <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
                                                                <table className="deliveries-table-pc">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Número do Pedido</th>
                                                                            <th>Cliente</th>
                                                                            <th>Quantidade</th>
                                                                            <th>Custo</th>
                                                                            <th>Valor Unitário</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {expandedDetails.map((detail, detailIndex) => (
                                                                            <tr key={detailIndex}>
                                                                                <td>{detail.CODIGO_ORCAMENTO}</td>
                                                                                <td>{detail.NOME_CLIENTE}</td>
                                                                                <td>{formatarNumero(Number(detail.QUANTIDADE))}</td>
                                                                                <td>{formatarMoeda(detail.CUSTO_REPOSICAO)}</td>
                                                                                <td>{formatarMoeda(detail.VALOR_UNITARIO)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="no-results-message">Nenhum detalhe de pedido encontrado.</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={datasHeader.length + 6}>Total Geral</td>
                                        <td>{formatarNumero(totaisGerais.totalCaixas)}</td>
                                        <td>{formatarMoeda(totaisGerais.custoTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PedidoDeCompras;