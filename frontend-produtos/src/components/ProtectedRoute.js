// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { usuario, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Carregando autenticação...</div>;
  }

  if (!usuario) {
    // Usuário não logado, redireciona para a página de login, guardando a página que ele tentou acessar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.role)) {
    // Usuário logado, mas sem a role permitida. Redireciona para uma página de "Acesso Negado".
    return <Navigate to="/app/acesso-negado" replace />; // Crie essa página de acesso negado
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Usuário logado, mas sem a permissão necessária. Redireciona para uma página de "Acesso Negado".
    return <Navigate to="/app/acesso-negado" replace />;
  }

  return children;
};

export default ProtectedRoute;