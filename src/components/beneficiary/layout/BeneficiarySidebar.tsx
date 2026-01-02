import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  Package,
  Star
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  userRole?: string;
}

export default function BeneficiarySidebar({ activeTab, setActiveTab, onCollapsedChange, userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('beneficiary_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('beneficiary_sidebar_collapsed', String(collapsed));
    onCollapsedChange(collapsed);
  }, [collapsed, onCollapsedChange]);

  const allMenuItems = [
    { id: 'home_beneficiary', label: 'الصفحة الرئيسية', icon: Home, roles: ['program_manager', 'quarantine_general_supervisor', 'general_supervisor', 'beneficiary'] },
    { id: 'shipment_tracking_beneficiary', label: 'تتبع حالة الإرساليات', icon: Package, roles: ['program_manager', 'quarantine_general_supervisor', 'general_supervisor', 'beneficiary'] },
    { id: 'ratings_beneficiary', label: 'متابعة التقييمات', icon: Star, roles: ['program_manager', 'quarantine_general_supervisor', 'general_supervisor'] },
    { id: 'user_management_beneficiary', label: 'إدارة المستخدمين', icon: Users, roles: ['program_manager', 'quarantine_general_supervisor', 'general_supervisor'] },
  ];

  const menuItems = allMenuItems.filter(item =>
    !userRole || item.roles.includes(userRole)
  );

  return (
    <div className={`bg-gradient-to-b from-white to-gray-50 shadow-2xl transition-all duration-500 ${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 h-screen flex flex-col border-r-2 border-[#61bf69]/20 fixed top-0 right-0 z-30`}>
      <div className="relative overflow-hidden border-b-2 border-white/50" style={{ height: '90px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#61bf69] via-[#50a857] to-[#61bf69]"></div>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        <div className="relative h-full flex flex-col items-center justify-center py-2 px-3">
          {!collapsed ? (
            <div className="flex flex-col items-center transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-2xl group hover:shadow-white/30 transition-all duration-300 hover:rotate-3">
                <Users className="w-10 h-10 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center transition-all duration-500 transform hover:scale-110">
              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-xl hover:shadow-white/30 transition-all duration-300 group">
                <Users className="w-7 h-7 text-white drop-shadow-lg group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute bottom-0.5 left-0.5 p-1 rounded-lg bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 text-white border border-white/30 hover:scale-125 hover:rotate-180 shadow-lg z-10 group"
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? <ChevronLeft className="w-3 h-3 transition-transform duration-300" /> : <ChevronRight className="w-3 h-3 transition-transform duration-300" />}
          </button>
        </div>
      </div>

      <nav className={`flex-1 ${collapsed ? 'p-3' : 'px-4 py-3'} transition-all duration-500 overflow-hidden`}>
        <ul className={`${collapsed ? 'space-y-1' : 'space-y-1.5'}`}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li
                key={item.id}
                className="transform transition-all duration-300"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5 text-right'} rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-l from-[#61bf69]/30 to-[#61bf69]/20 text-[#003361] shadow-lg border-r-4 border-[#61bf69] transform translate-x-[-4px]'
                      : 'text-[#003361]/80 hover:bg-gradient-to-l hover:from-[#003361]/8 hover:to-[#003361]/5 hover:text-[#003361] hover:translate-x-[-2px] hover:shadow-md'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <div className={`absolute inset-0 bg-gradient-to-l from-[#61bf69]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'opacity-100' : ''}`}></div>

                  <div className={`relative flex items-center justify-center ${collapsed ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-[#61bf69] text-white shadow-md'
                      : 'bg-[#003361]/5 text-[#003361] group-hover:bg-[#61bf69]/20 group-hover:scale-110'
                  }`}>
                    <Icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  </div>

                  {!collapsed && (
                    <>
                      <span className={`flex-1 text-[14px] whitespace-nowrap transition-all duration-300 ${isActive ? 'text-[#003361]' : 'text-[#003361]/80 group-hover:text-[#003361]'}`} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                        {item.label}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-all duration-300 ${
                        isActive
                          ? 'text-[#61bf69] opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0'
                      }`} />
                    </>
                  )}

                  {collapsed && isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#61bf69] rounded-r-full shadow-lg"></div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
