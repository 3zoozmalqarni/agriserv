import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, icon: Icon, color = '#458ac9', subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110" style={{ background: color }}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: color }}>{title}</h1>
            {subtitle && (
              <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>
            )}
          </div>
          <div className="flex-1 h-1 rounded-full" style={{ background: `linear-gradient(to left, ${color}, transparent)` }}></div>
        </div>
        {action && (
          <div className="mr-4">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`
      bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50
      transition-all duration-300
      ${hover ? 'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  color?: string;
}

export function SectionTitle({ title, icon: Icon, color = '#458ac9' }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      )}
      <h2 className="text-xl font-bold" style={{ color }}>{title}</h2>
    </div>
  );
}

interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  columns?: number;
}

export function FormRow({ children, columns = 2 }: FormRowProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[2]} gap-4`}>
      {children}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function InputField({ label, error, required, children }: InputFieldProps) {
  return (
    <div className="group">
      <label className="block text-sm font-semibold text-[#003361] mb-2 transition-colors duration-200 group-focus-within:text-[#61bf69]">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  icon: Icon
}: ButtonProps) {
  const variants = {
    primary: 'bg-[#61bf69] hover:bg-[#50a857] text-white',
    secondary: 'bg-[#458ac9] hover:bg-[#3a7ab0] text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        px-6 py-3 rounded-xl font-semibold
        shadow-lg hover:shadow-xl
        transition-all duration-300
        transform hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        flex items-center gap-2 justify-center
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="min-h-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

interface TableContainerProps {
  children: ReactNode;
}

export function TableContainer({ children }: TableContainerProps) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-white/50 shadow-lg">
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
      border ${variants[variant]}
      transition-all duration-200
    `}>
      {children}
    </span>
  );
}
