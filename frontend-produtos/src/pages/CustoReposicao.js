import React, { useEffect, useState, useCallback } from 'react'; // Adicionado useCallback
import axios from 'axios';
import Cookies from 'js-cookie';

import { formatarMoeda } from '../utils/formatters';

// Removida a linha: const token = Cookies.get('token'); // Era redundante e não utilizada

const empresaLabel = {
  1: 'Matriz',
  2: 'Filial'
};

const CustoReposicao = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({
    codigo: '',
    descricao: '',
    custo: '',
    empresasSelecionadas: [1] // começa mostrando Matriz
  });

  // Use useCallback para memorizar a função carregarProdutos e evitar recriações desnecessárias
  // e para que ela possa ser uma dependência no useEffect.
  const carregarProdutos = useCallback(async () => {
    const token = Cookies.get('token');
    if (!token) {
      setErro('Usuário não autenticado. Por favor, faça login.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      filtros.empresasSelecionadas.forEach(e => params.append('empresa', e));

      const response = await axios.get(`http://varejaofdt.ddns.net/produtos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Validação mais robusta para garantir que response.data seja um array
      if (Array.isArray(response.data)) {
        setProdutos(response.data);
        setErro(null); // Limpa qualquer erro anterior se a requisição for bem-sucedida
      } else {
        // Se a resposta não for um array, é um erro de formato inesperado
        console.error('Erro: Resposta da API /produtos não é um array. Dados recebidos:', response.data);
        setErro('Erro: O formato dos dados da API de produtos é inesperado.');
        setProdutos([]); // Garante que 'produtos' seja um array vazio para evitar o erro .filter()
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      if (err.response && err.response.status === 401) {
        setErro('Token expirado ou inválido. Faça login novamente.');
      } else {
        setErro('Erro ao carregar produtos. Verifique se o servidor está rodando.');
      }
    } finally {
      setLoading(false);
    }
  }, [filtros.empresasSelecionadas]); // carregarProdutos depende de filtros.empresasSelecionadas

  // O useEffect agora depende da função memorizada carregarProdutos
  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]); // Dependência adicionada para cumprir as regras do Hook

  const filtrarProdutos = (produto) => {
    const { codigo, descricao, custo } = filtros;

    if (codigo && !produto.CODIGO.toString().includes(codigo)) return false;
    if (descricao && !produto.DESCRICAO.toLowerCase().includes(descricao.toLowerCase())) return false;
    // Usar optional chaining (?.) para custo, pois pode ser null/undefined no Firebird
    if (custo && !produto.F_CUSTO_REPOSICAO?.toString().includes(custo)) return false;

    return true;
  };

  // 'produtosFiltrados' é recalculado em cada render, o que é esperado e correto.
  const produtosFiltrados = produtos.filter(filtrarProdutos);

  

  const toggleEmpresa = (empresa) => {
    setFiltros(prev => {
      const selecionadas = prev.empresasSelecionadas.includes(empresa)
        ? prev.empresasSelecionadas.filter(e => e !== empresa)
        : [...prev.empresasSelecionadas, empresa];
      return { ...prev, empresasSelecionadas: selecionadas };
    });
  };

  const exportarParaCSV = () => {
    const csvContent = [
      ['Código', 'Descrição', 'Custo de Reposição', 'Empresa'],
      ...produtosFiltrados.map(item => [
        item.CODIGO,
        item.DESCRICAO,
        formatarMoeda(item.F_CUSTO_REPOSICAO),
        empresaLabel[item.CODIGO_FILIAL] || 'Desconhecida'
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'custo_reposicao.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Custo de Reposição</h2>
        <p>Consulta de produtos e seus custos de reposição</p>
      </div>

      {erro && (
        <div className="error-message">
          <p>{erro}</p>
          <button onClick={carregarProdutos} className="btn-retry">Tentar Novamente</button>
        </div>
      )}

      <div className="filters-container">
        <div className="filter-group">
          <label>Código:</label>
          <input
            type="text"
            value={filtros.codigo}
            onChange={e => setFiltros({ ...filtros, codigo: e.target.value })}
            placeholder="Filtrar por código"
          />
        </div>
        <div className="filter-group">
          <label>Descrição:</label>
          <input
            type="text"
            value={filtros.descricao}
            onChange={e => setFiltros({ ...filtros, descricao: e.target.value })}
            placeholder="Filtrar por descrição"
          />
        </div>
        <div className="filter-group">
          <label>Custo:</label>
          <input
            type="text"
            value={filtros.custo}
            onChange={e => setFiltros({ ...filtros, custo: e.target.value })}
            placeholder="Filtrar por custo"
          />
        </div>

        <div className="filter-group">
          <label>Mostrar empresas:</label>
          <label>
            <input
              type="checkbox"
              checked={filtros.empresasSelecionadas.includes(1)}
              onChange={() => toggleEmpresa(1)}
            />
            Matriz
          </label>
          <label>
            <input
              type="checkbox"
              checked={filtros.empresasSelecionadas.includes(2)}
              onChange={() => toggleEmpresa(2)}
            />
            Filial
          </label>
        </div>

        <button onClick={exportarParaCSV} className="btn-export">
          Exportar CSV
        </button>
      </div>

      <div className="table-info">
        <p>Total de produtos: {produtosFiltrados.length}</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Custo de Reposição</th>
              <th>Empresa</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length > 0 ? (
              produtosFiltrados.map(produto => (
                <tr key={`${produto.CODIGO}-${produto.CODIGO_FILIAL}`}>
                  <td>{produto.CODIGO}</td>
                  <td>{produto.DESCRICAO}</td>
                  <td className="currency">{formatarMoeda(produto.F_CUSTO_REPOSICAO)}</td>
                  <td>{empresaLabel[produto.CODIGO_FILIAL]}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">
                  Nenhum produto encontrado com os filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustoReposicao;
