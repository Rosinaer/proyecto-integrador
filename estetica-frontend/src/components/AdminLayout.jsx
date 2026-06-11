import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar fijo */}
      <Sidebar />
      
      {/* Contenedor principal con scroll independiente si es necesario */}
      <main style={{ 
        flex: 1, 
        marginLeft: '220px', 
        padding: '40px', // Aumentamos el aire
        minHeight: '100vh',
        width: 'calc(100% - 220px)',
        boxSizing: 'border-box' // el padding ya no suma altura extra → sin scroll fantasma
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;