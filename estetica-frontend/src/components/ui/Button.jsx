import { colors, status, radius } from "../../theme/colors";

const VARIANTS = {
  primary:   { background: colors.brand, color: colors.white },
  secondary: { background: colors.borderSoft, color: colors.text },
  danger:    { background: status.error.strong, color: colors.white },
  success:   { background: status.success.strong, color: colors.white },
  ghost:     { background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}` },
};

export const Button = ({ children, type = "button", variant = "primary", onClick, style, ...props }) => {
  const base = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "8px 12px",
        border: "none",
        borderRadius: radius.sm,
        cursor: "pointer",
        fontWeight: 600,
        ...base,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
