import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

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
import CambiarPassword from "./pages/admin/CambiarPassword";
import AperturaAgenda from "./pages/admin/AperturaAgenda";
import CalendarioSemanal from "./pages/admin/CalendarioSemanal";
import PacientesAdmin from "./pages/admin/PacientesAdmin";
import FichaPacienteAdmin from "./pages/admin/FichaPacienteAdmin";
import CategoriaServiciosAdmin from "./pages/admin/CategoriaServiciosAdmin";
import ProfessionalServicesAdmin from "./pages/admin/ProfessionalServicesAdmin";
import FichaProfesionalAdmin from "./pages/admin/FichaProfesionalAdmin";
import ReportesAdmin from "./pages/admin/ReportesAdmin";


// Páginas de Paciente (Comentado temporalmente por QA)
// import PacienteDashboard from "./pages/paciente/Dashboard";

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

        {/* --- RUTAS DE ADMINISTRADOR (CON LAYOUT Y MENÚ) --- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute rolesPermitidos={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="profesionales" element={<ProfesionalesAdmin />} />
          <Route path="servicios" element={<ServiciosAdmin />} />
          <Route path="turnos" element={<TurnosAdmin />} />
          <Route path="reportes" element={<ReportesAdmin />} />
          <Route path="calendario" element={<CalendarioSemanal />} />
          <Route path="agendas" element={<AperturaAgenda />} />
          <Route path="mi-perfil" element={<CambiarPassword />} />
          <Route path="pacientes" element={<PacientesAdmin />} />
          <Route path="pacientes/:id" element={<FichaPacienteAdmin />} />
          <Route path="categorias" element={<CategoriaServiciosAdmin />} />
          <Route path="servicios-profesional" element={<ProfessionalServicesAdmin />} />
          <Route path="profesionales/:id" element={<FichaProfesionalAdmin />} />
        </Route>

        {/* --- RUTAS DE PACIENTE (Comentadas temporalmente por QA) --- */}
        {/* <Route
          path="/paciente"
          element={
            <ProtectedRoute rolesPermitidos={["PATIENT"]}>
              <PacienteDashboard />
            </ProtectedRoute>
          }
        /> 
        */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;