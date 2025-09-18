import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';


function RdpLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      setError('Autenticação necessária. Por favor, faça login.');
      setLoading(false);
      return;
    }

    // A rota que criamos no backend para listar os logs
    fetch('http://varejaofdt.ddns.net/rdp-logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Acesso negado ou token inválido.');
        }
        if (!res.ok) {
          throw new Error('Erro ao buscar os logs RDP.');
        }
        return res.json();
      })
      .then(data => {
        setLogs(data);
      })
      .catch(err => {
        console.error('Erro ao buscar logs:', err);
        setError(err.message || 'Falha ao carregar os logs.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="loading-message">Carregando logs...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="page-container">
      <h2 className="page-header">Logs de Liberação RDP</h2>
      {logs.length > 0 ? (
        <table className="data-table-rdplog">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuário</th>
              <th>IP Liberado</th>
              <th>Ação</th>
              <th>Data e Hora</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.username}</td>
                <td>{log.ip}</td>
                <td>{log.action}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-data">Nenhum log de liberação RDP encontrado.</p>
      )}
    </div>
  );
}

export default RdpLogs;
