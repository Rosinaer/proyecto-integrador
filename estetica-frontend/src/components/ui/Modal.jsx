import ReactDOM from "react-dom";
import { colors, shadow, radius } from "../../theme/colors";

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 500 }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.closeButton} onClick={onClose} title="Cerrar">&times;</button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)", display: "flex",
    justifyContent: "center", alignItems: "flex-start", overflowY: "auto",
    padding: "24px 16px", boxSizing: "border-box", zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.surface, padding: 24, borderRadius: radius.md,
    width: "100%", boxShadow: shadow.modal, position: "relative",
    maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", margin: "auto",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, borderBottom: `2px solid ${colors.borderSoft}`, paddingBottom: 10, flexShrink: 0,
  },
  title: { margin: 0, color: colors.brand, fontSize: "1.25rem" },
  closeButton: {
    background: "transparent", border: "none", fontSize: 28, cursor: "pointer",
    color: colors.textMuted, lineHeight: 1, padding: "0 5px",
  },
  body: { color: colors.text, fontSize: "1rem", overflowY: "auto", flex: 1, minHeight: 0 },
};

export default Modal;
