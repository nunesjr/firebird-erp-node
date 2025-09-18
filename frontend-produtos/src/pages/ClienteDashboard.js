import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '../context/AuthContext';

import '../styles/common.css';
import './ClienteDashboard.css'; // Importando o CSS específico
import { Bar } from 'react-chartjs-2';

// ⬇️ Registrar escalas e elementos necessários
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function ClienteDashboard() {
  const { usuario } = useAuth();
  const [topProdutos, setTopProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!usuario) {
      setLoading(false);
      return;
    }
    const fetchDashboardData = async () => {
      try {
        const token = Cookies.get('token');
        if (!token) {
          setError('Token de autenticação não encontrado.');
          setLoading(false);
          return;
        }
        const response = await fetch('/api/cliente/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao carregar dados do dashboard.');
        const data = await response.json();
        setTopProdutos(data.topProdutos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [usuario]);

  if (loading) return <p>Carregando dashboard...</p>;
  if (error) return <p className="error-message">{error}</p>;

  // Dados para o gráfico
  const chartData = {
    labels: topProdutos.map(p => p.NOME_PRODUTO),
    datasets: [
      {
        label: 'Quantidade Total Comprada',
        data: topProdutos.map(p => p.QUANTIDADE_TOTAL),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Opções do gráfico
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top 10 Produtos Mais Comprados',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantidade',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Produto',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 30,
          autoSkip: false, // evita ocultar rótulos
        },
      },
    },
  };

  return (
    <div className="page-container">
      <h2>Meu Dashboard</h2>
      <p className="dashboard-intro">Aqui você pode ver um resumo dos seus produtos mais comprados.</p>

      <div
        className="chart-container"
        style={{ marginTop: '30px', width: '100%', maxWidth: '1000px', marginInline: 'auto' }}
      >
        {topProdutos.length === 0 ? (
          <p>Nenhum produto encontrado no seu histórico de compras para exibir no gráfico.</p>
        ) : (
          <Bar data={chartData} options={chartOptions} height={120} />
        )}
      </div>
    </div>
  );
}

export default ClienteDashboard;
