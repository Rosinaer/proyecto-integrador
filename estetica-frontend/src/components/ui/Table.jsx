import React from 'react';

export const Table = ({ headers, children }) => {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} style={styles.th}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

// Exportamos también la fila (Tr) y la celda (Td) para mantener el estilo consistente
export const Tr = ({ children, style, className }) => (
  <tr className={className} style={{ ...styles.tr, ...style }}>{children}</tr>
);

export const Td = ({ children, style }) => (
  <td style={{ ...styles.td, ...style }}>{children}</td>
);

const styles = {
  wrapper: {
    width: '100%',
    overflowX: 'auto',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'center', // Centrado para que los badges de roles queden prolijos
  },
  th: {
    backgroundColor: '#6b21a8', 
    color: '#ffffff',
    padding: '16px',
    fontWeight: 'bold',
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#334155',
    verticalAlign: 'middle',
  },
  tr: {
  
  }
};