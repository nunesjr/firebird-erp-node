import React from 'react';
import { Link } from 'react-router-dom'; // Para criar links para as outras páginas
import { useAuth } from '../context/AuthContext'; // Para pegar o nome do usuário
import '../styles/common.css';
import './DashboardHome.css';

const DashboardHome = () => {
  const { usuario } = useAuth(); // Pega as informações do usuário logado

  return (
    <div className="dashboard-home-container">
      <h2>Bem-vindo a Frutos da Terra Comercio & Distribuidora LTDA., {usuario?.username || 'Usuário'}!</h2>
      <p>
        Este é o painel principal de consulta de dados. Aqui você terá acesso rápido a diversas ferramentas e informações cruciais para a gestão do seu negócio.
      </p>

      <div className="home-sections">
        {/*
          CORRIGIDO: O link para vendas foi ajustado para corresponder à rota '/app/resumo-vendas'
          definida no seu App.js.
        */}

        {/*
          NOTA: Certifique-se de que as rotas 'fornecedores' e 'por-secao'
          estão definidas no seu App.js, caso contrário, estes links não funcionarão.
        */}
        <section className="home-card">
          <h3>Gestão de Estoque e Preços</h3>
          <p>Consulte o custo de reposição, gerencie fornecedores, verifique o estoque negativo e visualize a tabela de preços de forma eficiente.</p>
          <Link to="/app/fornecedores" className="btn-home-action">Gerenciar Produtos</Link>
        </section>

        <section className="home-card">
          <h3>Relatórios e Análises</h3>
          <p>Explore relatórios detalhados por seção e acesse documentos importantes na área de downloads em PDF para uma análise aprofundada.</p>
          <Link to="/app/por-secao" className="btn-home-action">Ver Relatórios</Link>
        </section>
        
        {/* Links condicionalmente renderizados apenas para o role 'admin' */}
        {usuario?.role === 'admin' && (
          <>
            <section className="home-card">
              <h3>Liberação RDP</h3>
              <p>Solicite aqui seu acesso RDP. Lembrando que ele expira em 12hrs ou quando seu IP publico alterar.</p>
              <Link to="/app/liberar-rdp" className="btn-home-action">Acessar Ferramenta RDP</Link>
            </section>

            <section className="home-card">
              <h3>Vendas em Tempo Real</h3>
              <p>Acompanhe o desempenho das suas vendas minuto a minuto, filtre por períodos e visualize dados essenciais para tomar decisões ágeis.</p>
              <Link to="/app/resumo-vendas" className="btn-home-action">Acessar Vendas</Link>
              </section>
            {/* NOVO: Adicionado um link para a página de logs RDP */}
            {/* <section className="home-card">
              <h3>Logs de Liberação RDP</h3>
              <p>Visualize o histórico completo de todas as liberações de acesso RDP.</p>
              <Link to="/app/rdp-logs" className="btn-home-action">Ver Logs</Link>
            </section> */}
          </>
        )}
      </div>

      <p className="home-footer-text">
        Use o menu lateral ou superior para navegar por todas as funcionalidades disponíveis.
      </p>
    </div>
  );
};

export default DashboardHome;
