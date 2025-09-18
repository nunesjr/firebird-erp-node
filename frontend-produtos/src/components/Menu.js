import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/DashboardERP.css'; // Importar o novo CSS // Importar o novo CSS

// 1. Centralizamos a definição de TODOS os itens de menu possíveis em um só lugar.
//    Cada item agora tem uma propriedade `roles` que é um array com os perfis que podem vê-lo.
//    Adicionamos também uma propriedade `permission` para controle de acesso mais granular.
const ALL_MENU_ITEMS = [
    { path: '/app/', label: 'Início (Dashboard)', icon: '🏠', roles: ['admin', 'cliente', 'default'] },
    { path: '/app/fornecedores', label: 'Estoque e Fornecedores', icon: '📦', roles: ['admin'], permission: 'VIEW_FORNECEDORES' },
    { path: '/app/tabela-precos', label: 'Tabela de Preços', icon: '💲', roles: ['admin'], permission: 'VIEW_TABELA_PRECOS' },
    { path: '/app/precos-venda', label: 'Preços de Venda', icon: '💸', roles: ['admin'], permission: 'VIEW_PRECOS_VENDA' },
    /* { path: '/app/downloads-pdf', label: 'Downloads PDF', icon: '📄', roles: ['admin', 'cliente'], permission: 'VIEW_DOWNLOADS_PDF' }, */
    /* { path: '/app/vendas-tempo-real', label: 'Vendas em Tempo Real', icon: '💲', roles: ['admin'], permission: 'VIEW_VENDAS_TEMPO_REAL' }, */
    /* { path: '/app/estoque-negativo', label: 'Estoque Negativo', icon: '⚠️', roles: ['admin'], permission: 'VIEW_ESTOQUE_NEGATIVO' }, */
    /* { path: '/app/por-secao', label: 'Por Seção', icon: '📊', roles: ['admin'], permission: 'VIEW_POR_SECAO' }, */
    { path: '/app/resumo-vendas', label: 'Resumo de Vendas', icon: '📈', roles: ['admin', 'cliente'], permission: 'VIEW_RESUMO_VENDAS' },
    { path: '/app/pedido-compras', label: 'Pedido de Compras', icon: '🛒', roles: ['admin'], permission: 'VIEW_PEDIDO_COMPRAS' },
    { path: '/app/controle-entregas', label: 'Controle de Entregas', icon: '🚚', roles: ['admin'], permission: 'MANAGE_ENTREGAS' },
    { path: '/app/liberar-rdp', label: 'Liberar RDP', icon: '🖥️', roles: ['admin'], permission: 'VIEW_LIBERAR_RDP' },
    { path: '/app/gerenciar-usuarios', label: 'Gerenciar Usuários', icon: '👨🏼‍💻', roles: ['admin'], permission: 'MANAGE_USERS' },
    { path: '/app/financeiro', label: 'Financeiro', icon: '💰', roles: ['admin'], permission: 'VIEW_FINANCEIRO' },
    { path: '/app/mapaclientes', label: 'Mapa de Clientes', icon: '🗺️', roles: ['admin'], permission: 'VIEW_MAPA_CLIENTES' },
    { path: '/app/fechamento-fiscal', label: 'Fechamento Fiscal', icon: '🧾', roles: ['admin'], permission: 'VIEW_FECHAMENTO_FISCAL' },
    /* { path: '/app/custo-reposicao', label: 'Custo de Reposição', icon: '💲', roles: ['admin'], permission: 'VIEW_CUSTO_REPOSICAO' }, */
    /* { path: '/app/rdp-logs', label: 'Logs RDP', icon: '📜', roles: ['admin'], permission: 'VIEW_RDP_LOGS' }, */
];

const Menu = ({ isMenuCollapsed }) => {
    const location = useLocation();
    const { usuario, hasPermission } = useAuth(); // Pega hasPermission do contexto

    // 2. Determinamos o perfil do usuário atual. Se não houver usuário ou perfil, usamos 'default'.
    const userRole = usuario?.role || 'default';

    // 3. Filtramos a lista de menus com base no perfil do usuário E nas permissões.
    const menuItems = ALL_MENU_ITEMS.filter(item => {
        const hasRole = item.roles.includes(userRole);
        const hasRequiredPermission = item.permission ? hasPermission(item.permission) : true;
        return hasRole && hasRequiredPermission;
    });

    return (
        <nav className="erp-sidebar-nav">
            <ul>
                {menuItems.map((item) => (
                    <li key={item.path}>
                        <Link
                            to={item.path}
                            className={location.pathname === item.path ? 'active' : ''}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Menu;
