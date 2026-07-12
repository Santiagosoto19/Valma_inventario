export default function Input({ label, className = '', ...props }) {
  return (
    <div>
      {label && <label className="label-pastel">{label}</label>}
      <input className={`input-pastel ${className}`} {...props} />
    </div>
  );
}
