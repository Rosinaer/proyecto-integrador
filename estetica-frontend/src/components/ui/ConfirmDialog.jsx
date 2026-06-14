import { Modal } from "./Modal";
import { Button } from "./Button";
import { colors } from "../../theme/colors";

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={440}>
    {message && (
      <p style={{ color: colors.textSecondary, fontSize: 15, marginTop: 0 }}>{message}</p>
    )}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant={variant} onClick={onConfirm} disabled={loading}>
        {loading ? "Procesando..." : confirmLabel}
      </Button>
    </div>
  </Modal>
);

export default ConfirmDialog;
