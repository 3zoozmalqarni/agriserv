import { useState, useEffect } from 'react';
import { Menu, User, Shield, Search, X, FileText, Package, Activity, TestTube, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useVetSearch } from '../../../hooks/useVetSearch';

interface VetHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onNavigate?: (tab: string, procedureId?: string) => void;
}

export default function VetHeader({ onToggleSidebar, sidebarCollapsed, onNavigate }: VetHeaderProps) {
  const auth = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showResults,
    clearSearch
  } = useVetSearch();


  if (!auth) {
    return null;
  }

  const { user, signOut, hasPermission } = auth;

  const handleResultClick = (result: any) => {
    clearSearch();
    if (onNavigate && result.targetTab) {
      onNavigate(result.targetTab, result.data?.id || result.id);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'vet_procedure':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'animal_shipment':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'lab_procedure':
        return <Activity className="w-5 h-5 text-purple-600" />;
      case 'lab_result':
        return <TestTube className="w-5 h-5 text-orange-600" />;
      case 'quarantine_trader':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'vet_procedure':
        return 'إجراء بيطري';
      case 'animal_shipment':
        return 'إرسالية';
      case 'lab_procedure':
        return 'إجراء مختبر';
      case 'lab_result':
        return 'نتيجة فحص';
      case 'quarantine_trader':
        return 'حجر بيطري';
      default:
        return '';
    }
  };

  return (
    <header className="bg-white shadow-lg border-b-2 border-secondary-100 px-6 w-full flex items-center" style={{ height: '90px' }}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md border border-secondary-100">
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.name}
                className="w-10 h-10 rounded-xl object-cover shadow-lg border-2 border-secondary-200"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="text-right border-r-2 border-secondary-200 pr-3">
              <p className="text-sm font-bold text-gray-900">
                {user?.name || 'مستخدم النظام'}
              </p>
              <p className="text-[11px] text-secondary-600 font-semibold">
                {user?.role === 'program_manager' ? 'مدير البرنامج' :
                 user?.role === 'vet_general_supervisor' ? 'مشرف عام المحجر' :
                 user?.role === 'vet_manager' ? 'مدير القسم البيطري' :
                 user?.role === 'vet_officer' ? 'مشرف مجموعة' :
                 user?.role === 'vet_inspector' ? 'طبيب بيطري' : 'موظف المحجر'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-3">

          <button
            onClick={signOut}
            className="relative group p-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>

          {hasPermission('use_search') && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الإجراء، رقم البيان، رقم الإذن، اسم العميل..."
              className="w-80 px-4 py-2 pr-10 pl-8 h-[50px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#61bf69] focus:border-transparent focus:outline-[#61bf69] bg-white/80 backdrop-blur-sm shadow-md text-right text-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-secondary-200 rounded-xl shadow-xl max-h-[500px] overflow-y-auto z-50">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-5 py-4 text-right hover:bg-secondary-50 transition-colors border-b border-secondary-100 last:border-b-0 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-secondary-700">
                        {result.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full">
                        {getResultTypeLabel(result.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {result.subtitle}
                    </div>
                    {result.metadata && (
                      <div className="text-xs text-gray-500">
                        {result.metadata}
                      </div>
                    )}
                    {result.date && (
                      <div className="text-xs text-gray-400 mt-1">
                        {result.date}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && !isSearching && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-secondary-200 rounded-xl shadow-xl p-5 text-center text-gray-500 z-50">
              لا توجد نتائج مطابقة
            </div>
          )}

          {isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-secondary-200 rounded-xl shadow-xl p-5 text-center text-gray-500 z-50">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secondary-600 mx-auto mb-2"></div>
              جاري البحث...
            </div>
          )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
