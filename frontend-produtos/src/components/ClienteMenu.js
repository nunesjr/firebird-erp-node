import './ClienteMenu.css'; // Importando o CSS específico
import { NavLink } from 'react-router-dom';

function ClienteMenu() {
  return (
    <div className="menu-container">
      <nav className="menu-nav">
        <NavLink to="/app/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          Meu Dashboard
        </NavLink>
        <NavLink to="/app/minhas-compras" className={({ isActive }) => isActive ? 'active' : ''}>
          Minhas Compras
        </NavLink>
        <NavLink to="/app/meus-titulos" className={({ isActive }) => isActive ? 'active' : ''}>
          Meus Títulos
        </NavLink>
        <NavLink to="/app/fazer-pedido" className={({ isActive }) => isActive ? 'active' : ''}>
          Fazer Pedido
        </NavLink>
      </nav>
    </div>
  );
}

export default ClienteMenu;