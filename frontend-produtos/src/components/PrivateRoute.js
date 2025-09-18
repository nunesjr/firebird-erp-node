import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />; // Redireciona para o login se não autenticado
  }

  if (allowedRoles && !allowedRoles.includes(usuario.role)) {
    return (
      <div className="unauthorized-container">
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <button onClick={() => window.history.back()} className="btn-back">Voltar</button>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;