import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import '../styles/common.css';
import './LiberarRDP.css';

function LiberarRDP() {
  const [ip, setIp] = useState('');
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ipDetectionError, setIpDetectionError] = useState(false);

  // Regex IPv4 mais robusta para validação no frontend
  const ipV4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // 1. Verifica usuário logado e autorização
  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      setMsg('Autenticação necessária. Por favor, faça login.');
      setCheckingToken(false);
      return;
    }

    fetch('/api/verify-token', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Não autorizado ou token inválido.');
          }
          throw new Error('Erro na verificação do token.');
        }
        return res.json();
      })
      .then(data => {
        if (data.valid && data.user.role === 'admin') {
          setUser(data.user);
          detectarIpPublico();
        } else {
          setMsg('Acesso restrito a administradores. Seu usuário não tem permissão.');
        }
      })
      .catch(error => {
        setMsg(error.message || 'Erro ao verificar token.');
        console.error('Erro na verificação de token:', error);
      })
      .finally(() => setCheckingToken(false));
  }, []);

  // 2. Detectar IP público automaticamente
  const detectarIpPublico = () => {
    fetch('https://api.ipify.org?format=json')
      .then(res => {
        if (!res.ok) {
          throw new Error('Não foi possível obter o IP.');
        }
        return res.json();
      })
      .then(data => setIp(data.ip))
      .catch(error => {
        setIpDetectionError(true);
        setMsg('Não foi possível detectar seu IP público automaticamente. Por favor, insira-o manualmente.');
        console.error('Erro ao detectar IP público:', error);
      });
  };

  // 3. Envia IP para liberação
  const liberar = async () => {
    setLoading(true);
    setMsg('');
    const token = Cookies.get('token');

    // ✨ MUDANÇA: Trim para remover espaços e nova regex mais robusta
    const trimmedIp = ip.trim();
    if (!trimmedIp || !ipV4Regex.test(trimmedIp)) { // Usando a nova regex
      setMsg('Por favor, insira um endereço IP válido no formato IPv4 (ex: 192.168.1.1).');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/liberar-rdp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ip: trimmedIp }) // ✨ MUDANÇA: Envia o IP "trimado"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha na solicitação de liberação.');
      }
      setMsg(data.message || 'Acesso liberado com sucesso!');
    } catch (err) {
      setMsg(err.message || 'Erro na solicitação de liberação.');
      console.error('Erro ao liberar RDP:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enquanto o token está sendo verificado, mostra um loader
  if (checkingToken) {
    return (
      <div className="erp-main-content">
        <p className="loading-message">Carregando dados de autenticação...</p>
      </div>
    );
  }

  // Componente principal
  return (
    <div className="erp-main-content">
      <div className="erp-content-header">
        <h2 className="rdp-title">Liberar Acesso RDP</h2>

        {!user ? (
          <p className="error-message">{msg}</p>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="ipInput">
                Seu IP público:
              </label>
              <input
                id="ipInput"
                type="text"
                value={ip}
                onChange={e => setIp(e.target.value)}
                readOnly={!ipDetectionError && ip}
                disabled={loading}
                className="form-control"
                placeholder="Ex: 192.168.1.1"
              />
              {ipDetectionError && (
                <p className="ip-detection-error">
                  Não foi possível detectar automaticamente. Por favor, verifique e digite seu IP.
                </p>
              )}
            </div>

            <button
              onClick={liberar}
              className="rdp-button"
              disabled={loading}
            >
              {loading ? 'Liberando...' : 'Liberar Acesso RDP'}
            </button>

            {msg && (
              <p
                className={msg.toLowerCase().includes('sucesso') ? 'message-box success' : (msg.toLowerCase().includes('erro') || msg.toLowerCase().includes('falha') || msg.toLowerCase().includes('negado') || msg.toLowerCase().includes('restrito') ? 'message-box error' : 'message-box warning')}
              >
                {msg}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LiberarRDP;
