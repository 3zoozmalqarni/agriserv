import { useState, useEffect, useRef } from 'react';
import LabSidebar from './layout/LabSidebar';
import LabHeader from './layout/LabHeader';
import LabSampleReception from './modules/LabSampleReception';
import LabRegisterProcedure from './modules/LabRegisterProcedure';
import LabVeterinaryProcedures from './modules/LabVeterinaryProcedures';
import LabResultsEntry from './modules/LabResultsEntry';
import LabResultsApproval from './modules/LabResultsApproval';
import LabInventory from './modules/LabInventory';
import LabReports from './modules/LabReports';
import LabPrintResults from './modules/LabPrintResults';
import LabHome from './modules/LabHome';
import LabDilutionCalculator from './modules/LabDilutionCalculator';
import LabUserManagement from './modules/LabUserManagement';
import LabProfileSettings from './modules/LabProfileSettings';
import { useAuth } from '../../hooks/useAuth.tsx';
import { cleanupOrphanedAlerts } from '../../lib/vetAlerts';

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}: {error: Error, resetErrorBoundary: () => void}) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">حدث خطأ</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home_lab');
  const [searchNavigationData, setSearchNavigationData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('lab_sidebar_collapsed');
    return saved === 'true';
  });
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { hasPermission } = useAuth();

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // تنظيف التنبيهات التي لم يعد لها إجراءات مرتبطة
  useEffect(() => {
    cleanupOrphanedAlerts();

    // تنظيف دوري كل 30 ثانية
    const interval = setInterval(() => {
      cleanupOrphanedAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchNavigation = (tab: string, data: any) => {
    setSearchNavigationData(data);
    setTimeout(() => setActiveTab(tab), 50);
  };

  useEffect(() => {
    if (searchNavigationData && activeTab) {
      const timer = setTimeout(() => setSearchNavigationData(null), 500);
      return () => clearTimeout(timer);
    }
  }, [searchNavigationData, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home_lab':
        return <LabHome setActiveTab={setActiveTab} />;
      case 'reception_lab':
        return <LabSampleReception searchData={searchNavigationData} />;
      case 'register_procedure_lab':
        return <LabRegisterProcedure searchData={searchNavigationData} />;
      case 'veterinary_procedures_lab':
        return <LabVeterinaryProcedures />;
      case 'results_entry_lab':
        return <LabResultsEntry searchData={searchNavigationData} />;
      case 'results_approval_lab':
        if (!hasPermission('approve_results')) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-xl font-bold text-red-600 mb-4">ليس لديك صلاحية الوصول</h2>
                <p className="text-gray-600">لا تملك الصلاحيات الكافية للوصول إلى اعتماد النتائج</p>
              </div>
            </div>
          );
        }
        return <LabResultsApproval />;
      case 'print_results_lab':
        return <LabPrintResults searchData={searchNavigationData} />;
      case 'dilution_calculator_lab':
        return <LabDilutionCalculator />;
      case 'inventory_lab':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
            <LabInventory />
          </ErrorBoundary>
        );
      case 'reports_lab':
        return <LabReports />;
      case 'user_management_lab':
        if (!hasPermission('manage_lab_users')) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-xl font-bold text-red-600 mb-4">ليس لديك صلاحية الوصول</h2>
                <p className="text-gray-600">لا تملك الصلاحيات الكافية للوصول إلى إدارة المستخدمين</p>
              </div>
            </div>
          );
        }
        return <LabUserManagement searchData={searchNavigationData} />;
      case 'profile_settings_lab':
        return <LabProfileSettings />;
      default:
        return <LabHome setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <LabSidebar activeTab={activeTab} setActiveTab={setActiveTab} onCollapsedChange={setSidebarCollapsed} />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'mr-20' : 'mr-64'}`}>
        <LabHeader onSearchNavigate={handleSearchNavigation} />
      </div>
      <main
        ref={mainContentRef}
        className={`flex-1 transition-all duration-300 custom-scrollbar ${sidebarCollapsed ? 'mr-20' : 'mr-64'}`}
        style={{
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '20px',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          direction: 'rtl'
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}