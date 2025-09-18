import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ClienteMenu from './ClienteMenu'; // Importa o menu específico do cliente
import './ClienteLayout.css';

function ClienteLayout({ children }) { // Adicionado children
  const { usuario, logout, loading } = useAuth();

  // Enquanto verifica a autenticação, exibe um loader
  if (loading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <p>Carregando...</p>
        </div>
    );
  }

  // Se não houver usuário, redireciona para o login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário não for um cliente (ou admin), redireciona ou mostra acesso negado
  if (usuario.role !== 'cliente' && usuario.role !== 'admin') {
      return <Navigate to="/login" replace />; // Ou uma página de acesso negado
  }

  return (
    <div className="client-layout-container"> {/* Usando estilos específicos do cliente */}
      <header className="client-header">
        <h2>Portal do Cliente</h2>
        <div className="header-controls">
            <p>Bem-vindo, {usuario.apelido || usuario.username}</p>
            <button onClick={logout} className="btn-logout">Sair</button>
        </div>
      </header>

      {usuario && <ClienteMenu />}

      <main className="client-content">
        {children}
      </main>
      
      <footer className="client-footer">
        <p>&copy; {new Date().getFullYear()} Frutos da Terra Comercio & Distribuidora LTDA. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default ClienteLayout;