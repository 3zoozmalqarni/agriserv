import { useState, useEffect } from 'react';
import { Search, Eye, Printer, ClipboardList, Cat, AlertTriangle, X, Copy } from 'lucide-react';
import { useVetProcedures } from '../../../hooks/useVetProcedures';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';
import PageHeader from '../../shared/PageHeader';
import { getAlertForProcedure, getAllAlerts, dismissAlert } from '../../../lib/vetAlerts';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import { localDB } from '../../../lib/localDatabase';

export default function VeterinaryProcedures() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [, forceUpdate] = useState({});
  const [labProcedures, setLabProcedures] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures, loading } = useVetProcedures();

  useEffect(() => {
    const loadLabProcedures = async () => {
      try {
        const procedures = await localDB.getSavedSamples();
        setLabProcedures(procedures);
      } catch (error) {
        console.error('Error loading lab procedures:', error);
      }
    };

    loadLabProcedures();

    const handleDataChanged = () => {
      loadLabProcedures();
    };

    window.addEventListener('procedures-data-changed', handleDataChanged);
    window.addEventListener('alerts-updated', handleDataChanged);

    return () => {
      window.removeEventListener('procedures-data-changed', handleDataChanged);
      window.removeEventListener('alerts-updated', handleDataChanged);
    };
  }, []);

  const hasLinkedLabProcedure = (vetProcedureNumber: string): boolean => {
    return labProcedures.some(
      labProc => labProc.external_procedure_number === vetProcedureNumber
    );
  };

  const filteredRecords = procedures.filter(record => {
    const matchesSearch =
      record.procedure_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.country_port || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // حساب الصفحات
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // إعادة تعيين الصفحة إلى 1 عند تغيير البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleView = (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (procedure) {
      setSelectedProcedure(procedure);
      setShowViewModal(true);
    }
  };


  const handlePrintProcedure = () => {
    if (!selectedProcedure) return;

    // Get the content to print
    const printArea = document.querySelector('.print-modal-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    // Clone and clean the content
    const clonedContent = printArea.cloneNode(true) as HTMLElement;
    const noPrintElements = clonedContent.querySelectorAll('.no-print, button, svg');
    noPrintElements.forEach(el => el.remove());

    // Create table structure with repeating header
    const printTable = document.createElement('table');
    printTable.style.width = '100%';
    printTable.style.borderCollapse = 'collapse';

    // Create thead (will repeat on every page)
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="padding: 0;">
          <div style="text-align: center; padding: 6px 0; margin-bottom: 6px; border-bottom: 2px solid #008a40;">
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">القسم البيطري بمحجر ميناء جدة الإسلامي - قسم المختبر</h1>
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">إجراء بيطري</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 0; margin-top: 4px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">العميل/الباخرة:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.client_name}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">التاريخ:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.reception_date}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">بلد المنشأ:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.country_port || 'غير محدد'}</span></div>
            </div>
          </div>
        </th>
      </tr>
    `;

    // Create tbody with content
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.style.padding = '0';
    td.appendChild(clonedContent);
    tr.appendChild(td);
    tbody.appendChild(tr);

    printTable.appendChild(thead);
    printTable.appendChild(tbody);

    // Create temporary print container
    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container-vet';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-vet';
    printStyles.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm !important;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        @page {
          margin: 10mm !important;
        }

        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }

        th, td {
          page-break-inside: avoid !important;
        }

        .print-modal-content {
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-modal-content > div {
          page-break-inside: auto !important;
          margin-bottom: 8px !important;
        }

        .sample-card {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        .info-item,
        .grid > div,
        .space-y-2 > div,
        .bg-blue-50,
        .bg-gray-50,
        .bg-green-50,
        p,
        h3 {
          page-break-inside: avoid !important;
          orphans: 3;
          widows: 3;
        }

        .section {
          page-break-inside: auto !important;
        }

        body::after {
          content: "هذا الإجراء تم إنشاءه لاستخدامات القسم البيطري بمحجر ميناء جدة الإسلامي • تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية • للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي" !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          text-align: center !important;
          font-size: 6.5px !important;
          padding: 8px 10px !important;
          background: white !important;
          border-top: 2px solid #008a40 !important;
          color: #374151 !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          z-index: 9999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body > *:not(#temp-print-container-vet) {
          display: none !important;
        }

        #temp-print-container-vet {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-vet > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-vet * {
          visibility: visible !important;
        }

        .no-print,
        button,
        input,
        svg {
          display: none !important;
        }

        h1, h2, h3 {
          page-break-after: avoid !important;
        }

        .section {
          page-break-inside: auto !important;
        }

        .sample-card {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        .print-footer,
        .footer {
          display: none !important;
        }

        h1 { color: #003361 !important; }
        h2 { color: #00a651 !important; }
        h3 { color: #6b7280 !important; }

        .text-gray-900 { color: #111827 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .font-semibold { font-weight: 600 !important; }
        .font-bold { font-weight: 700 !important; }

        .bg-blue-50 { background-color: #eff6ff !important; }
        .bg-gray-50 { background-color: #f9fafb !important; }
        .bg-green-50 { background-color: #f0fdf4 !important; }
        .bg-red-50 { background-color: #fef2f2 !important; }
        .bg-yellow-50 { background-color: #fefce8 !important; }
        .border-gray-200 { border-color: #e5e7eb !important; }
        .border-blue-200 { border-color: #bfdbfe !important; }

        /* Force two-column layout for basic info sections */
        .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 1rem !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-vet');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    // Print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-vet');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-vet');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003361] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={ClipboardList}
            title="إجراءات القسم البيطري"
            subtitle="عرض ومتابعة إجراءات الفحص البيطري"
          />

          {(() => {
            const deletedAlerts = getAllAlerts().filter(a => !a.dismissed && a.action_type === 'deleted');
            if (deletedAlerts.length > 0) {
              return (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-red-800 font-bold text-lg mb-2">تنبيه: تم حذف إجراءات بيطرية</h3>
                      <div className="space-y-1">
                        {deletedAlerts.map(alert => (
                          <div key={alert.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-red-700 font-semibold">رقم الإجراء:</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(alert.vet_procedure_number);
                                  showToast.primary('تم نسخ رقم الإجراء');
                                }}
                                className="p-1.5 text-red-700 hover:text-white hover:bg-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                title="نسخ رقم الإجراء"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-red-700 font-bold">{alert.vet_procedure_number}</span>
                            </div>
                            <button
                              onClick={() => {
                                dismissAlert(alert.vet_procedure_number, 'deleted');
                                forceUpdate({});
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              إخفاء التنبيه
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-red-600 text-sm mt-2">
                        تم حذف هذه الإجراءات من قاعدة بيانات المحجر. الرجاء حذف الإجراءات المرتبطة بها من المختبر.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInputWithPaste
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="ابحث برقم الإجراء، اسم العميل، أو بلد المنشأ..."
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد سجلات</h3>
              <p className="text-gray-500">لم يتم العثور على أي سجلات مطابقة للبحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">مجموع عدد العينات</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">أنواع الحيوانات</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">بلد المنشأ</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">تاريخ الإجراء البيطري</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">اسم العميل/الباخرة</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">رقم الإجراء البيطري</th>
                    <th className="px-4 py-4 text-center font-bold text-[#003361] text-sm">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record, index) => {
                    const actualIndex = startIndex + index;
                    const totalSamples = record.sample_groups?.reduce((sum, group) =>
                      sum + (group.sample_count || 0), 0) || 0;
                    const animalTypes = Array.from(new Set(record.sample_groups?.map((group: any) => group.animal_type) || [])).join(' - ');

                    return (
                      <tr
                        key={record.id}
                        className={`
                          transition-all duration-150
                          ${actualIndex % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}
                          hover:bg-teal-50/30 border-b border-gray-100
                        `}
                      >
                        <td className="px-4 py-3 text-center">
                          <span className="text-[#003361] text-sm">{totalSamples}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 text-sm">({animalTypes})</td>
                        <td className="px-4 py-3 text-center text-gray-700 text-sm">{record.country_port}</td>
                        <td className="px-4 py-3 text-center text-gray-700 text-sm">{record.reception_date}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-900 text-sm">{record.client_name}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(record.procedure_number);
                                toast.success('تم نسخ رقم الإجراء');
                              }}
                              className="p-1.5 text-[#003361] hover:text-white hover:bg-[#003361] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="نسخ رقم الإجراء"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {getAlertForProcedure(record.procedure_number)?.action_type === 'updated' ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 border-2 border-yellow-400 rounded-lg animate-pulse">
                                <span className="font-bold text-[#003361] text-sm">{record.procedure_number}</span>
                                <div className="flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </div>
                              </div>
                            ) : !hasLinkedLabProcedure(record.procedure_number) ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="font-bold text-[#003361] text-sm">{record.procedure_number}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md animate-pulse">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  جديد
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-[#003361] text-sm">{record.procedure_number}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(record.id)}
                              className="p-2 rounded-lg hover:bg-teal-100 text-teal-600 transition-colors"
                              title="معاينة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* أزرار التنقل بين الصفحات */}
          {filteredRecords.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                عرض {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} من أصل {filteredRecords.length} إجراء
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#003361] text-white hover:bg-[#00a651]'
                  }`}
                >
                  السابق
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                            currentPage === page
                              ? 'bg-[#00a651] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#003361] text-white hover:bg-[#00a651]'
                  }`}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showViewModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 print-modal-content">
              <div className="flex items-center justify-between mb-6 pb-4 no-print">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedProcedure(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#003361' }}>القسم البيطري بمحجر ميناء جدة الإسلامي - قسم المختبر</h1>
                  <h2 className="text-xl font-semibold" style={{ color: '#00a651' }}>إجراء بيطري</h2>
                </div>
                <button
                  onClick={handlePrintProcedure}
                  className="p-2 text-white rounded-full transition-colors flex-shrink-0 flex items-center gap-2 px-4"
                  style={{ backgroundColor: '#f18700' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
                  title="طباعة"
                >
                  <Printer className="w-5 h-5" />
                  <span className="text-sm font-semibold">طباعة</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#003361]/5 p-4 rounded-lg no-break">
                    <h3 className="font-bold text-[#003361] mb-3 text-right">معلومات أساسية</h3>
                    <div className="space-y-2 text-right">
                      <div><span className="font-semibold">رقم الإجراء البيطري:</span> {selectedProcedure.procedure_number}</div>
                      <div><span className="font-semibold">اسم العميل/الباخرة:</span> {selectedProcedure.client_name}</div>
                      <div><span className="font-semibold">تاريخ الإجراء البيطري:</span> {selectedProcedure.reception_date}</div>
                      <div><span className="font-semibold">بلد المنشأ:</span> {selectedProcedure.country_port}</div>
                      <div><span className="font-semibold">اسم معد الإجراء البيطري:</span> {selectedProcedure.receiver_name}</div>
                      <div><span className="font-semibold">مجموع عدد العينات:</span> {selectedProcedure.sample_groups?.reduce((sum: number, group: any) => sum + (group.sample_count || 0), 0) || 0}</div>
                    </div>
                  </div>

                  <div className="bg-[#00a651]/5 p-4 rounded-lg no-break">
                    <h3 className="font-bold text-[#00a651] mb-3 text-right">الأطباء القائمين بالكشف و سحب العينات</h3>
                    <div className="space-y-2 text-right">
                      <div className="font-medium text-gray-800">{selectedProcedure.sampling_doctors.join(' - ')}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 text-right text-sm">
                    الفحوصات المطلوبة
                  </h3>
                  <div className="space-y-2">
                    {selectedProcedure.sample_groups?.map((group: any, groupIndex: number) => (
                      <div key={groupIndex} className="bg-gray-50 rounded-lg p-2 border border-gray-200 no-break">
                        <div className="font-medium text-gray-900 mb-2 text-xs">
                          {group.animal_type} - {group.animal_gender} ({group.sample_count || 0} عينة)
                        </div>
                        <div className="space-y-1">
                          {group.samples?.map((sample: any, sampleIndex: number) => (
                            <div key={sampleIndex} className="flex items-center p-2 bg-white rounded border border-gray-100">
                              <div className="flex-1 grid grid-cols-3 gap-2 text-[11px]">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 font-medium">رقم العينة:</span>
                                  <span className="text-gray-900 font-semibold">{sample.sample_number || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 font-medium">الفحص المطلوب:</span>
                                  <span className="text-gray-900">{sample.required_test}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 font-medium">نوع العينة:</span>
                                  <span className="text-gray-900">{sample.sample_type}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-gray-200 print-footer">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-900 font-semibold mb-2 text-sm">
                      هذا الإجراء تم إنشاءه لاستخدامات القسم البيطري بمحجر ميناء جدة الإسلامي
                    </p>
                    <p className="text-red-600 font-medium mb-2 text-xs">
                      تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية
                    </p>
                    <p className="text-gray-600 text-xs">
                      للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
