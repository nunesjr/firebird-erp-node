import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
/* import * as XLSX from 'xlsx'; */
import { debounce } from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../styles/common.css';

import { formatarMoeda, formatarDataParaExibicao, getVendedorName } from '../utils/formatters';

const ResumoVendas = () => {
    // --- Estados para Dados e Carregamento ---
    const [allVendas, setAllVendas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState(null);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

    // --- Estados para Paginação (agora para filtragem local) ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(100);
    // totalItemsFiltered será calculado dinamicamente

    // --- Estados para Filtros ---
    const [filters, setFilters] = useState({
        dataInicio: '',
        dataFim: '',
        codigoCliente: '',
        status: '',
        situacaoEntrega: '',
        filial: '',
        conferido: '' // New filter state
    });

    // --- Estados para a busca de cliente ---
    const [termoBusca, setTermoBusca] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- Estado para Venda Expandida ---
    const [expandedSaleId, setExpandedSaleId] = useState(null);
    const [loadingItems, setLoadingItems] = useState(false);
    const [errorItems, setErrorItems] = useState(null);

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
        debouncedSearch(termo);
    };

    // --- Handler para seleção de cliente nos resultados da busca ---
    const handleSelectClient = (cliente) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            codigoCliente: cliente.CODIGO,
        }));
        setTermoBusca(`${cliente.CODIGO} - ${cliente.NOME}`);
        setSearchResults([]);
    };

    // --- 1. Função para buscar TODAS as vendas e seus status de conferência ---
    const fetchAllVendas = useCallback(async () => {
        setLoading(true);
        setErro(null);
        setPesquisaRealizada(false);

        const token = Cookies.get('token');
        if (!token) {
            setErro('Usuário não autenticado. Faça login para continuar.');
            setLoading(false);
            return;
        }

        try {
            // Passo 1: Buscar os dados principais da venda
            const params = new URLSearchParams();
            if (filters.codigoCliente) {
                params.append('codigoCliente', filters.codigoCliente);
            }
            const responseVendas = await axios.get(`http://varejaofdt.ddns.net/api/resumo-vendas?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const vendasData = responseVendas.data.data || [];

            if (vendasData.length === 0) {
                setAllVendas([]);
                setPesquisaRealizada(true);
                return;
            }

            // Passo 2: Extrair os códigos DAV e buscar seus status de conferência
            const davCodigos = vendasData.map(v => v.CODIGO).filter(Boolean);
            const responseConferencia = await axios.post('/api/conferencia/statuses', 
                { davCodigos },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const conferenciaStatus = responseConferencia.data || {};

            // Passo 3: Mesclar os dados
            const vendasComConferencia = vendasData.map(venda => ({
                ...venda,
                conferido: conferenciaStatus[venda.CODIGO] || 0,
            }));

            setAllVendas(vendasComConferencia);
            setPesquisaRealizada(true);
            setCurrentPage(1);

        } catch (error) {
            console.error('Erro ao buscar vendas ou status de conferência:', error);
            if (error.response && error.response.data && error.response.data.error) {
                setErro(`Erro ao carregar dados: ${error.response.data.error}`);
            } else {
                setErro('Erro ao carregar dados. Verifique os servidores e sua conexão.');
            }
        } finally {
            setLoading(false);
        }
    }, [filters.codigoCliente]);

    // --- 2. Função para buscar itens de uma venda específica ---
    const fetchVendaItems = useCallback(async (orcamentoCodigo) => {
        setLoadingItems(true);
        setErrorItems(null);
        const token = Cookies.get('token');
        if (!token) {
            setErrorItems('Usuário não autenticado. Faça login para continuar.');
            setLoadingItems(false);
            return { items: [], observacao: null };
        }

        try {
            const response = await axios.get(`http://varejaofdt.ddns.net/api/vendas/${orcamentoCodigo}/itens`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao buscar itens da venda ${orcamentoCodigo}:`, error);
            setErrorItems(`Erro ao carregar itens da venda: ${error.response?.data?.error || 'Erro desconhecido.'}`);
            return { items: [], observacao: null };
        } finally {
            setLoadingItems(false);
        }
    }, []);

    // --- Efeito para a busca inicial de TODAS as vendas ---
    useEffect(() => {
        fetchAllVendas();
    }, [fetchAllVendas]);

    // --- Lógica de Filtro no Frontend (usando useMemo para performance) ---
    const filteredVendas = useMemo(() => {
        let currentFiltered = allVendas;

        // Filtro por Data de Início
        if (filters.dataInicio) {
            const startDate = new Date(filters.dataInicio + 'T00:00:00');
            currentFiltered = currentFiltered.filter(venda => {
                const vendaDate = new Date(venda.DATA_ORCAMENTO + 'T00:00:00');
                return vendaDate >= startDate;
            });
        }

        // Filtro por Data de Fim
        if (filters.dataFim) {
            const endDate = new Date(filters.dataFim + 'T00:00:00');
            currentFiltered = currentFiltered.filter(venda => {
                const vendaDate = new Date(venda.DATA_ORCAMENTO + 'T00:00:00');
                return vendaDate <= endDate;
            });
        }

        // Filtro por Status
        if (filters.status) {
            currentFiltered = currentFiltered.filter(venda =>
                venda.STATUS === filters.status
            );
        }

        // Filtro por Situação de Entrega
        if (filters.situacaoEntrega) {
            currentFiltered = currentFiltered.filter(venda => {
                if (filters.situacaoEntrega === 'VAZIO') {
                    return !venda.SITUACAO_ENTREGA || venda.SITUACAO_ENTREGA.trim() === '';
                }
                return venda.SITUACAO_ENTREGA === filters.situacaoEntrega;
            });
        }

        // Filtro por Filial
        if (filters.filial) {
            currentFiltered = currentFiltered.filter(venda => {
                // Convert filter.filial to a number for comparison with venda.CODIGO_FILIAL
                return venda.CODIGO_FILIAL === parseInt(filters.filial);
            });
        }

        // Filtro por Conferido
        if (filters.conferido === 'true') {
            currentFiltered = currentFiltered.filter(venda => venda.conferido === 1);
        } else if (filters.conferido === 'false') {
            currentFiltered = currentFiltered.filter(venda => venda.conferido === 0);
        }

        return currentFiltered;
    }, [allVendas, filters]);

    // --- Lógica de Paginação no Frontend ---
    const totalItemsFiltered = filteredVendas.length;
    const totalPages = Math.ceil(totalItemsFiltered / itemsPerPage);

    const vendasParaExibicao = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredVendas.slice(startIndex, endIndex);
    }, [filteredVendas, currentPage, itemsPerPage]);

    // Cálculo do Valor Total Líquido das vendas EXIBIDAS na página atual
    const totalLiquidValueFilteredAndPaginated = useMemo(() => {
        return vendasParaExibicao.reduce((sum, venda) => sum + (venda.ORCAMENTO_LIQUIDO || 0), 0);
    }, [vendasParaExibicao]);

    // Handler para exportar para Excel
    const handleExportToExcel = useCallback(() => {
        if (filteredVendas.length === 0) {
            return;
        }

        const headers = [
            'DAV',
            'Código Cliente',
            'Nome Cliente',
            'Apelido Cliente',
            'Data Orçamento',
            'Orçamento Bruto',
            'Orçamento Líquido',
            'Status',
            'Situação Entrega',
            'Usuário',
            'Vendedor',
            'Filial'
        ];

        const csvContent = [
            headers.join(';'),
            ...filteredVendas.map(venda => {
                const rowData = [
                    venda.CODIGO,
                    venda.CODIGO_CLIENTE,
                    `"${venda.NOME_CLIENTE || 'N/A'}"`, 
                    `"${venda.APELIDO_CLIENTE || 'N/A'}"`, 
                    formatarDataParaExibicao(venda.DATA_ORCAMENTO),
                    (venda.ORCAMENTO_BRUTO?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\./g, '')) || '0,00',
                    (venda.ORCAMENTO_LIQUIDO?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\./g, '')) || '0,00',
                    venda.STATUS === 'A' ? 'ABERTO' : 'FECHADO',
                    venda.SITUACAO_ENTREGA || 'VAZIO',
                    venda.USUARIO || 'N/A',
                    getVendedorName(venda.CODIGO_VENDEDOR),
                    venda.CODIGO_FILIAL === 1 ? 'Matriz' : (venda.CODIGO_FILIAL === 2 ? 'Filial' : 'N/A')
                ];
                return rowData.join(';');
            })
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'resumo_vendas.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredVendas]);

    // --- Handlers de Interação ---
    const handleFilterChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value,
        }));
    }, []);

    const handleApplyFilters = useCallback(() => {
        setCurrentPage(1);
        setPesquisaRealizada(true);
        fetchAllVendas(); // Re-fetch vendas com o novo filtro de cliente
    }, [fetchAllVendas]);

    const handleClearFilters = useCallback(() => {
        setFilters({
            dataInicio: '',
            dataFim: '',
            codigoCliente: '',
            status: '',
            situacaoEntrega: ''
        });
        setTermoBusca(''); // Limpa o termo de busca
        setSearchResults([]); // Limpa os resultados da busca
        setCurrentPage(1);
        setPesquisaRealizada(false); // Reseta a pesquisa para que fetchAllVendas seja chamado
    }, []);

    const handleShowOpenOrders = useCallback(() => {
        setFilters(prevFilters => ({
            ...prevFilters,
            status: 'A',
            situacaoEntrega: ''
        }));
        setCurrentPage(1);
        setPesquisaRealizada(true);
        fetchAllVendas(); // Re-fetch vendas com o novo filtro de status
    }, [fetchAllVendas]);

    const handleSituacaoEntregaChange = useCallback((e) => {
        const { value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            situacaoEntrega: value
        }));
        setCurrentPage(1);
    }, []);

    const handleGeneratePdf = useCallback(() => {
        const doc = new jsPDF('l', 'pt', 'a4'); // Landscape, points, A4

        const title = "Relatório de Resumo de Vendas";
        doc.setFontSize(18);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

        const headers = [
            ["DAV", "Cliente", "Data", "Bruto", "Líquido", "Status", "Situação", "Usuário", "Vendedor", "Filial"]
        ];

        const data = filteredVendas.map(venda => [
            venda.CODIGO,
            `${venda.CODIGO_CLIENTE} - ${venda.NOME_CLIENTE || 'N/A'}`,
            formatarDataParaExibicao(venda.DATA_ORCAMENTO),
            formatarMoeda(venda.ORCAMENTO_BRUTO),
            formatarMoeda(venda.ORCAMENTO_LIQUIDO),
            venda.STATUS === 'A' ? 'ABERTO' : 'FECHADO',
            venda.SITUACAO_ENTREGA || 'VAZIO',
            venda.USUARIO || 'N/A',
            getVendedorName(venda.CODIGO_VENDEDOR),
            venda.CODIGO_FILIAL === 1 ? 'Matriz' : (venda.CODIGO_FILIAL === 2 ? 'Filial' : 'N/A')
        ]);

        doc.autoTable({
            startY: 70,
            head: headers,
            body: data,
            theme: 'striped',
            headStyles: { fillColor: [20, 100, 160] },
            styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 40 }, // DAV
                1: { cellWidth: 120 }, // Cliente
                2: { cellWidth: 60 }, // Data
                3: { cellWidth: 60 }, // Bruto
                4: { cellWidth: 60 }, // Líquido
                5: { cellWidth: 50 }, // Status
                6: { cellWidth: 60 }, // Situação
                7: { cellWidth: 60 }, // Usuário
                8: { cellWidth: 80 }, // Vendedor
                9: { cellWidth: 50 }  // Filial
            },
            didDrawPage: function (data) {
                // Footer
                let str = "Página " + doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(str, doc.internal.pageSize.getWidth() - 100, doc.internal.pageSize.getHeight() - 30);
            }
        });

        // Add items for each sale if available
        let finalY = doc.autoTable.previous.finalY;
        for (const venda of filteredVendas) {
            if (venda.items && venda.items.length > 0) {
                doc.setFontSize(12);
                doc.text(`Itens da Venda DAV: ${venda.CODIGO}`, 40, finalY + 20);
                finalY += 30;

                const itemHeaders = [
                    ["Seq.", "Cód. Produto", "Descrição", "Qtd.", "Custo Unit.", "Valor Unit.", "Custo Total", "Ganho", "Total Item"]
                ];

                const itemData = venda.items.map(item => {
                    const custoTotalItem = (item.QUANTIDADE || 0) * (item.CUSTO_REPOSICAO || 0);
                    const ganhoItem = (item.VALOR_TOTAL || 0) - custoTotalItem;
                    const valorUnitario = (item.VALOR_TOTAL || 0) / (item.QUANTIDADE || 1);
                    return [
                        item.SEQUENCIA,
                        item.CODIGO_PRODUTO,
                        item.PAF_DESCRICAO_PRODUTO,
                        item.QUANTIDADE,
                        formatarMoeda(item.CUSTO_REPOSICAO),
                        formatarMoeda(valorUnitario),
                        formatarMoeda(custoTotalItem),
                        formatarMoeda(ganhoItem),
                        formatarMoeda(item.VALOR_TOTAL)
                    ];
                });

                doc.autoTable({
                    startY: finalY,
                    head: itemHeaders,
                    body: itemData,
                    theme: 'grid',
                    headStyles: { fillColor: [100, 150, 200] },
                    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
                    columnStyles: {
                        0: { cellWidth: 30 }, // Seq.
                        1: { cellWidth: 60 }, // Cód. Produto
                        2: { cellWidth: 150 }, // Descrição
                        3: { cellWidth: 40 }, // Qtd.
                        4: { cellWidth: 60 }, // Custo Unit.
                        5: { cellWidth: 60 }, // Valor Unit.
                        6: { cellWidth: 60 }, // Custo Total
                        7: { cellWidth: 60 }, // Ganho
                        8: { cellWidth: 60 }  // Total Item
                    },
                    didDrawPage: function (data) {
                        // Footer for item tables
                        let str = "Página " + doc.internal.getNumberOfPages();
                        doc.setFontSize(10);
                        doc.text(str, doc.internal.pageSize.getWidth() - 100, doc.internal.pageSize.getHeight() - 30);
                    }
                });
                finalY = doc.autoTable.previous.finalY;
            }
        }

        doc.save('resumo_vendas.pdf');
    }, [filteredVendas]);

    const handlePrint = useCallback(() => {
        handleGeneratePdf();
    }, [handleGeneratePdf]);

    const handlePageChange = useCallback((newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    }, [totalPages]);

    const toggleExpandSale = useCallback(async (saleId) => {
        if (expandedSaleId === saleId) {
            setExpandedSaleId(null);
        } else {
            setExpandedSaleId(saleId);
            const { items, observacao } = await fetchVendaItems(saleId);
            setAllVendas(prevAllVendas =>
                prevAllVendas.map(venda =>
                    venda.CODIGO === saleId ? { ...venda, items: items, observacao: observacao } : venda
                )
            );
        }
    }, [expandedSaleId, fetchVendaItems]);

    const handleConferenciaChange = async (davCodigo) => {
        const token = Cookies.get('token');
        if (!token) {
            setErro('Sessão expirada, por favor faça login novamente.');
            return;
        }

        // Otimista: atualiza a UI imediatamente
        setAllVendas(prevVendas =>
            prevVendas.map(v =>
                v.CODIGO === davCodigo ? { ...v, conferido: v.conferido ? 0 : 1 } : v
            )
        );

        try {
            await axios.put('/api/conferencia/toggle', 
                { dav_codigo: davCodigo }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Erro ao atualizar status de conferência:', error);
            setErro('Falha ao salvar o status da conferência. A alteração foi revertida.');
            // Reverte a alteração em caso de erro
            setAllVendas(prevVendas =>
                prevVendas.map(v =>
                    v.CODIGO === davCodigo ? { ...v, conferido: v.conferido ? 0 : 1 } : v
                )
            );
        }
    };

    // --- Renderização do Componente (JSX) ---
    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
                <h2>Resumo de Vendas</h2>
                <p>Visualize um resumo das vendas e seus itens.</p>
            </div>

            <div className="filters-card">
                <h3>Filtros</h3>
                <div className="filters-grid">
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
                    <div className="form-group">
                        <label htmlFor="status">Status:</label>
                        <select
                            id="status"
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos</option>
                            <option value="A">Aberto</option>
                            <option value="F">Fechado</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="situacaoEntrega">Situação de Entrega:</label>
                        <select
                            id="situacaoEntrega"
                            name="situacaoEntrega"
                            value={filters.situacaoEntrega}
                            onChange={handleSituacaoEntregaChange}
                        >
                            <option value="">Todos</option>
                            <option value="VAZIO">VAZIO</option>
                            <option value="EL">Entregue na Loja</option>
                            <option value="EC">Entregue no Cliente</option>
                            <option value="AE">À Entregar</option>
                            <option value="AR">À Retirar</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="conferido">Conferido:</label>
                        <select
                            id="conferido"
                            name="conferido"
                            value={filters.conferido}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos</option>
                            <option value="true">Conferido</option>
                            <option value="false">Não Conferido</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="filial">Filial:</label>
                        <select
                            id="filial"
                            name="filial"
                            value={filters.filial}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todas</option>
                            <option value="1">Matriz</option>
                            <option value="2">Filial</option>
                        </select>
                    </div>
                </div>

                <div className="actions">
                    <button onClick={handleApplyFilters} disabled={loading} className="btn btn-primary">Aplicar Filtros</button>
                    <button onClick={handleClearFilters} disabled={loading} className="btn btn-secondary">Limpar Filtros</button>
                    <button onClick={handleShowOpenOrders} disabled={loading} className={`btn btn-secondary ${filters.status === 'A' ? 'active' : ''}`}>Pedidos em Aberto</button>
                    <button onClick={handleExportToExcel} disabled={loading} className="btn btn-secondary">Exportar para Excel</button>
                    <button onClick={handlePrint} disabled={loading} className="btn btn-secondary print-button">Imprimir</button>
                </div>
            </div>

            {loading && <p className="loading-message">Carregando todas as vendas...</p>}
            {erro && (
                <div className="error-message">
                    <p>{erro}</p>
                </div>
            )}

            {pesquisaRealizada && !loading && (
                <>
                    <div className="erp-summary-card">
                        <div className={`erp-card erp-summary-card ${totalItemsFiltered >= 0 ? 'positivo' : 'negativo'}`}>
                            Vendas Encontradas
                            <strong>{totalItemsFiltered}</strong>
                        </div>
                        <div className={`erp-card erp-summary-card ${totalLiquidValueFilteredAndPaginated >= 0 ? 'positivo' : 'negativo'}`}>
                            Valor Total (Página)
                            <strong>{formatarMoeda(totalLiquidValueFilteredAndPaginated)}</strong>
                        </div>
                        <div className={`erp-card erp-summary-card ${currentPage === totalPages ? 'positivo' : 'negativo'}`}>
                            Página
                            <strong>{currentPage} de {totalPages}</strong>
                        </div>
                    </div>

                    {vendasParaExibicao.length === 0 ? (
                        <p className="no-results-message">Nenhuma venda encontrada com os filtros aplicados.</p>
                    ) : (
                        <div className="sales-list">
                            {vendasParaExibicao.map((venda) => (
                                <div
                                    key={venda.CODIGO}
                                    className={`sale-card ${venda.STATUS === 'A' ? 'status-aberto' : ''}`}
                                    aria-expanded={expandedSaleId === venda.CODIGO}
                                >
                                    <div className="sale-header">
                                        <div className="sale-header-clickable" onClick={() => toggleExpandSale(venda.CODIGO)}>
                                            <div className="sale-main-info">
                                                <span><strong>DAV:</strong> {venda.CODIGO}</span>
                                                <span><strong>Cliente:</strong> {venda.CODIGO_CLIENTE} - {venda.NOME_CLIENTE || 'N/A'} ({venda.APELIDO_CLIENTE || 'N/A'})
                                                </span>
                                                <span><strong>Data:</strong> {formatarDataParaExibicao(venda.DATA_ORCAMENTO)}</span>
                                                <span><strong>Usuario:</strong> {venda.USUARIO}</span>
                                                <span><strong>Vendedor:</strong> {getVendedorName(venda.CODIGO_VENDEDOR)}</span>
                                                <span><strong>Observação:</strong> {venda.observacao}</span>
                                            </div>
                                            <div className="sale-value-info">
                                                <span><strong>Bruto:</strong> {formatarMoeda(venda.ORCAMENTO_BRUTO)}</span>
                                                <span><strong>Líquido:</strong> {formatarMoeda(venda.ORCAMENTO_LIQUIDO)}</span>
                                                {venda.CODIGO && venda.items && (
                                                    <>
                                                        <span><strong>Custo:</strong> {formatarMoeda(venda.items.reduce((sum, item) => sum + (item.QUANTIDADE || 0) * (item.CUSTO_REPOSICAO || 0), 0))}</span>
                                                        <span><strong>Ganho:</strong> {formatarMoeda((venda.ORCAMENTO_LIQUIDO || 0) - venda.items.reduce((sum, item) => sum + (item.QUANTIDADE || 0) * (item.CUSTO_REPOSICAO || 0), 0))}</span>
                                                    </>
                                                )}
                                            </div>
                                            <span className="expand-icon">{expandedSaleId === venda.CODIGO ? '▲' : '▼'}</span>
                                        </div>
                                        <div className="sale-header-boxes">
                                            <div className="sale-header-box">
                                                <span className={`filial ${venda.CODIGO_FILIAL === 1 ? 'filial-matriz' : 'filial-filial'}`}>
                                                    <strong>Empresa:</strong> {venda.CODIGO_FILIAL === 1 ? 'Matriz' : (venda.CODIGO_FILIAL === 2 ? 'Filial' : 'N/A')}
                                                </span>
                                            </div>
                                            <div className="sale-header-box">
                                                <span className={`status ${venda.STATUS === 'A' ? 'status-open' : 'status-closed'}`}>
                                                    <strong>Status:</strong> {venda.STATUS === 'A' ? 'ABERTO' : 'FECHADO'}
                                                </span>
                                            </div>
                                            <div className="sale-header-box">
                                                <div className="conferencia-checkbox">
                                                    <label htmlFor={`conferencia-${venda.CODIGO}`}>Conferido:</label>
                                                    <input 
                                                        type="checkbox"
                                                        id={`conferencia-${venda.CODIGO}`}
                                                        checked={!!venda.conferido}
                                                        onChange={() => handleConferenciaChange(venda.CODIGO)}
                                                        disabled={!venda.CODIGO}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedSaleId === venda.CODIGO && (
                                        <div className="sale-details">
                                            {loadingItems ? (
                                                <p className="loading-message">Carregando itens...</p>
                                            ) : errorItems ? (
                                                <div className="error-message"><p>{errorItems}</p></div>
                                            ) : (
                                                venda.items && venda.items.length > 0 ? (
                                                    <div className="table-container">
                                                        <h4>Itens da Venda:</h4>
                                                        <table className="data-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Seq.</th>
                                                                    <th>Cód. Produto</th>
                                                                    <th>Descrição</th>
                                                                    <th>Qtd.</th>
                                                                    <th>Custo Unit.</th>
                                                                    <th>Valor Unit.</th>
                                                                    <th>Custo Total</th>
                                                                    <th>Ganho</th>
                                                                    <th>Total Item</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {venda.items.map((item) => {
                                                                    const custoTotalItem = (item.QUANTIDADE || 0) * (item.CUSTO_REPOSICAO || 0);
                                                                    const ganhoItem = (item.VALOR_TOTAL || 0) - custoTotalItem;
                                                                    const valorUnitario = (item.VALOR_TOTAL || 0) / (item.QUANTIDADE || 1);
                                                                    return (
                                                                        <tr key={item.SEQUENCIA}>
                                                                            <td>{item.SEQUENCIA}</td>
                                                                            <td>{item.CODIGO_PRODUTO}</td>
                                                                            <td>{item.PAF_DESCRICAO_PRODUTO}</td>
                                                                            <td>{item.QUANTIDADE}</td>
                                                                            <td>{formatarMoeda(item.CUSTO_REPOSICAO)}</td>
                                                                            <td>{formatarMoeda(valorUnitario)}</td>
                                                                            <td>{formatarMoeda(custoTotalItem)}</td>
                                                                            <td>{formatarMoeda(ganhoItem)}</td>
                                                                            <td>{formatarMoeda(item.VALOR_TOTAL)}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="no-results-message">Nenhum item encontrado para esta venda.</p>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

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

export default ResumoVendas;