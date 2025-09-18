import React, { useEffect, useState, useCallback } from 'react'; // Adicionado useCallback
import axios from 'axios';
import Cookies from 'js-cookie'; // para pegar o token do cookie
import '../styles/common.css';
import './Fornecedores.css';

const secaoLabel = {
  1: 'Ativo',
  2: 'Brinquedos',
  3: 'Combustível',
  4: 'Uso e Consumo',
  5: 'Diversos',
  6: 'Hortifruti',
  7: 'Laticínios',
  8: 'Mercearia'
};

const grupoLabel = {
  1: 'Ativo',
  2: 'Bebidas',
  3: 'Bebidas',
  4: 'Bebidas',
  5: 'Bombonier',
  6: 'Bombonier',
  7: 'Brinquedos',
  8: 'Brinquedos',
  9: 'Combustivel',
  10: 'Condimentos',
  11: 'Consumo',
  12: 'Folhas',
  13: 'Folhas',
  14: 'Frutas',
  15: 'Mercearia',
  16: 'Mercearia',
  17: 'Mercearia',
  18: 'Mercearia',
  19: 'Padaria',
  20: 'Picadinhos',
  21: 'Picadinhos',
  22: 'Sucos',
  23: 'Verdura',
  24: 'Verdura',
  25: 'Sorvetes'
};

const Fornecedores = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({
    codigo: '',
    descricao: '',
    fornecedor: '',
    tipoEstoque: '',
    apenasNegativos: false,
    ordenacao: 'descricao_asc',
    secao: '',
    grupo: ''
  });

  // Use useCallback para memorizar a função carregarDados
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const token = Cookies.get('token');
      if (!token) {
        setErro('Usuário não autenticado. Por favor, faça login.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filtros.tipoEstoque) params.append('tipo_estoque', filtros.tipoEstoque);
      if (filtros.apenasNegativos) params.append('apenas_negativos', 'true');
      if (filtros.ordenacao) params.append('ordenacao', filtros.ordenacao);

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/estoque?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Validação robusta para garantir que response.data seja um array
      if (Array.isArray(response.data)) {
        setDados(response.data);
      } else {
        console.error('Erro: Resposta da API /estoque não é um array. Dados recebidos:', response.data);
        setErro('Erro: O formato dos dados da API de estoque é inesperado.');
        setDados([]); // Garante que 'dados' seja um array vazio para evitar o erro .filter() 
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err.response?.status, err.response?.data || err.message);
      setErro(err.response?.data?.error || 'Erro ao carregar dados. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  }, [filtros.tipoEstoque, filtros.apenasNegativos, filtros.ordenacao]); // Dependências de carregarDados

  // O useEffect agora depende da função memorizada carregarDados
  useEffect(() => {
    carregarDados();
  }, [carregarDados]); // Dependência adicionada para cumprir as regras do Hook

  const filtrarDados = (item) => {
    const {codigo, descricao, fornecedor, secao, grupo} = filtros;

    if (codigo && (!item.CODIGO_PRODUTO || !item.CODIGO_PRODUTO.toString().includes(codigo))) return false;
    if (descricao && (!item.DESCRICAO || !item.DESCRICAO.toLowerCase().includes(descricao.toLowerCase()))) return false;
    if (fornecedor && (!item.FORNECEDOR || !item.FORNECEDOR.toLowerCase().includes(fornecedor.toLowerCase()))) return false;
    if (secao && (item.COD_SECAO === null || item.COD_SECAO === undefined || item.COD_SECAO.toString() !== secao)) return false;
    if (grupo && (item.COD_GRUPO === null || item.COD_GRUPO === undefined || item.COD_GRUPO.toString() !== grupo)) return false;

    return true;
  };

  const dadosFiltrados = dados.filter(filtrarDados);

  const formatarEstoque = (valor) => {
    if (valor === null || valor === undefined) return '0,00';
    return valor.toFixed(2).replace('.', ',');
  };

  const exportarParaExcel = () => {
    const csvContent = [
      ['Código', 'Descrição', 'Estoque', 'Tipo Estoque', 'Código Fornecedor', 'Fornecedor', 'Seção', 'Grupo'],
      ...dadosFiltrados.map(item => [
        item.CODIGO_PRODUTO,
        item.DESCRICAO,
        formatarEstoque(item.ESTOQUE),
        item.TIPO_ESTOQUE,
        item.CODIGO_FORNECEDOR || '',
        item.FORNECEDOR || '',
        secaoLabel[item.COD_SECAO] || 'Sem seção',
        grupoLabel[item.COD_GRUPO] || 'Sem grupo'
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'estoque_fornecedores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="erp-main-content">
      <div className="erp-content-header">
        <h2>Estoque e Fornecedores</h2>
        <p>Consulta de estoque em tempo real com informações de fornecedores</p>
      </div>

      {erro && (
        <div className="error-message">
          <p>{erro}</p>
          <button onClick={carregarDados} className="btn-retry">
            Tentar Novamente
          </button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-grid">
          <div className="form-group">
            <label>Tipo de Estoque:</label>
            <select
              value={filtros.tipoEstoque}
              onChange={(e) => setFiltros({ ...filtros, tipoEstoque: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="1">Matriz</option>
              <option value="2">Filial</option>
            </select>
          </div>

          <div className="form-group">
            <label>Ordenação:</label>
            <select
              value={filtros.ordenacao}
              onChange={(e) => setFiltros({ ...filtros, ordenacao: e.target.value })}
            >
              <option value="descricao_asc">A-Z</option>
              <option value="descricao_desc">Z-A</option>
              <option value="estoque_asc">Estoque Crescente</option>
              <option value="estoque_desc">Estoque Decrescente</option>
              <option value="codigo_asc">Código Crescente</option>
              <option value="codigo_desc">Código Decrescente</option>
            </select>
          </div>

          <div className="form-group">
            <label>Código:</label>
            <input
              type="text"
              value={filtros.codigo}
              onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
              placeholder="Filtrar por código"
            />
          </div>
          <div className="form-group">
            <label>Descrição:</label>
            <input
              type="text"
              value={filtros.descricao}
              onChange={(e) => setFiltros({ ...filtros, descricao: e.target.value })}
              placeholder="Filtrar por descrição"
            />
          </div>
          <div className="form-group">
            <label>Fornecedor:</label>
            <input
              type="text"
              value={filtros.fornecedor}
              onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
              placeholder="Filtrar por fornecedor"
            />
          </div>
          <div className="form-group">
            <label>Seção:</label>
            <select
              value={filtros.secao}
              onChange={(e) => setFiltros({ ...filtros, secao: e.target.value })}
            >
              <option value="">Todas</option>
              {Object.entries(secaoLabel).map(([cod, nome]) => (
                <option key={cod} value={cod}>{nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Grupo:</label>
            <select
              value={filtros.grupo}
              onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
            >
              <option value="">Todas</option>
              {Object.entries(grupoLabel).map(([cod, nome]) => (
                <option key={cod} value={cod}>{nome}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-actions">
            <div className="form-group checkbox-group">
                <label>
                <input
                    type="checkbox"
                    checked={filtros.apenasNegativos}
                    onChange={(e) => setFiltros({ ...filtros, apenasNegativos: e.target.checked })}
                />
                Apenas Estoque Negativo
                </label>
            </div>
            <button onClick={exportarParaExcel} className="btn-export">
                Exportar CSV
            </button>
        </div>
      </div>

      <div className="results-summary">
        <p>Total de registros: {dadosFiltrados.length}</p>
        {filtros.apenasNegativos && (
          <p className="negative-info">Mostrando apenas produtos com estoque negativo</p>
        )}
      </div>

      <div className="data-list">
        {dadosFiltrados.length > 0 ? (
          dadosFiltrados.map((item, idx) => (
            <div key={`${item.CODIGO_PRODUTO}-${item.CODIGO_ESTOQUE}-${idx}`}
                className={`data-card ${item.ESTOQUE < 0 ? 'negative-stock' : ''}`}>
                <div className="data-card__header">
                    <span className="data-card__title">{item.DESCRICAO}</span>
                    <span className="data-card__code">Cód: {item.CODIGO_PRODUTO}</span>
                </div>
                <div className="data-card__body">
                    <div className="data-card__item">
                        <strong>Estoque:</strong>
                        <span className={`data-card__stock ${item.ESTOQUE < 0 ? 'negative' : ''}`}>{formatarEstoque(item.ESTOQUE)}</span>
                    </div>
                    <div className="data-card__item">
                        <strong>Tipo Estoque:</strong>
                        <span>{item.TIPO_ESTOQUE}</span>
                    </div>
                    <div className="data-card__item">
                        <strong>Fornecedor:</strong>
                        <span>{item.FORNECEDOR || 'Sem fornecedor'} (Cód: {item.CODIGO_FORNECEDOR || '-'})</span>
                    </div>
                    <div className="data-card__item">
                        <strong>Seção:</strong>
                        <span>{secaoLabel[item.COD_SECAO] || 'Sem seção'}</span>
                    </div>
                    <div className="data-card__item">
                        <strong>Grupo:</strong>
                        <span>{grupoLabel[item.COD_GRUPO] || 'Sem grupo'}</span>
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div className="no-results-message">
            <p>Nenhum registro encontrado com os filtros aplicados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fornecedores;