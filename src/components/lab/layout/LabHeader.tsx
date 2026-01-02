import { Search, User, X, FileText, TestTube, Users, ClipboardList, Calculator, Package, LogOut, BarChart, Printer, CheckCircle, Stethoscope } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import { useSearch } from '../../../hooks/useSearch';

interface HeaderProps {
  onSearchNavigate?: (tab: string, data: any) => void;
}

export default function Header({ onSearchNavigate }: HeaderProps) {
  const auth = useAuth();
  const { searchQuery, setSearchQuery, searchResults, isSearching, showResults, setShowResults, clearSearch } = useSearch();

  if (!auth) {
    return null;
  }

  const { user, hasPermission, signOut } = auth;

  const handleResultClick = (result: any) => {
    if (onSearchNavigate) {
      let targetTab = '';
      let canNavigate = true;

      switch (result.type) {
        case 'procedure':
          if (hasPermission('add_lab_procedures') || hasPermission('view_all')) {
            targetTab = 'register_procedure_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'sample':
          if (hasPermission('add_lab_procedures') || hasPermission('view_all')) {
            targetTab = 'reception_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'user':
          if (hasPermission('manage_lab_users')) {
            targetTab = 'user_management_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'test_result':
          if (hasPermission('add_lab_results') || hasPermission('edit_lab_results') || hasPermission('view_all')) {
            targetTab = 'results_entry_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'vet_procedure':
          if (hasPermission('view_vet_procedures') || hasPermission('view_all')) {
            targetTab = 'veterinary_procedures_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'print_result':
          if (hasPermission('print_results') || hasPermission('view_all')) {
            targetTab = 'print_results_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'approval':
          if (hasPermission('approve_results') || hasPermission('view_all')) {
            targetTab = 'results_approval_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'report':
          if (hasPermission('view_reports') || hasPermission('view_all')) {
            targetTab = 'reports_lab';
          } else {
            canNavigate = false;
          }
          break;
        case 'dilution':
          targetTab = 'dilution_calculator_lab';
          break;
        case 'inventory':
          if (hasPermission('add_inventory_item') || hasPermission('edit_inventory_item') ||
              hasPermission('delete_inventory_item') || hasPermission('withdraw_inventory_item')) {
            targetTab = 'inventory_lab';
          } else {
            canNavigate = false;
          }
          break;
        default:
          targetTab = 'home_lab';
      }

      if (canNavigate && targetTab) {
        onSearchNavigate(targetTab, result);
      }
    }
    clearSearch();
  };

  return (
    <>
      <header className="bg-white shadow-lg border-b-2 border-gray-200 px-6 w-full flex items-center" style={{ height: '90px' }}>
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
                   user?.role === 'lab_manager' ? 'مدير المختبر' :
                   user?.role === 'section_supervisor' ? 'مشرف مجموعة' :
                   user?.role === 'lab_specialist' ? 'أخصائي مختبر' :
                   user?.role === 'vet_general_supervisor' ? 'مشرف عام المحجر' : 'موظف المختبر'}
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
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="البحث في الإجراءات، العينات، المستخدمين..."
                  className="pr-10 pl-3 h-[50px] bg-white/80 backdrop-blur-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right w-96 shadow-md font-semibold text-sm text-gray-700 placeholder:text-gray-400 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-secondary-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-secondary-100 max-h-96 overflow-y-auto z-50">
                  {searchResults.map((result) => {
                    // التحقق من صلاحية الوصول لكل نتيجة
                    let canView = true;
                    if (result.type === 'procedure' || result.type === 'sample') {
                      canView = hasPermission('add_lab_procedures') || hasPermission('view_all');
                    } else if (result.type === 'user') {
                      canView = hasPermission('manage_lab_users');
                    } else if (result.type === 'test_result') {
                      canView = hasPermission('add_lab_results') || hasPermission('edit_lab_results') || hasPermission('view_all');
                    } else if (result.type === 'vet_procedure') {
                      canView = hasPermission('view_vet_procedures') || hasPermission('view_all');
                    } else if (result.type === 'print_result') {
                      canView = hasPermission('print_results') || hasPermission('view_all');
                    } else if (result.type === 'approval') {
                      canView = hasPermission('approve_results') || hasPermission('view_all');
                    } else if (result.type === 'report') {
                      canView = hasPermission('view_reports') || hasPermission('view_all');
                    } else if (result.type === 'inventory') {
                      canView = hasPermission('add_inventory_item') || hasPermission('edit_inventory_item') ||
                                hasPermission('delete_inventory_item') || hasPermission('withdraw_inventory_item');
                    }

                    if (!canView) return null;

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full p-4 hover:bg-secondary-50 transition-all duration-200 border-b border-secondary-100/50 last:border-b-0 text-right group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1 p-2 bg-secondary-50 rounded-lg group-hover:bg-secondary-100 transition-colors">
                            {result.type === 'procedure' && <FileText className="w-5 h-5 text-primary-600" />}
                            {result.type === 'sample' && <TestTube className="w-5 h-5 text-secondary-600" />}
                            {result.type === 'user' && <Users className="w-5 h-5 text-tertiary-600" />}
                            {result.type === 'test_result' && <ClipboardList className="w-5 h-5 text-emerald-600" />}
                            {result.type === 'vet_procedure' && <Stethoscope className="w-5 h-5 text-purple-600" />}
                            {result.type === 'print_result' && <Printer className="w-5 h-5 text-indigo-600" />}
                            {result.type === 'approval' && <CheckCircle className="w-5 h-5 text-orange-600" />}
                            {result.type === 'report' && <BarChart className="w-5 h-5 text-pink-600" />}
                            {result.type === 'dilution' && <Calculator className="w-5 h-5 text-blue-600" />}
                            {result.type === 'inventory' && <Package className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{result.title}</p>
                            <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                            {result.metadata && (
                              <p className="text-xs text-gray-500 truncate mt-1">{result.metadata}</p>
                            )}
                          </div>
                          {result.date && (
                            <div className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {new Date(result.date).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-secondary-100 p-8 z-50">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-secondary-400" />
                    </div>
                    <p className="font-bold text-gray-700 text-lg">لا توجد نتائج</p>
                    <p className="text-sm mt-2 text-gray-500">جرب كلمات بحث أخرى</p>
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-secondary-100 p-8 z-50">
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-secondary-500 mx-auto mb-4"></div>
                    <p className="text-sm font-semibold">جاري البحث...</p>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}

    </>
  );
}