import React from 'react';
import ReactDOM from 'react-dom';

export const Modal = ({ isOpen, onClose, title, children }) => {
  // Si isOpen es falso, no renderizamos absolutamente nada
  if (!isOpen) return null;

return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.closeButton} onClick={onClose} title="Cerrar">
            &times;
          </button>
        </div>
        
        <div style={styles.body}>
          {children}
        </div>
      </div>
    </div>,
    document.body // 3. Le decimos que se renderice en el body
  );
};

// Estilos encapsulados para que no rompan nada del resto de tu página
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo oscuro semitransparente
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Nos aseguramos de que quede por encima de todo
  },
  modal: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '500px', // No deja que se haga gigante en pantallas grandes
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '10px',
  },
  title: {
    margin: 0,
    color: '#6b21a8', // El violeta de Espacio Senda
    fontSize: '1.25rem',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#94a3b8',
    lineHeight: '1',
    padding: '0 5px',
  },
  body: {
    color: '#334155',
    fontSize: '1rem',
  }
};