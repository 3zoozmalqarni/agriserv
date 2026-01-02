import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import BeneficiarySidebar from './layout/BeneficiarySidebar';
import BeneficiaryHeader from './layout/BeneficiaryHeader';
import BeneficiaryHome from './modules/BeneficiaryHome';
import BeneficiaryShipmentTracking from './modules/BeneficiaryShipmentTracking';
import BeneficiaryRatings from './modules/BeneficiaryRatings';
import BeneficiaryUserManagement from './modules/BeneficiaryUserManagement';

export default function BeneficiaryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home_beneficiary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('beneficiary_sidebar_collapsed');
    return saved === 'true';
  });
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home_beneficiary':
        return <BeneficiaryHome />;
      case 'shipment_tracking_beneficiary':
        return <BeneficiaryShipmentTracking />;
      case 'ratings_beneficiary':
        return <BeneficiaryRatings />;
      case 'user_management_beneficiary':
        return <BeneficiaryUserManagement />;
      default:
        return <BeneficiaryHome />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <BeneficiarySidebar activeTab={activeTab} setActiveTab={setActiveTab} onCollapsedChange={setSidebarCollapsed} userRole={user?.role} />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'mr-20' : 'mr-64'}`}>
        <BeneficiaryHeader />
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
