import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h2 className="logo">Espacio Senda</h2>

      {/* 👤 Usuario logueado */}
      <div className="user-info">
        <p>
          <strong>{user?.nombre || user?.name || "Usuario"}</strong>
        </p>
        <span>{user?.rol || user?.role || "Sin rol"}</span>
      </div>

      <nav>
        <ul>
          <li>
            <NavLink to="/admin" end>
              Dashboard
            </NavLink>
          </li>
          <li><NavLink to="/admin/usuarios">Usuarios</NavLink></li>
          <li><NavLink to="/admin/profesionales">Profesionales</NavLink></li>
          <li><NavLink to="/admin/agendas">Agendas</NavLink></li>
          <li><NavLink to="/admin/turnos">Turnos</NavLink></li>
          <li><NavLink to="/admin/reportes">Reportes</NavLink></li>
          <li><NavLink to="/admin/servicios">Servicios</NavLink></li>
          <li><NavLink to="/admin/categorias">Categorías de Servicios</NavLink></li>
          <li><NavLink to="/admin/servicios-profesional">Servicios por Profesional</NavLink></li>
          <li><NavLink to="/admin/pacientes">Pacientes</NavLink></li>
          
        </ul>
      </nav>

      {/* 🔓 Logout */}
      <button className="logout" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default Sidebar;