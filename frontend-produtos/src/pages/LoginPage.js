import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/common.css';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Chama a função de login do seu contexto de autenticação
      const result = await login(username.trim(), password);

      if (result.success) {
        // ✨ CORREÇÃO AQUI: Redireciona para a rota /app (onde seu DashboardLayout está montado)
        navigate('/app'); 
      } else {
        console.log('Login result (failure):', result); // Log para depuração
        // Exibe a mensagem de erro retornada pelo backend ou uma padrão
        setError(result.message || 'Usuário ou senha inválidos. Verifique suas credenciais.');
      }
    } catch (err) {
      // Erro de rede, servidor fora do ar, etc.
      setError('Erro inesperado ao tentar fazer login. Verifique sua conexão ou tente novamente mais tarde.');
      console.error('Erro no login:', err);
    } finally {
      setLoading(false);
    }
  };

  // Limpa o erro quando o usuário começa a digitar em qualquer campo
  const handleInputChange = (setter) => (e) => {
    setError(null);
    setter(e.target.value);
  };

  return (
    <div className="login-container">
      <div className="login-box" role="main" aria-label="Formulário de login">
        <h2>Login no Sistema ERP</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="username">Usuário:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleInputChange(setUsername)}
              autoComplete="username"
              required
              aria-describedby={error ? 'error-message' : undefined}
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              autoCapitalize="off" // Geralmente bom para senhas
              autoComplete="current-password"
              required
              aria-describedby={error ? 'error-message' : undefined}
              disabled={loading}
            />
          </div>
          {error && (
            <p id="error-message" className="error-message" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
