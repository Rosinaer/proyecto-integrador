import React from 'react';
import ReactDOM from 'react-dom';
 
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 500 }) => {
   
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth }} onClick={(e) => e.stopPropagation()}>
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
    document.body 
  );
};
 
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflowY: 'auto',
    padding: '24px 16px',
    boxSizing: 'border-box',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '10px',
    width: '100%',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    position: 'relative',
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    margin: 'auto', 
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '10px',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    color: '#6b21a8', 
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
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  }
};

export default Modal;
