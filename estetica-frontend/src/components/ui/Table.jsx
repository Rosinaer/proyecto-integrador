import { colors, shadow, radius } from "../../theme/colors";

export const Table = ({ headers, children }) => (
  <div style={styles.wrapper}>
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index} style={styles.th}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Tr = ({ children, style, className }) => (
  <tr className={className} style={style}>{children}</tr>
);

export const Td = ({ children, style, colSpan, onClick, title }) => (
  <td style={{ ...styles.td, ...style }} colSpan={colSpan} onClick={onClick} title={title}>{children}</td>
);

const styles = {
  wrapper: {
    width: "100%", overflowX: "auto", backgroundColor: colors.surface,
    borderRadius: radius.md, boxShadow: shadow.card,
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  th: { backgroundColor: colors.brand, color: colors.white, padding: 16, fontWeight: "bold" },
  td: { padding: 16, borderBottom: `1px solid ${colors.border}`, color: colors.text, verticalAlign: "middle" },
};
