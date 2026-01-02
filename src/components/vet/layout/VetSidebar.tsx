import { useState, useEffect, useRef } from 'react';
import {
  Cat,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Users,
  FileText,
  BarChart3,
  TestTube2,
  MapPin,
  Ship,
  Archive,
  ScanSearch,
  AlertTriangle,
  FilePlus,
  FolderOpen,
  Microscope,
  Settings
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface VetSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggle?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: any;
  requiresPermission?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  requiresPermission?: string;
  subItems?: SubMenuItem[];
}

export default function VetSidebar({ activeTab, onTabChange, collapsed, onToggle }: VetSidebarProps) {
  const auth = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!auth) {
    return null;
  }

  const { hasPermission } = auth;

  const allMenuItems: MenuItem[] = [
    { id: 'home_vet', label: 'الصفحة الرئيسية', icon: Home },
    {
      id: 'new_registration',
      label: 'تسجيل جديد',
      icon: FilePlus,
      subItems: [
        { id: 'register_procedure_vet', label: 'إجراء جديد', icon: ClipboardList },
        { id: 'register_animal_shipment_vet', label: 'إرسالية جديدة', icon: Ship },
      ]
    },
    {
      id: 'records',
      label: 'السجلات',
      icon: FolderOpen,
      subItems: [
        { id: 'procedure_records_vet', label: 'سجل الإجراءات', icon: FileText },
        { id: 'shipment_records_vet', label: 'سجل الإرساليات', icon: Archive },
      ]
    },
    {
      id: 'lab_tests',
      label: 'الفحوصات والنتائج',
      icon: Microscope,
      subItems: [
        { id: 'lab_status_vet', label: 'تتبع الفحوصات', icon: ScanSearch },
        { id: 'lab_results_vet', label: 'النتائج', icon: TestTube2 },
      ]
    },
    { id: 'quarantine_records_vet', label: 'سجل الحجر البيطري', icon: AlertTriangle },
    { id: 'importers_management_vet', label: 'بيانات المستوردين', icon: Users },
    { id: 'reports_vet', label: 'التقارير', icon: BarChart3, requiresPermission: 'view_reports' },
    { id: 'user_management_vet', label: 'إدارة المستخدمين', icon: Users, requiresPermission: 'manage_vet_users' },
    { id: 'profile_settings_vet', label: 'إعدادات الحساب', icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.requiresPermission) {
      return hasPermission(item.requiresPermission);
    }
    return true;
  });

  const toggleMenu = (menuId: string) => {
    if (collapsed) {
      if (hoveredMenu === menuId) {
        setHoveredMenu(null);
        setMenuPosition(null);
      } else {
        const button = buttonRefs.current[menuId];
        if (button) {
          const rect = button.getBoundingClientRect();
          // القائمة على اليمين، فالقائمة المنبثقة يجب أن تظهر على اليسار
          setMenuPosition({ top: rect.top, left: rect.left - 208 }); // 200px width + 8px gap
          setHoveredMenu(menuId);
        }
      }
      return;
    }
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleMouseEnter = (menuId: string, hasSubItems: boolean) => {
    if (collapsed) {
      // إذا كان العنصر الجديد ليس له قائمة فرعية، أخفِ القائمة فوراً
      if (!hasSubItems) {
        cancelHideTimeout();
        setHoveredMenu(null);
        setMenuPosition(null);
        return;
      }

      const button = buttonRefs.current[menuId];
      if (button) {
        const rect = button.getBoundingClientRect();
        // القائمة على اليمين، فالقائمة المنبثقة يجب أن تظهر على اليسار
        setMenuPosition({ top: rect.top, left: rect.left - 208 }); // 200px width + 8px gap
        setHoveredMenu(menuId);
      }
    }
  };

  const handleMouseLeave = () => {
    if (collapsed) {
      // تأخير بسيط قبل إخفاء القائمة للسماح بالانتقال إليها
      hideTimeoutRef.current = setTimeout(() => {
        setHoveredMenu(null);
        setMenuPosition(null);
      }, 100);
    }
  };

  const cancelHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  return (
    <>
    <div className={`bg-gradient-to-b from-white to-gray-50 shadow-2xl transition-all duration-500 ${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 h-screen flex flex-col border-l-2 border-[#61bf69]/20 fixed top-0 right-0 z-30`}>

      <div className="relative overflow-hidden border-b-2 border-white/50" style={{ height: '90px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#61bf69] via-[#50a857] to-[#61bf69]"></div>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        <div className="relative h-full flex flex-col items-center justify-center py-2 px-3">
          {!collapsed ? (
            <div className="flex flex-col items-center transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-2xl group hover:shadow-white/30 transition-all duration-300 hover:rotate-3">
                <Cat className="w-10 h-10 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center transition-all duration-500 transform hover:scale-110">
              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-xl hover:shadow-white/30 transition-all duration-300 group">
                <Cat className="w-7 h-7 text-white drop-shadow-lg group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
          )}

          {onToggle && (
            <button
              onClick={onToggle}
              className="absolute bottom-0.5 left-0.5 p-1 rounded-lg bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 text-white border border-white/30 hover:scale-125 hover:rotate-180 shadow-lg z-10 group"
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {collapsed ? <ChevronLeft className="w-3 h-3 transition-transform duration-300" /> : <ChevronRight className="w-3 h-3 transition-transform duration-300" />}
            </button>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${collapsed ? 'p-3' : 'px-4 py-3'} transition-all duration-500 overflow-y-auto overflow-x-visible`}>
        <ul className={`${collapsed ? 'space-y-1' : 'space-y-1.5'}`}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.id];
            const isActive = !hasSubItems && activeTab === item.id;
            const hasActiveChild = hasSubItems && item.subItems?.some(sub => sub.id === activeTab);

            return (
              <li
                key={item.id}
                className="transform transition-all duration-300 relative"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={cancelHideTimeout}
              >
                <button
                  ref={(el) => (buttonRefs.current[item.id] = el)}
                  onClick={() => hasSubItems ? toggleMenu(item.id) : onTabChange(item.id)}
                  onMouseEnter={() => handleMouseEnter(item.id, hasSubItems)}
                  className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5 text-right'} rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    isActive || hasActiveChild
                      ? 'bg-gradient-to-l from-[#61bf69]/30 to-[#61bf69]/20 text-[#003361] shadow-lg border-r-4 border-[#61bf69] transform translate-x-[-4px]'
                      : 'text-[#003361]/80 hover:bg-gradient-to-l hover:from-[#003361]/8 hover:to-[#003361]/5 hover:text-[#003361] hover:translate-x-[-2px] hover:shadow-md'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <div className={`absolute inset-0 bg-gradient-to-l from-[#61bf69]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive || hasActiveChild ? 'opacity-100' : ''}`}></div>

                  <div className={`relative flex items-center justify-center ${collapsed ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg transition-all duration-300 ${
                    isActive || hasActiveChild
                      ? 'bg-[#61bf69] text-white shadow-md'
                      : 'bg-[#003361]/5 text-[#003361] group-hover:bg-[#61bf69]/20 group-hover:scale-110'
                  }`}>
                    <Icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0 transition-all duration-300 ${isActive || hasActiveChild ? 'scale-110' : 'group-hover:scale-110'}`} />
                  </div>

                  {!collapsed && (
                    <>
                      <span className={`text-[14px] flex-1 whitespace-nowrap transition-all duration-300 ${isActive || hasActiveChild ? 'text-[#003361]' : 'text-[#003361]/80 group-hover:text-[#003361]'}`} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                        {item.label}
                      </span>
                      {hasSubItems ? (
                        <ChevronDown className={`w-4 h-4 transition-all duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        } ${hasActiveChild ? 'text-[#61bf69]' : 'text-[#003361]/60'}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 transition-all duration-300 ${
                          isActive
                            ? 'text-[#61bf69] opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0'
                        }`} />
                      )}
                    </>
                  )}

                  {collapsed && (isActive || hasActiveChild) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#61bf69] rounded-r-full shadow-lg"></div>
                  )}
                </button>

                {hasSubItems && !collapsed && isExpanded && (
                  <ul className="mr-4 mt-1 space-y-1 border-r-2 border-[#61bf69]/20">
                    {item.subItems?.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activeTab === subItem.id;

                      return (
                        <li key={subItem.id}>
                          <button
                            onClick={() => onTabChange(subItem.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-right rounded-lg transition-all duration-300 group relative overflow-hidden ${
                              isSubActive
                                ? 'bg-gradient-to-l from-[#61bf69]/20 to-[#61bf69]/10 text-[#003361] shadow-md'
                                : 'text-[#003361]/70 hover:bg-gradient-to-l hover:from-[#003361]/5 hover:to-transparent hover:text-[#003361]'
                            }`}
                          >
                            <div className={`relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 ${
                              isSubActive
                                ? 'bg-[#61bf69]/80 text-white'
                                : 'bg-[#003361]/5 text-[#003361]/60 group-hover:bg-[#61bf69]/15'
                            }`}>
                              <SubIcon className="w-4 h-4 flex-shrink-0" />
                            </div>
                            <span className={`text-[13px] flex-1 transition-all duration-300 ${isSubActive ? 'text-[#003361]' : 'text-[#003361]/70 group-hover:text-[#003361]'}`} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 600 }}>
                              {subItem.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

              </li>
            );
          })}
        </ul>
      </nav>

    </div>

    {collapsed && hoveredMenu && menuPosition && (
      <div
        className="fixed bg-white rounded-xl shadow-2xl border-2 border-[#61bf69]/20 py-2 px-1 min-w-[200px] z-[9999]"
        style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        onMouseEnter={cancelHideTimeout}
        onMouseLeave={handleMouseLeave}
      >
        <div className="space-y-1">
          {menuItems.find(item => item.id === hoveredMenu)?.subItems?.map((subItem) => {
            const SubIcon = subItem.icon;
            const isSubActive = activeTab === subItem.id;

            return (
              <button
                key={subItem.id}
                onClick={() => {
                  onTabChange(subItem.id);
                  setHoveredMenu(null);
                  setMenuPosition(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-right rounded-lg transition-all duration-300 group relative overflow-hidden ${
                  isSubActive
                    ? 'bg-gradient-to-l from-[#61bf69]/20 to-[#61bf69]/10 text-[#003361] shadow-md'
                    : 'text-[#003361]/70 hover:bg-gradient-to-l hover:from-[#003361]/5 hover:to-transparent hover:text-[#003361]'
                }`}
              >
                <div className={`relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 ${
                  isSubActive
                    ? 'bg-[#61bf69]/80 text-white'
                    : 'bg-[#003361]/5 text-[#003361]/60 group-hover:bg-[#61bf69]/15'
                }`}>
                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                </div>
                <span className={`text-[13px] flex-1 whitespace-nowrap transition-all duration-300 ${isSubActive ? 'text-[#003361]' : 'text-[#003361]/70 group-hover:text-[#003361]'}`} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 600 }}>
                  {subItem.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}
    </>
  );
}
