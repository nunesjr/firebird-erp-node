import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/DashboardERP.css';

// Componentes da UI (menu, etc.)
import Menu from './Menu';

// ✨ NOVO: Importe a DashboardHome
import DashboardHome from '../pages/DashboardHome';

// Componentes das Páginas (depois do login)

import Fornecedores from '../pages/Fornecedores';
import EstoqueNegativo from '../pages/EstoqueNegativo';
import PorSecao from '../pages/PorSecao';
import TabelaPrecos from '../pages/TabelaPrecos';
import DownloadsPDF from '../pages/DownloadsPDF';
import VendasTempoReal from '../pages/VendasTempoReal'; // Este é "Vendas em Tempo Real", não "Resumo de Vendas"
import LiberarRDP from '../pages/LiberarRDP';
import Usuarios from '../pages/GerenciarUsuariosPage';
// ✨ ADIÇÃO: Importe o componente ResumoVendas
import ResumoVendas from '../pages/ResumoVendas'; // **VERIFIQUE SE O NOME DO ARQUIVO E O CAMINHO ESTÃO CORRETOS!**
import PedidoCompras from '../pages/PedidoDeCompras';
import Financeiro from '../pages/FinanceiroPage';
import MapaClientes from '../pages/MapaClientes';
import FechamentoFiscal from '../pages/FechamentoFiscal';
import ControleEntregas from '../pages/ControleEntregas';
import PrecosDeVenda from '../pages/PrecosDeVenda';

// Rota protegida (mantida aqui para referência)
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

function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const toggleMenu = () => {
    setIsMenuCollapsed(!isMenuCollapsed);
  };

  return (
    <div className={`erp-layout ${isMenuCollapsed ? 'menu-collapsed' : ''}`}>
      {usuario && (
        <>
          <aside className={`erp-sidebar ${isMenuCollapsed ? 'collapsed' : ''}`}>
            <div className="erp-sidebar-header">
              <h1>Varejão Frutos da Terra</h1>
            </div>
            <Menu isMenuCollapsed={isMenuCollapsed} />
          </aside>
          <button onClick={toggleMenu} className="erp-menu-toggle">
            {isMenuCollapsed ? '▶' : '◀'}
          </button>
        </>
      )}

      <div className="erp-main-content">
        <header className="erp-content-header">
          <h2>Sistema integrado Frutos da Terra Comercio & Distribuidora LTDA.</h2>
          {usuario && (
            <div className="erp-user-info">
              <p>Bem-vindo, {usuario.username} ({usuario.role})</p>
              <button onClick={logout} className="erp-btn-logout">Sair</button>
            </div>
          )}
        </header>

        <main className="erp-content-area">
          <Routes>
            {/* ✨ CORREÇÃO AQUI: A rota padrão '/' agora renderiza DashboardHome */}
            <Route path="/" element={
              <PrivateRoute allowedRoles={["admin", "cliente"]}> {/* Todos os usuários logados podem ver a Home */}
                <DashboardHome />
              </PrivateRoute>
            } />
            {/* Suas outras rotas permanecem inalteradas */}
            <Route path="/fornecedores" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <Fornecedores />
              </PrivateRoute>
            } />
            <Route path="/tabela-precos" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <TabelaPrecos />
              </PrivateRoute>
            } />
            <Route path="/downloads-pdf" element={
              <PrivateRoute allowedRoles={["admin", "cliente"]}>
                <DownloadsPDF />
              </PrivateRoute>
            } />
            <Route path="/estoque-negativo" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <EstoqueNegativo />
              </PrivateRoute>
            } />
            <Route path="/vendas" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <VendasTempoReal />
              </PrivateRoute>
            } />
            <Route path="/por-secao" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <PorSecao />
              </PrivateRoute>
            } />
            <Route path="/liberar-rdp" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <LiberarRDP />
              </PrivateRoute>
            } />
            <Route path="/gerenciar-usuarios" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <Usuarios />
              </PrivateRoute>
            } />

            {/* ✨ ADIÇÃO: Rota para "Resumo de Vendas" */}
            {/* IMPORTANTE: O 'path' AQUI DEVE SER EXATAMENTE IGUAL AO 'to' DO SEU <Link> NO Menu.js! */}
            {/* Assumindo que o link no menu seja <Link to="/resumo-vendas"> */}
            <Route path="/controle-entregas" element={
              <PrivateRoute allowedRoles={["admin"/* , "cliente" */]}> {/* Ajuste os roles permitidos conforme necessário */}
                <ControleEntregas />
              </PrivateRoute>
            } />
            <Route path="/precos-venda" element={
              <PrivateRoute allowedRoles={["admin"/* , "cliente" */]}> {/* Ajuste os roles permitidos conforme necessário */}
                <PrecosDeVenda />
              </PrivateRoute>
            } />
            <Route path="/resumo-vendas" element={
              <PrivateRoute allowedRoles={["admin"/* , "cliente" */]}> {/* Ajuste os roles permitidos conforme necessário */}
                <ResumoVendas />
              </PrivateRoute>
            } />
            <Route path="/pedido-compras" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <PedidoCompras />
              </PrivateRoute>
            } />

            <Route path="/financeiro" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <Financeiro />
              </PrivateRoute>
            } />

            <Route path="/mapaclientes" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <MapaClientes />
              </PrivateRoute>
            } />

            <Route path="/fechamento-fiscal" element={
              <PrivateRoute allowedRoles={["admin"]}>
                <FechamentoFiscal />
              </PrivateRoute>
            } />

            {/* Rota catch-all para redirecionar para a raiz do dashboard
              se o usuário estiver logado e tentar acessar uma rota inválida dentro do dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="erp-footer">
          <p>&copy; {new Date().getFullYear()} Frutos da Terra Comercio & Distribuidora LTDA. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}

export default DashboardLayout;
