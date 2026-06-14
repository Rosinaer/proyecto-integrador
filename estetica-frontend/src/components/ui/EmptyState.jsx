import { colors } from "../../theme/colors";

export const EmptyState = ({ mensaje = "No hay datos para mostrar.", children }) => (
  <div style={{ textAlign: "center", color: colors.textSubtle, padding: "32px 16px", fontSize: 14 }}>
    {mensaje}
    {children}
  </div>
);

export default EmptyState;
