import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


// Contexto
import { AuthProvider } from './context/AuthContext';

// --- Páginas e Layouts ---
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import ClienteLayout from './components/ClienteLayout';
import DashboardHome from './pages/DashboardHome';
import ResumoVendas from './pages/ResumoVendas';
import PedidoCompras from './pages/PedidoDeCompras';
import LiberarRDP from './pages/LiberarRDP';
import GerenciarUsuarios from './pages/GerenciarUsuariosPage';
import TabelaPrecos from './pages/TabelaPrecos';
import ClienteDashboard from './pages/ClienteDashboard';
import MinhasCompras from './pages/MinhasCompras';
import FazerPedido from './pages/FazerPedido';
import MeusTitulos from './pages/MeusTitulos';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // Importa o ProtectedRoute do diretório raiz
import FinanceiroPage from './pages/FinanceiroPage';
import MapaClientes from './pages/MapaClientes';
import Fornecedores from './pages/Fornecedores';
import FechamentoFiscal from './pages/FechamentoFiscal';
import EstoqueNegativo from './pages/EstoqueNegativo';
import CustoReposicao from './pages/CustoReposicao';
import RdpLogs from './pages/RdpLogs';
import VendasTempoReal from './pages/VendasTempoReal';
import PorSecao from './pages/PorSecao';
import DownloadsPDF from './pages/DownloadsPDF';
import ControleEntregas from './pages/ControleEntregas';
import PrecosDeVenda from './pages/PrecosDeVenda'; // Adicionando import

// Componente de Acesso Negado
const AccessDenied = () => (
  <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
    <h2>Acesso Negado</h2>
    <p>Você não tem permissão para acessar esta página.</p>
  </div>
);

const AppRoutes = () => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!usuario ? <LoginPage /> : <Navigate to="/app" replace />} />
      <Route path="/app/*" element={usuario ? <ProtectedApp /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={usuario ? "/app" : "/"} replace />} />
    </Routes>
  );
};

const ProtectedApp = () => {
  const { usuario } = useAuth();

  if (usuario.role === 'admin') {
    return (
      <DashboardLayout>
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="resumo-vendas" element={<ProtectedRoute requiredPermission="VIEW_RESUMO_VENDAS"><ResumoVendas /></ProtectedRoute>} />
          <Route path="pedido-compras" element={<ProtectedRoute requiredPermission="VIEW_PEDIDO_COMPRAS"><PedidoCompras /></ProtectedRoute>} />
          <Route path="liberar-rdp" element={<ProtectedRoute requiredPermission="VIEW_LIBERAR_RDP"><LiberarRDP /></ProtectedRoute>} />
          <Route path="gerenciar-usuarios" element={<ProtectedRoute requiredPermission="MANAGE_USERS"><GerenciarUsuarios /></ProtectedRoute>} />
          <Route path="tabela-precos" element={<ProtectedRoute requiredPermission="VIEW_TABELA_PRECOS"><TabelaPrecos /></ProtectedRoute>} />
          <Route path="precos-venda" element={<ProtectedRoute requiredPermission="VIEW_PRECOS_VENDA"><PrecosDeVenda /></ProtectedRoute>} /> {/* Adicionando rota */}
          <Route path="financeiro" element={<ProtectedRoute requiredPermission="VIEW_FINANCEIRO"><FinanceiroPage /></ProtectedRoute>} />
          <Route path="mapaclientes" element={<ProtectedRoute requiredPermission="VIEW_MAPA_CLIENTES"><MapaClientes /></ProtectedRoute>} />
          <Route path="fornecedores" element={<ProtectedRoute requiredPermission="VIEW_FORNECEDORES"><Fornecedores /></ProtectedRoute>} />
          <Route path="fechamento-fiscal" element={<ProtectedRoute requiredPermission="VIEW_FECHAMENTO_FISCAL"><FechamentoFiscal /></ProtectedRoute>} />
          <Route path="estoque-negativo" element={<ProtectedRoute requiredPermission="VIEW_ESTOQUE_NEGATIVO"><EstoqueNegativo /></ProtectedRoute>} />
          <Route path="custo-reposicao" element={<ProtectedRoute requiredPermission="VIEW_CUSTO_REPOSICAO"><CustoReposicao /></ProtectedRoute>} />
          <Route path="rdp-logs" element={<ProtectedRoute requiredPermission="VIEW_RDP_LOGS"><RdpLogs /></ProtectedRoute>} />
          <Route path="vendas-tempo-real" element={<ProtectedRoute requiredPermission="VIEW_VENDAS_TEMPO_REAL"><VendasTempoReal /></ProtectedRoute>} />
          <Route path="por-secao" element={<ProtectedRoute requiredPermission="VIEW_POR_SECAO"><PorSecao /></ProtectedRoute>} />
          <Route path="downloads-pdf" element={<ProtectedRoute requiredPermission="VIEW_DOWNLOADS_PDF"><DownloadsPDF /></ProtectedRoute>} />
          <Route path="controle-entregas" element={<ProtectedRoute requiredPermission="MANAGE_ENTREGAS"><ControleEntregas /></ProtectedRoute>} />
          <Route path="acesso-negado" element={<AccessDenied />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </DashboardLayout>
    );
  } else if (usuario.role === 'cliente') {
    return (
      <ClienteLayout>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={["cliente"]}>
              <ClienteDashboard />
            </ProtectedRoute>
          } />
          <Route path="minhas-compras" element={
            <ProtectedRoute allowedRoles={["cliente"]}>
              <MinhasCompras />
            </ProtectedRoute>
          } />
          <Route path="fazer-pedido" element={
            <ProtectedRoute allowedRoles={["cliente"]}>
              <FazerPedido />
            </ProtectedRoute>
          } />
          <Route path="meus-titulos" element={
            <ProtectedRoute allowedRoles={["cliente"]}>
              <MeusTitulos />
            </ProtectedRoute>
          } />
          <Route path="acesso-negado" element={<AccessDenied />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </ClienteLayout>
    );
  } else {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
