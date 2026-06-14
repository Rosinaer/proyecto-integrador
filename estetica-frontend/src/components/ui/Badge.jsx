import { status, radius } from "../../theme/colors";

export const Badge = ({ map = {}, value, children }) => {
  const c = map[value] || { label: value, bg: status.neutral.soft, fg: status.neutral.fg };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: radius.pill,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
      }}
    >
      {children ?? c.label}
    </span>
  );
};

export default Badge;
