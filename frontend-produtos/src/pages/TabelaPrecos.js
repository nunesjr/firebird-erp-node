import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { debounce } from 'lodash';
import '../styles/common.css';
import { formatarMoeda, formatarData, formatarDataParaExibicao } from '../utils/formatters';


const TableHeader = ({ columnName, title, sortConfig, handleSort }) => {
  const isSorted = sortConfig.sortBy === columnName;
  const sortArrow = isSorted ? (sortConfig.sortOrder === 'asc' ? '▲' : '▼') : '';

  return (
    <th onClick={() => handleSort(columnName)} className="erp-table-header-sortable">
      {title} {sortArrow}
    </th>
  );
};

const TabelaPrecos = () => {
  const [codigoCliente, setCodigoCliente] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    sortBy: 'DESCRICAO',
    sortOrder: 'asc'
  });

  const [porcentagem, setPorcentagem] = useState(50);
  const [valoresEditados, setValoresEditados] = useState({});
  const [scriptSQL, setScriptSQL] = useState('');
  const [mostrarScript, setMostrarScript] = useState(false);

  const buscarTabelaPrecos = useCallback(async () => {
    if (!codigoCliente || isNaN(codigoCliente)) {
      setErro('Por favor, digite um código de cliente válido (número)');
      return;
    }

    const token = Cookies.get('token');
    if (!token) {
      setErro('Usuário não autenticado. Faça login para continuar.');
      return;
    }

    try {
      setLoading(true);
      setErro(null);
      setPesquisaRealizada(true);
      setValoresEditados({});
      setScriptSQL('');
      setMostrarScript(false);

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      try {
        const clienteResponse = await axios.get(
          `/api/cliente-convenio/${codigoCliente}`,
          config
        );
        setClienteInfo(clienteResponse.data);
      } catch (clienteErr) {
        if (clienteErr.response?.status === 404) {
          setClienteInfo(null);
        } else if (clienteErr.response?.status === 401) {
          setErro('Sessão expirada ou token inválido. Faça login novamente.');
          setClienteInfo(null);
          setLoading(false);
          return;
        } else {
          console.warn('Erro ao buscar informações do cliente:', clienteErr);
          setClienteInfo(null);
        }
      }

      const response = await axios.get(
        `/api/tabela-precos/${codigoCliente}?filial=1`,
        config
      );
      setProdutos(response.data.data || []);
      setSortConfig({ sortBy: 'DESCRICAO', sortOrder: 'asc' });
    } catch (err) {
      console.error('Erro ao buscar tabela de preços:', err);
      if (err.response?.status === 400) {
        setErro(err.response.data.details || 'Código do cliente inválido');
      } else if (err.response?.status === 401) {
        setErro('Sessão expirada ou token inválido. Faça login novamente.');
      } else {
        setErro('Erro ao carregar tabela de preços. Verifique se o servidor está rodando.');
      }
      setProdutos([]);
      setClienteInfo(null);
    } finally {
      setLoading(false);
    }
  }, [codigoCliente]);

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
    debouncedSearch(termo);
  };

  const handleSelectClient = (cliente) => {
    setCodigoCliente(cliente.CODIGO);
    setTermoBusca(`${cliente.CODIGO} - ${cliente.NOME}`);
    setSearchResults([]);
  };

  useEffect(() => {
    if (codigoCliente) {
      buscarTabelaPrecos();
    }
  }, [codigoCliente, buscarTabelaPrecos]);

  const calcularDiferencaPercentual = useCallback((custoReposicao, precoFixo) => {
    if (!custoReposicao || !precoFixo || custoReposicao === 0) return 0;
    const diferenca = ((precoFixo - custoReposicao) / custoReposicao) * 100;
    return diferenca;
  }, []);

  const calcularValorSugerido = useCallback((custoReposicao) => {
    if (!custoReposicao) return 0;
    return custoReposicao * (1 + porcentagem / 100);
  }, [porcentagem]);

  const handleValorEditadoChange = useCallback((codigoProduto, valor) => {
    setValoresEditados(prev => ({
      ...prev,
      [codigoProduto]: valor
    }));
  }, []);

  const sortedProdutos = useMemo(() => {
    if (!produtos || produtos.length === 0) return [];

    const sortableItems = [...produtos];
    sortableItems.sort((a, b) => {

      let aValue = a[sortConfig.sortBy];
      let bValue = b[sortConfig.sortBy];

      if (aValue === null || aValue === undefined) aValue = -Infinity;
      if (bValue === null || bValue === undefined) bValue = -Infinity;

      let compareResult = 0;

      switch (sortConfig.sortBy) {
        case 'CODIGO_PRODUTO':
        case 'F_CUSTO_REPOSICAO':
        case 'PRECO_FIXO':
          compareResult = aValue - bValue;
          break;
        case 'DESCRICAO':
          compareResult = String(aValue).localeCompare(String(bValue), 'pt-BR');
          break;
        case 'DIFERENCA':
          const aCusto = a.F_CUSTO_REPOSICAO || 0;
          const aPreco = a.PRECO_FIXO || 0;
          const bCusto = b.F_CUSTO_REPOSICAO || 0;
          const bPreco = b.PRECO_FIXO || 0;

          const aDiff = aCusto === 0 ? -Infinity : ((aPreco - aCusto) / aCusto) * 100;
          const bDiff = bCusto === 0 ? -Infinity : ((bPreco - bCusto) / bCusto) * 100;

          compareResult = aDiff - bDiff;
          break;
        case 'DATA_ULTIMA_COMPRA':
          const aDate = aValue ? new Date(aValue) : null;
          const bDate = bValue ? new Date(bValue) : null;

          if (aDate === null && bDate === null) return 0;
          if (aDate === null) return sortConfig.sortOrder === 'asc' ? 1 : -1;
          if (bDate === null) return sortConfig.sortOrder === 'asc' ? -1 : 1;

          compareResult = aDate - bDate;
          break;
        case 'VALOR_SUGERIDO':
          const aSugerido = calcularValorSugerido(a.F_CUSTO_REPOSICAO);
          const bSugerido = calcularValorSugerido(b.F_CUSTO_REPOSICAO);
          compareResult = aSugerido - bSugerido;
          break;
        default:
          compareResult = 0;
      }

      return sortConfig.sortOrder === 'asc' ? compareResult : -compareResult;
    });
    return sortableItems;
  }, [produtos, sortConfig, calcularValorSugerido]);

  const gerarScriptSQL = useCallback(() => {
    const updates = [];
    sortedProdutos.forEach(produto => {
      const valor = valoresEditados[produto.CODIGO_PRODUTO];
      if (valor && !isNaN(valor)) {
        const vf = parseFloat(valor).toFixed(2);
        updates.push(
          `UPDATE CLIENTE_CONVENIO_PRODUTO
          SET PRECO_FIXO = ${vf}
          WHERE CODIGO_CLIENTE_CONVENIO = ${codigoCliente}
          AND CODIGO_PRODUTO = '${produto.CODIGO_PRODUTO}'`
        );
      }
    });

    if (updates.length === 0) {
      setErro('Nenhum valor editado para gerar script.');
      return;
    }

    const script = `-- Atualização de preços - Cliente ${codigoCliente}
EXECUTE BLOCK AS
BEGIN
${updates.map(u => `  ${u};`).join('\n')}
END`;

    setScriptSQL(script);
    setMostrarScript(true);
    setErro(null);
  }, [sortedProdutos, valoresEditados, codigoCliente]);

  const copiarScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptSQL);
      alert('Script copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar script:', err);
      alert('Erro ao copiar script. Selecione e copie manualmente.');
    }
  };

  const aplicarValorSugerido = useCallback(() => {
    const novosValores = {};
    produtos.forEach(produto => {
      const valorSugerido = calcularValorSugerido(produto.F_CUSTO_REPOSICAO);
      if (valorSugerido > 0) {
        novosValores[produto.CODIGO_PRODUTO] = valorSugerido.toFixed(2);
      }
    });
    setValoresEditados(novosValores);
  }, [produtos, calcularValorSugerido]);

  const exportarCSV = useCallback(() => {
    if (sortedProdutos.length === 0) return;
    const csvContent = [
      ['Código Produto', 'Descrição', 'Custo Reposição', 'Preço Fixo', 'Valor Sugerido', 'Diferença (%)', 'Última Compra', 'Novo Valor'],
      ...sortedProdutos.map(produto => [
        produto.CODIGO_PRODUTO,
        produto.DESCRICAO || 'Sem descrição',
        produto.F_CUSTO_REPOSICAO?.toString().replace('.', ',') || '0,00',
        produto.PRECO_FIXO?.toString().replace('.', ',') || '0,00',
        calcularValorSugerido(produto.F_CUSTO_REPOSICAO).toFixed(2).replace('.', ','),
        calcularDiferencaPercentual(produto.F_CUSTO_REPOSICAO, produto.PRECO_FIXO).toFixed(2).replace('.', ','),
        formatarDataParaExibicao(produto.DATA_ULTIMA_COMPRA),
        valoresEditados[produto.CODIGO_PRODUTO] || ''
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tabela_precos_cliente_${codigoCliente}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sortedProdutos, codigoCliente, calcularValorSugerido, calcularDiferencaPercentual, valoresEditados]);

  const handleSort = useCallback((columnName) => {
    setSortConfig(prevConfig => ({
      sortBy: columnName,
      sortOrder: prevConfig.sortBy === columnName && prevConfig.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return (
    <div className="erp-main-content">
      <div className="erp-content-header">
        <h2>Tabela de Preços por Cliente</h2>
        <p>Consulta e edição de preços específicos por cliente convênio</p>
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
        </div>
      </div>
      <div className="actions">
        <button onClick={buscarTabelaPrecos} disabled={loading || !codigoCliente} className="btn btn-primary"> {loading ? 'Buscando...' : 'Buscar Tabela'}</button>
      </div>

      {sortedProdutos.length > 0 && (
        <div className="erp-summary-card">
          <div className="erp-summary-selective">
            <label>Porcentagem para Valor Sugerido:</label>
            <select
              value={porcentagem}
              onChange={(e) => setPorcentagem(parseInt(e.target.value))}
            >
              <option value={40}>40%</option>
              <option value={50}>50%</option>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
            </select>
          </div>
          <button onClick={aplicarValorSugerido} className="btn btn-secondary">
            Aplicar Valor Sugerido em Todos
          </button>
          <button onClick={gerarScriptSQL} className="btn btn-primary">
            Gerar Script SQL
          </button>
        </div>
      )}

      {erro && (
        <div className="error-message">
          <p>{erro}</p>
        </div>
      )}

      {clienteInfo && (
        <div className="erp-card erp-card-info">
          <h3>Informações do Cliente</h3>
          <p><strong>Código:</strong> {clienteInfo.CODIGO}</p>
          <p><strong>Nome:</strong> {clienteInfo.NOME}</p>
          {clienteInfo.DESCRICAO && (
            <p><strong>Descrição:</strong> {clienteInfo.DESCRICAO}</p>
          )}
        </div>
      )}

      {pesquisaRealizada && (
        <div className="erp-card">
          <div className="results-header">
            <div className="results-info">
              <p>Total de produtos: {sortedProdutos.length}</p>
              {codigoCliente && (
                <p>Cliente convênio: {codigoCliente}</p>
              )}
            </div>
            {sortedProdutos.length > 0 && (
              <button onClick={exportarCSV} className="btn erp-">
                Exportar CSV
              </button>
            )}
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <TableHeader
                    columnName="CODIGO_PRODUTO"
                    title="Código Produto"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="DESCRICAO"
                    title="Descrição"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="F_CUSTO_REPOSICAO"
                    title="Custo Reposição"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="PRECO_FIXO"
                    title="Preço Fixo"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="VALOR_SUGERIDO"
                    title={`Valor Sugerido (${porcentagem}%)`}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="DIFERENCA"
                    title="Diferença (%)"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <TableHeader
                    columnName="DATA_ULTIMA_COMPRA"
                    title="Última Compra"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                  />
                  <th>Novo Valor</th>
                </tr>
              </thead>
              <tbody>
                {sortedProdutos.length > 0 ? (
                  sortedProdutos.map((produto) => (
                    <tr key={produto.CODIGO_PRODUTO}>
                      <td>{produto.CODIGO_PRODUTO}</td>
                      <td>{produto.DESCRICAO || 'Sem descrição'}</td>
                      <td className="currency">{formatarMoeda(produto.F_CUSTO_REPOSICAO)}</td>
                      <td className="currency">{formatarMoeda(produto.PRECO_FIXO)}</td>
                      <td className="currency suggested-value">
                        {formatarMoeda(calcularValorSugerido(produto.F_CUSTO_REPOSICAO))}
                      </td>
                      <td className="percentage">
                        {calcularDiferencaPercentual(produto.F_CUSTO_REPOSICAO, produto.PRECO_FIXO).toFixed(2)}%
                      </td>
                      <td>{formatarData(produto.DATA_ULTIMA_COMPRA)}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valoresEditados[produto.CODIGO_PRODUTO] || ''}
                          onChange={(e) => handleValorEditadoChange(produto.CODIGO_PRODUTO, e.target.value)}
                          placeholder="Novo valor"
                          className="erp-form-control erp-input-novo-valor"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {codigoCliente
                        ? `Nenhum produto encontrado para o cliente convênio ${codigoCliente}`
                        : 'Digite um código de cliente e clique em "Buscar Tabela"'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarScript && (
        <div className="erp-card">
          <div className="script-header">
            <h3>Script SQL Gerado</h3>
            <button onClick={copiarScript} className="btn btn-secondary">
              Copiar Script
            </button>
          </div>
          <textarea
            value={scriptSQL}
            readOnly
            className="erp-form-control erp-textarea"
            rows="15"
          />
          <p className="script-info">
            <strong>Instruções:</strong> Copie o script acima e execute no IBExpert para atualizar os preços no banco de dados.
          </p>
        </div>
      )}
    </div>
  );
};

export default TabelaPrecos;