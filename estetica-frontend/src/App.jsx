import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import { useAuth } from "./hooks/useAuth";
import { PERMISOS, ROLES_STAFF, ROLES } from "./config/permisos";

// Páginas Públicas
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NoAutorizado from "./pages/NoAutorizado";

// Páginas de Administración
import AdminDashboard from "./pages/admin/Dashboard";
import UsuariosAdmin from "./pages/admin/UsuariosAdmin";
import ProfesionalesAdmin from "./pages/admin/ProfesionalesAdmin";
import ServiciosAdmin from "./pages/admin/ServiciosAdmin";
import TurnosAdmin from "./pages/admin/TurnosAdmin";
import MiPerfil from "./pages/admin/MiPerfil";
import AperturaAgenda from "./pages/admin/AperturaAgenda";
import CalendarioSemanal from "./pages/admin/CalendarioSemanal";
import PacientesAdmin from "./pages/admin/PacientesAdmin";
import FichaPacienteAdmin from "./pages/admin/FichaPacienteAdmin";
import CategoriaServiciosAdmin from "./pages/admin/CategoriaServiciosAdmin";
import ProfessionalServicesAdmin from "./pages/admin/ProfessionalServicesAdmin";
import FichaProfesionalAdmin from "./pages/admin/FichaProfesionalAdmin";
import ReportesAdmin from "./pages/admin/ReportesAdmin";
import ReservaTurno from "./pages/admin/ReservaTurno";
import ReprogramarAdmin from "./pages/admin/ReprogramarAdmin";



const Pagina = ({ pagina, children }) => (
  <ProtectedRoute rolesPermitidos={PERMISOS[pagina]}>{children}</ProtectedRoute>
);
const InicioPorRol = () => {
  const { user } = useAuth();
  if (user?.role === ROLES.ADMIN || user?.role === ROLES.PROFESSIONAL) {
    return <AdminDashboard />;
  }
  return <Navigate to="/admin/turnos" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/no-autorizado" element={<NoAutorizado />} />


        <Route
          path="/admin"
          element={
            <ProtectedRoute rolesPermitidos={ROLES_STAFF}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Índice: Dashboard para ADMIN, Turnera para el resto */}
          <Route index element={<InicioPorRol />} />

          <Route path="usuarios" element={<Pagina pagina="usuarios"><UsuariosAdmin /></Pagina>} />
          <Route path="profesionales" element={<Pagina pagina="profesionales"><ProfesionalesAdmin /></Pagina>} />
          <Route path="servicios" element={<Pagina pagina="servicios"><ServiciosAdmin /></Pagina>} />
          <Route path="turnos" element={<Pagina pagina="turnos"><TurnosAdmin /></Pagina>} />
          <Route path="reportes" element={<Pagina pagina="reportes"><ReportesAdmin /></Pagina>} />
          <Route path="calendario" element={<Pagina pagina="calendario"><CalendarioSemanal /></Pagina>} />
          <Route path="agendas" element={<Pagina pagina="agendas"><AperturaAgenda /></Pagina>} />
          <Route path="mi-perfil" element={<Pagina pagina="miPerfil"><MiPerfil /></Pagina>} />
          <Route path="pacientes" element={<Pagina pagina="pacientes"><PacientesAdmin /></Pagina>} />
          <Route path="pacientes/:id" element={<Pagina pagina="pacientes"><FichaPacienteAdmin /></Pagina>} />
          <Route path="categorias" element={<Pagina pagina="categorias"><CategoriaServiciosAdmin /></Pagina>} />
          <Route path="servicios-profesional" element={<Pagina pagina="serviciosProfesional"><ProfessionalServicesAdmin /></Pagina>} />
          <Route path="profesionales/:id" element={<Pagina pagina="fichaProfesional"><FichaProfesionalAdmin /></Pagina>} />
          <Route path="reserva-turno" element={<Pagina pagina="reservaTurno"><ReservaTurno /></Pagina>} />
          <Route path="reprogramar" element={<Pagina pagina="reprogramar"><ReprogramarAdmin /></Pagina>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;