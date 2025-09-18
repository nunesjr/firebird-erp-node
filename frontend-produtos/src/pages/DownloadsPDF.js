import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie'; // ✅ Importa para pegar o token JWT


const DownloadsPDF = () => {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    carregarArquivos();
  }, []);

  const carregarArquivos = async () => {
    try {
      setLoading(true);
      setErro(null);

      const token = Cookies.get('token'); // ✅ Pega o token do cookie
      if (!token) {
        setErro('Usuário não autenticado. Faça login para continuar.');
        setLoading(false);
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get('http://varejaofdt.ddns.net/lista-pdfs', config);
      setArquivos(response.data.arquivos || []);

    } catch (err) {
      console.error('Erro ao carregar lista de PDFs:', err);

      if (err.response?.status === 401) {
        setErro('Sessão expirada ou token inválido. Faça login novamente.');
      } else {
        setErro('Erro ao carregar lista de arquivos. Verifique se o servidor está rodando.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtrarArquivos = (arquivo) => {
    if (!filtro) return true;
    return arquivo.nomeExibicao.toLowerCase().includes(filtro.toLowerCase());
  };

  const arquivosFiltrados = arquivos.filter(filtrarArquivos);

  const handleDownload = (arquivo) => {
    const link = document.createElement('a');
    link.href = `http://varejaofdt.ddns.net${arquivo.url}`;
    link.download = arquivo.nome;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVisualizarPDF = (arquivo) => {
    window.open(`http://varejaofdt.ddns.net${arquivo.url}`, '_blank');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando arquivos PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Downloads de PDF</h2>
        <p>Documentos e arquivos disponíveis para download</p>
      </div>

      {erro && (
        <div className="error-message">
          <p>{erro}</p>
          {!erro.includes('autenticado') && (
            <button onClick={carregarArquivos} className="btn-retry">
              Tentar Novamente
            </button>
          )}
        </div>
      )}

      {!erro && (
        <>
          <div className="filters-container">
            <div className="filter-group">
              <label>Buscar arquivo:</label>
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Digite o nome do arquivo..."
              />
            </div>
            <button onClick={carregarArquivos} className="btn-refresh">
              Atualizar Lista
            </button>
          </div>

          <div className="files-info">
            <p>Total de arquivos: {arquivosFiltrados.length}</p>
            {filtro && <p>Filtrados por: "{filtro}"</p>}
          </div>

          {arquivosFiltrados.length > 0 ? (
            <div className="files-grid">
              {arquivosFiltrados.map((arquivo, index) => (
                <div key={index} className="file-card">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <h3 className="file-name">{arquivo.nomeExibicao}</h3>
                    <div className="file-details">
                      <span className="file-size">{arquivo.tamanho}</span>
                      <span className="file-date">Modificado: {arquivo.dataModificacao}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button onClick={() => handleVisualizarPDF(arquivo)} className="btn-view">
                      👁️ Visualizar
                    </button>
                    <button onClick={() => handleDownload(arquivo)} className="btn-download">
                      ⬇️ Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-files">
              {filtro ? (
                <p>Nenhum arquivo encontrado com o termo "{filtro}"</p>
              ) : (
                <div>
                  <p>Nenhum arquivo PDF encontrado.</p>
                  <p className="help-text">
                    Para adicionar arquivos, coloque os PDFs na pasta <code>pdfs</code> 
                    na raiz do projeto e clique em "Atualizar Lista".
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DownloadsPDF;