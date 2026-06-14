import { colors, shadow, radius } from "../../theme/colors";

export const Card = ({ children, style, className }) => (
  <div
    className={className}
    style={{
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      boxShadow: shadow.card,
      border: `1px solid ${colors.borderSoft}`,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      width: "100%",
      ...style,
    }}
  >
    {children}
  </div>
);

export default Card;
