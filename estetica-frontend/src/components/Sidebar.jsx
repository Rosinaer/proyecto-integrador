import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { puede } from "../config/permisos";
import client from "../api/client";
import "./Sidebar.css";

const LINKS = [
  // Inicio
  { to: "/admin", label: "Dashboard", end: true, pagina: "dashboard" },

  // Operación diaria
  { to: "/admin/turnos", label: "Turnos", pagina: "turnos" },
  { to: "/admin/calendario", label: "Calendario", pagina: "calendario" },
  { to: "/admin/reserva-turno", label: "Reservar Turno", pagina: "reservaTurno" },
  { to: "/admin/reprogramar", label: "Reprogramar", badge: true, pagina: "reprogramar" },
  { to: "/admin/pacientes", label: "Pacientes", pagina: "pacientes" },

  // Catálogo
  { to: "/admin/profesionales", label: "Profesionales", pagina: "profesionales" },
  { to: "/admin/servicios", label: "Servicios", pagina: "servicios" },
  { to: "/admin/categorias", label: "Categorías de Servicios", pagina: "categorias" },
  { to: "/admin/servicios-profesional", label: "Servicios por Profesional", pagina: "serviciosProfesional" },
  { to: "/admin/agendas", label: "Agendas por Profesional", pagina: "agendas" },

  // Administración
  { to: "/admin/usuarios", label: "Usuarios", pagina: "usuarios" },
  { to: "/admin/cobros", label: "Cobros", pagina: "cobros" },

  // Cuenta
  { to: "/admin/mi-perfil", label: "Mi Perfil", pagina: "miPerfil" },
];

function Sidebar({ open = true, onClose, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (!token) return;
    if (!puede(user?.role, "reprogramar")) {
      setPendientes(0);
      return;
    }
    let activo = true;
    const traer = async () => {
      try {
        const { data } = await client.get("/appointments", {
          params: { needsReschedule: true },
        });
        if (activo) setPendientes(Array.isArray(data) ? data.length : 0);
      } catch {
        /* silencioso: el badge simplemente no se muestra */
      }
    };
    traer();
    const onFocus = () => traer();
    const onChanged = () => traer();
    window.addEventListener("focus", onFocus);
    window.addEventListener("senda:appointments-changed", onChanged);
    const id = setInterval(traer, 60000); 
    return () => {
      activo = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("senda:appointments-changed", onChanged);
    };
  }, [token, location.pathname, user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  const nombre = user?.person?.name || user?.name || "Usuario";
  const rol = user?.role || "Sin rol";

  return (
    <aside className={`sidebar ${open ? "is-open" : "is-closed"}`}>
      <div className="sidebar-top">
        <h2 className="logo">Espacio Senda</h2>
        <button
          type="button"
          className="sidebar-collapse"
          aria-label="Cerrar menú"
          onClick={onClose}
        >
          ‹
        </button>
      </div>


      <div className="user-info">
        <p>
          <strong>{nombre}</strong>
        </p>
        <span>{rol}</span>
      </div>

      <nav>
        <ul>
          {LINKS.filter((l) => puede(rol, l.pagina)).map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} onClick={() => onNavigate?.()}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  {l.label}
                  {l.badge && pendientes > 0 && (
                    <span style={{
                      marginLeft: 8, minWidth: 18, height: 18, padding: "0 5px",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "#f59e0b", color: "#fff", borderRadius: 9,
                      fontSize: 11, fontWeight: 700, lineHeight: 1,
                    }}>
                      {pendientes}
                    </span>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>


      <button className="logout" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </aside>
  );
}

export default Sidebar;