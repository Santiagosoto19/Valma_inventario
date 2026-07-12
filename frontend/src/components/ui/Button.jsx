const variants = {
  primary: 'btn-gradient',
  success: 'btn-gradient-success',
  danger: 'btn-gradient-danger',
  ghost: 'btn-ghost',
};

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-xl',
  md: '',
  lg: 'px-6 py-4 text-base rounded-2xl min-h-12',
  xl: 'px-8 py-5 text-lg rounded-2xl min-h-14',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'lg' || size === 'xl' ? 20 : 18} strokeWidth={2.5} />}
      {children}
    </button>
  );
}
