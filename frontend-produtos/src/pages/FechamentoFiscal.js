import React, { useState, useCallback, useMemo, useEffect } from 'react';
import '../styles/common.css';
import './FechamentoFiscal.css';
import axios from 'axios';
import Cookies from 'js-cookie';
import { formatarMoeda } from '../utils/formatters';

const FechamentoFiscal = () => {

  const [dados, setDados] = useState({ saidas: [], entradas: [] });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const getPrimeiroDiaDoMes = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getUltimoDiaDoMes = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const [filtros, setFiltros] = useState({
    dataInicio: getPrimeiroDiaDoMes(),
    dataFim: getUltimoDiaDoMes(),
  });

  const carregarDados = useCallback(async () => {
    if (!filtros.dataInicio || !filtros.dataFim) {
        setErro('Por favor, selecione as datas de início e fim.');
        return;
    }

    try {
      setLoading(true);
      setErro(null);

      const token = Cookies.get('token');
      if (!token) {
        setErro('Usuário não autenticado. Por favor, faça login.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim,
          _t: new Date().getTime(),
      });

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/fechamento-fiscal?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setDados({ 
        saidas: response.data.saidas || [], 
        entradas: response.data.entradas || [] 
      });

    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const dadosAgregados = useMemo(() => {
    const aggregate = (data) => {
        const aggregated = data.reduce((acc, item) => {
            const cfop = item.CFOP;
            if (!acc[cfop]) {
                acc[cfop] = { CFOP: cfop, TOTAL: 0, VALOR_ICMS: 0, VALOR_PIS: 0, VALOR_COFINS: 0 };
            }
            acc[cfop].TOTAL += parseFloat(item.TOTAL || 0);
            acc[cfop].VALOR_ICMS += parseFloat(item.VALOR_ICMS || 0);
            acc[cfop].VALOR_PIS += parseFloat(item.VALOR_PIS || 0);
            acc[cfop].VALOR_COFINS += parseFloat(item.VALOR_COFINS || 0);
            return acc;
        }, {});

        return Object.values(aggregated).sort((a, b) => a.CFOP.localeCompare(b.CFOP));
    }

    return {
        saidas: aggregate(dados.saidas),
        entradas: aggregate(dados.entradas)
    }
  }, [dados]);

  const totais = useMemo(() => {
    const calculateTotals = (data) => {
        return data.reduce((acc, item) => {
            acc.TOTAL += item.TOTAL;
            acc.VALOR_ICMS += item.VALOR_ICMS;
            acc.VALOR_PIS += item.VALOR_PIS;
            acc.VALOR_COFINS += item.VALOR_COFINS;
            return acc;
        }, { TOTAL: 0, VALOR_ICMS: 0, VALOR_PIS: 0, VALOR_COFINS: 0 });
    };

    const totaisSaidas = calculateTotals(dadosAgregados.saidas);
    const totaisEntradas = calculateTotals(dadosAgregados.entradas);

    const diferencaTotal = totaisSaidas.TOTAL - totaisEntradas.TOTAL;

    const impostosAPagar = {
        icms: totaisSaidas.VALOR_ICMS - totaisEntradas.VALOR_ICMS,
        pis: totaisSaidas.VALOR_PIS - totaisEntradas.VALOR_PIS,
        cofins: totaisSaidas.VALOR_COFINS - totaisEntradas.VALOR_COFINS,
    };

    return { totaisSaidas, totaisEntradas, impostosAPagar, diferencaTotal };
  }, [dadosAgregados]);

  const handleGerarRelatorio = () => {
      carregarDados();
  };

  const renderImpostoCard = (nome, valor) => {
    const isCredor = valor < 0;
    const titulo = isCredor ? `Saldo Credor de ${nome}` : `${nome} a Pagar`;
    const valorFormatado = formatarMoeda(isCredor ? Math.abs(valor) : valor);
    const classeCSS = isCredor ? 'negativo' : 'positivo';

    return (
      <div className={`erp-card erp-summary-card ${classeCSS}`}>
        <h3>{titulo}</h3>
        <p>{valorFormatado}</p>
      </div>
    );
  };

  return (
    <div className="erp-main-content">
            <div className="erp-content-header">
        <h2>Fechamento Fiscal por CFOP</h2>
        <p>Analise de débitos e créditos de impostos (ICMS, PIS/COFINS) para apuração fiscal.</p>
      </div>

      {erro && <div className="erp-error-message"><p>{erro}</p></div>}

      <div className="erp-card">
        <h3>Filtros</h3>
        <div className="erp-filter-grid">
          <div className="erp-form-group">
            <label>Data de Início:</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} />
          </div>
          <div className="erp-form-group">
            <label>Data de Fim:</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} />
          </div>
           <div className="erp-filter-group-button">
             <button onClick={handleGerarRelatorio} className="erp-btn erp-btn-primary" disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar Relatório'}
             </button>
           </div>
        </div>
      </div>

      {loading && <p className="erp-loading-message">Carregando dados...</p>}

      {!loading && !erro && (dados.saidas.length > 0 || dados.entradas.length > 0) && (
        <>
          <div className="erp-fiscal-summary">
            <div className={`erp-card erp-summary-card ${totais.diferencaTotal >= 0 ? 'positivo' : 'negativo'}`}>
                <h3>Diferença (Saídas - Entradas)</h3>
                <p>{formatarMoeda(totais.diferencaTotal)}</p>
            </div>
            {renderImpostoCard('ICMS', totais.impostosAPagar.icms)}
            {renderImpostoCard('PIS', totais.impostosAPagar.pis)}
            {renderImpostoCard('COFINS', totais.impostosAPagar.cofins)}
          </div>

          <div className="erp-fiscal-tables-container">
            <div className="erp-table-wrapper">
              <h3>Saídas (Débitos) por CFOP</h3>
              <div className="erp-table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>CFOP</th>
                      <th>Total</th>
                      <th>ICMS</th>
                      <th>PIS</th>
                      <th>COFINS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosAgregados.saidas.map((item, idx) => (
                      <tr key={`saida-${idx}`}>
                        <td>{item.CFOP}</td>
                        <td>{formatarMoeda(item.TOTAL)}</td>
                        <td>{formatarMoeda(item.VALOR_ICMS)}</td>
                        <td>{formatarMoeda(item.VALOR_PIS)}</td>
                        <td>{formatarMoeda(item.VALOR_COFINS)}</td>
                      </tr>
                    ))}
                  </tbody>
                   <tfoot>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisSaidas.TOTAL)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisSaidas.VALOR_ICMS)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisSaidas.VALOR_PIS)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisSaidas.VALOR_COFINS)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="erp-table-wrapper">
              <h3>Entradas (Créditos) por CFOP</h3>
              <div className="erp-table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>CFOP</th>
                      <th>Total</th>
                      <th>ICMS</th>
                      <th>PIS</th>
                      <th>COFINS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosAgregados.entradas.map((item, idx) => (
                      <tr key={`entrada-${idx}`}>
                        <td>{item.CFOP}</td>
                        <td>{formatarMoeda(item.TOTAL)}</td>
                        <td>{formatarMoeda(item.VALOR_ICMS)}</td>
                        <td>{formatarMoeda(item.VALOR_PIS)}</td>
                        <td>{formatarMoeda(item.VALOR_COFINS)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisEntradas.TOTAL)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisEntradas.VALOR_ICMS)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisEntradas.VALOR_PIS)}</strong></td>
                        <td><strong>{formatarMoeda(totais.totaisEntradas.VALOR_COFINS)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && !erro && dados.saidas.length === 0 && dados.entradas.length === 0 && (
        <div className="erp-no-results-message">
          <p>Nenhum dado a ser exibido para o período selecionado. Por favor, ajuste os filtros e gere o relatório.</p>
        </div>
      )}
    </div>
  );
};

export default FechamentoFiscal;