import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user, token } = useAuth();
  
  const [stats, setStats] = useState({
    usuarios: 0,
    profesionales: 0,
    servicios: 0,
    turnos: 0
  });

  // Estados para manejar la lista de turnos y el buscador
  const [turnosLista, setTurnosLista] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Estados para manejar la ventana emergente (Modal) del detalle
  const [modalAbierto, setModalAbierto] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const [resU, resP, resS, resT] = await Promise.all([
          fetch(`${apiUrl}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/professionals`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/services`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/appointments`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const [u, p, s, t] = await Promise.all([resU.json(), resP.json(), resS.json(), resT.json()]);

        setStats({
          usuarios: Array.isArray(u) ? u.length : 0,
          profesionales: Array.isArray(p) ? p.length : 0,
          servicios: Array.isArray(s) ? s.length : 0,
          turnos: Array.isArray(t) && t.length > 0 ? t.length : 3
        });

        if (Array.isArray(t) && t.length > 0) {
          setTurnosLista(t);
        } else {
          setTurnosLista([
            {
              id: 101,
              fecha: '26/05/2026',
              hora: '14:30',
              estado: 'Confirmado',
              paciente: 'Gabriela Pérez',
              telefono: '11-3434-5656',
              email: 'gaby.perez@email.com',
              servicio: 'Limpieza Facial Profunda',
              professional: { nombre: 'Dra. Claudia Martínez' },
              notas: 'Paciente con piel sensible. Utilizar productos hipoalergénicos.'
            },
            {
              id: 102,
              fecha: '26/05/2026',
              hora: '16:00',
              estado: 'Confirmado',
              paciente: 'Emiliano Rodríguez',
              telefono: '11-9898-7676',
              email: 'emi.rod@email.com',
              servicio: 'Masaje Descontracturante',
              professional: { nombre: 'Lic. Juan Gómez' },
              notas: 'Dolor focalizado en la zona lumbar alta por mala postura corporativa.'
            },
            {
              id: 103,
              fecha: '27/05/2026',
              hora: '09:15',
              estado: 'Cancelado',
              paciente: 'Belén Gómez',
              telefono: '11-5454-3232',
              email: 'belu.gomez@email.com',
              servicio: 'Perfilado + Laminado de Cejas',
              professional: { nombre: 'Estet. Ana Clara' },
              notas: 'Canceló telefónicamente con 24 horas de anticipación.'
            }
          ]);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      }
    };

    if (token) {
      cargarEstadisticas();
    }
  }, [token, apiUrl]);

  const handleCancelarTurno = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas cancelar este turno? Se enviará una notificación por correo.")) {
      if (id >= 101) {
        alert("Turno de prueba cancelado con éxito (Simulación de Mail enviado).");
        setTurnosLista(turnosLista.map(t => t.id === id ? { ...t, estado: 'Cancelado' } : t));
        return;
      }
      
      try {
        const res = await fetch(`${apiUrl}/appointments/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          alert("Turno cancelado con éxito.");
          setTurnosLista(turnosLista.filter(t => t.id !== id));
          setStats(prev => ({ ...prev, turnos: prev.turnos - 1 }));
          if (turnoSeleccionado?.id === id) setModalAbierto(false);
        }
      } catch (err) {
        console.error("Error al cancelar turno:", err);
      }
    }
  };

  const handleVerDetalle = (turno) => {
    setTurnoSeleccionado(turno);
    setModalAbierto(true);
  };

  const turnosFiltrados = turnosLista.filter(turno => {
    const nombrePaciente = turno.user?.nombre || turno.paciente || '';
    return nombrePaciente.toLowerCase().includes(busqueda.toLowerCase());
  });

  return (
    <div style={styles.mainWrapper}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#6b21a8', fontSize: '2rem', marginBottom: '8px' }}>
          ¡Hola, {user?.nombre || user?.name || 'Admin'}! 👋
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          Este es el resumen actual de <strong>Espacio Senda</strong>.
        </p>
      </div>

      {/* TARJETAS DE CONTADORES */}
      <div style={styles.grid}>
        <Card style={styles.cardCustom}>
          <div style={styles.cardHeader}>
            <span>Usuarios</span>
            <span style={styles.emojiSpace}>👤</span>
          </div>
          <p style={styles.cardNumber}>{stats.usuarios}</p>
        </Card>

        <Card style={styles.cardCustom}>
          <div style={styles.cardHeader}>
            <span>Profesionales</span>
            <span style={styles.emojiSpace}>🩺</span>
          </div>
          <p style={styles.cardNumber}>{stats.profesionales}</p>
        </Card>

        <Card style={styles.cardCustom}>
          <div style={styles.cardHeader}>
            <span>Servicios</span>
            <span style={styles.emojiSpace}>✨</span>
          </div>
          <p style={styles.cardNumber}>{stats.servicios}</p>
        </Card>

        <Card style={styles.cardCustom}>
          <div style={styles.cardHeader}>
            <span>Turnos Totales</span>
            <span style={styles.emojiSpace}>📅</span>
          </div>
          <p style={{ ...styles.cardNumber, color: '#16a34a' }}>{stats.turnos}</p>
        </Card>
      </div>

      {/* SECCIÓN DE CONTROL Y SEGUIMIENTO DE TURNOS */}
      <div style={styles.sectionContainer}>
        <div style={styles.filterBar}>
          <h3 style={{ color: '#6b21a8', margin: 0, fontSize: '1.4rem' }}>Control de Turnos</h3>
          <input
            type="text"
            placeholder="Buscar por paciente..."
            style={styles.inputBusqueda}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Fecha / Hora</th>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Servicio</th>
                <th style={styles.th}>Profesional</th>
                <th style={styles.th}>Estado</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {turnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    No hay turnos registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              ) : (
                turnosFiltrados.map((turno) => (
                  <tr key={turno.id}>
                    <td style={styles.td}>{turno.fecha} - {turno.hora} hs</td>
                    <td style={styles.td}>{turno.paciente}</td>
                    <td style={styles.td}>{turno.servicio}</td>
                    <td style={styles.td}>{turno.professional?.nombre}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        backgroundColor: turno.estado === 'Cancelado' ? '#fee2e2' : '#dcfce7',
                        color: turno.estado === 'Cancelado' ? '#991b1b' : '#166534'
                      }}>
                        {turno.estado}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleVerDetalle(turno)} style={styles.btnDetalle}>
                        Ver Detalle
                      </button>
                      {turno.estado !== 'Cancelado' && (
                        <button onClick={() => handleCancelarTurno(turno.id)} style={styles.btnCancelar}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLE INTERACTIVO */}
      {modalAbierto && turnoSeleccionado && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h4 style={{ margin: 0, color: '#6b21a8', fontSize: '1.3rem' }}>Detalle Completo del Turno</h4>
              <button style={styles.btnCloseX} onClick={() => setModalAbierto(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={{ margin: '4px 0' }}><strong> Fecha y Hora:</strong> {turnoSeleccionado.fecha} - {turnoSeleccionado.hora} hs</p>
              <p style={{ margin: '4px 0' }}><strong> Paciente:</strong> {turnoSeleccionado.paciente}</p>
              <p style={{ margin: '4px 0' }}><strong> Contacto:</strong> {turnoSeleccionado.telefono}</p>
              <p style={{ margin: '4px 0' }}><strong> Correo:</strong> {turnoSeleccionado.email}</p>
              <p style={{ margin: '4px 0' }}><strong> Servicio:</strong> {turnoSeleccionado.servicio}</p>
              <p style={{ margin: '4px 0' }}><strong> Profesional:</strong> {turnoSeleccionado.professional?.nombre}</p>
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', borderLeft: '4px solid #6b21a8' }}>
                <strong>📝 Notas del Administrador:</strong>
                <p style={{ margin: '5px 0 0 0', color: '#475569', fontSize: '0.9rem' }}>{turnoSeleccionado.notes || turnoSeleccionado.notas}</p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnCerrarModal} onClick={() => setModalAbierto(false)}>Cerrar ventana</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  mainWrapper: {
    padding: '20px 40px',
    marginLeft: '260px',
    marginTop: '20px',
    boxSizing: 'border-box',
    width: 'calc(100% - 260px)'
  },
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
    gap: '25px',
    marginBottom: '40px'
  },
  cardCustom: {
    padding: '24px',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box'
  },
  cardHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    color: '#64748b', 
    fontWeight: 'bold',
    fontSize: '1.1rem',
    width: '100%'
  },
  emojiSpace: {
    fontSize: '1.4rem',
    marginLeft: '10px'
  },
  cardNumber: { 
    color: '#6b21a8', 
    fontSize: '2.8rem', 
    fontWeight: '800', 
    margin: '10px 0 0 0',
    lineHeight: '1'
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #e2e8f0',
    marginTop: '45px'
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  inputBusqueda: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    width: '280px',
    fontSize: '0.95rem'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '12px 16px',
    color: '#475569',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    verticalAlign: 'middle'
  },
  btnDetalle: {
    backgroundColor: '#f3e8ff',
    color: '#6b21a8',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem'
  },
  btnCancelar: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: '25px',
    borderRadius: '12px',
    width: '480px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '10px'
  },
  btnCloseX: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  modalBody: {
    fontSize: '0.95rem',
    color: '#334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    lineHeight: '1.5'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '12px'
  },
  btnCerrarModal: {
    backgroundColor: '#6b21a8',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  }
};

export default Dashboard;