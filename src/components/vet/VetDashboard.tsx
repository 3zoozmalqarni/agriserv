import { useState, useEffect, useRef } from 'react';
import VetSidebar from './layout/VetSidebar';
import VetHeader from './layout/VetHeader';
import VetHome from './modules/VetHome';
import VetRegisterProcedure from './modules/VetRegisterProcedure';
import VetRegisterAnimalShipment from './modules/VetRegisterAnimalShipment';
import VetProcedureRecords from './modules/VetProcedureRecords';
import VetShipmentRecords from './modules/VetShipmentRecords';
import VetQuarantineRecords from './modules/VetQuarantineRecords';
import VetLabStatus from './modules/VetLabStatus';
import VetLabResults from './modules/VetLabResults';
import VetReports from './modules/VetReports';
import VetUserManagement from './modules/VetUserManagement';
import VetImportersManagement from './modules/VetImportersManagement';
import VetProfileSettings from './modules/VetProfileSettings';

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

export default function VetDashboard() {
  const [activeTab, setActiveTab] = useState('home_vet');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('vet_sidebar_collapsed');
    return saved === 'true';
  });
  const mainContentRef = useRef<HTMLDivElement>(null);

  const handleNavigate = (tab: string, procedureId?: string) => {
    setActiveTab(tab);
    if (procedureId) {
      setSelectedProcedureId(procedureId);
    } else {
      setSelectedProcedureId(null);
    }
  };

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // مسح الـ selectedProcedureId بعد فترة قصيرة لتجنب فتح النافذة مرة أخرى
    if (selectedProcedureId) {
      const timer = setTimeout(() => {
        setSelectedProcedureId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedProcedureId]);

  useEffect(() => {
    localStorage.setItem('vet_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetHome setActiveTab={setActiveTab} />
          </ErrorBoundary>
        );
      case 'register_procedure_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetRegisterProcedure />
          </ErrorBoundary>
        );
      case 'register_animal_shipment_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetRegisterAnimalShipment />
          </ErrorBoundary>
        );
      case 'procedure_records_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetProcedureRecords highlightProcedureId={selectedProcedureId} />
          </ErrorBoundary>
        );
      case 'shipment_records_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetShipmentRecords />
          </ErrorBoundary>
        );
      case 'quarantine_records_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetQuarantineRecords />
          </ErrorBoundary>
        );
      case 'lab_status_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetLabStatus />
          </ErrorBoundary>
        );
      case 'lab_results_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetLabResults />
          </ErrorBoundary>
        );
      case 'reports_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetReports />
          </ErrorBoundary>
        );
      case 'user_management_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetUserManagement />
          </ErrorBoundary>
        );
      case 'importers_management_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetImportersManagement />
          </ErrorBoundary>
        );
      case 'profile_settings_vet':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetProfileSettings />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeTab]}>
            <VetHome setActiveTab={setActiveTab} />
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <VetSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'mr-20' : 'mr-64'}`}>
        <VetHeader
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={handleNavigate}
        />
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
          boxSizing: 'border-box'
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}
