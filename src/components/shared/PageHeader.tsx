import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  gradient?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  gradient = 'from-[#003361] via-[#00a651] to-[#f18700]',
  actions
}: PageHeaderProps) {
  return (
    <div className="relative mb-3">
      <div className="absolute inset-0 bg-gradient-to-r opacity-5 blur-3xl"
           style={{ backgroundImage: `linear-gradient(to right, #003361, #00a651, #f18700)` }} />

      <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`relative group`}>
                <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-2xl p-3 border border-white/50 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-[#003361] group-hover:rotate-12 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#003361] mb-0.5 tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-gray-600 font-medium">{subtitle}</p>
                )}
              </div>
            </div>

            {actions && (
              <div className="mr-4">
                {actions}
              </div>
            )}
          </div>
        </div>

        <div className="w-full h-1 bg-[#003361]" />
      </div>
    </div>
  );
}

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function ContentCard({ children, className = '', padding = 'lg' }: ContentCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
