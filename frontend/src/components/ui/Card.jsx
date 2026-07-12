export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`card-pastel ${className}`} {...props}>
      {children}
    </div>
  );
}
