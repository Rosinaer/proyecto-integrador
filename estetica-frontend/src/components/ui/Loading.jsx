import { colors } from "../../theme/colors";

export const Loading = ({ mensaje = "Cargando..." }) => (
  <p style={{ textAlign: "center", marginTop: 50, color: colors.textSubtle }}>{mensaje}</p>
);

export default Loading;
