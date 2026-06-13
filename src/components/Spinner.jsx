// src/components/Spinner.jsx
export default function Spinner({ size = 40, message = '' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" style={{ width: size, height: size }} />
      {message && <p className="spinner-msg">{message}</p>}
    </div>
  );
}
