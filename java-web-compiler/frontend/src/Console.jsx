import PropTypes from "prop-types";

export default function Console({ output }) {
  return (
    <div className="console" style={{ 
      backgroundColor: '#1e1e1e', 
      color: '#d4d4d4', 
      padding: '10px', 
      fontFamily: 'monospace', 
      flex: 1, 
      overflowY: 'auto',
      border: '1px solid #333'
    }}>
      <label style={{ color: '#569cd6', fontWeight: 'bold' }}>Output:</label>
      <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>
        {output || "Run code to see output..."}
      </pre>
    </div>
  );
}

Console.propTypes = {
  output: PropTypes.string,
};