import { useState, useEffect } from 'react';
import { Search, Eye, CreditCard as Edit, Trash2, Filter, X, Printer, Plus, Save, ChevronDown, ChevronRight, ClipboardList, Cat, AlertCircle, Copy } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVetProcedures } from '../../../hooks/useVetProcedures';
import { useAuth } from '../../../hooks/useAuth.tsx';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';
import PageHeader from '../../shared/PageHeader';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import Pagination from '../../shared/Pagination';

interface VetProcedureRecordsProps {
  highlightProcedureId?: string | null;
}

export default function VetProcedureRecords({ highlightProcedureId }: VetProcedureRecordsProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures, loading, deleteProcedure, updateProcedure } = useVetProcedures();
  const auth = useAuth();
  const hasPermission = auth?.hasPermission || (() => false);

  useEffect(() => {
    if (highlightProcedureId && procedures.length > 0) {
      const procedure = procedures.find(p => p.id === highlightProcedureId);
      if (procedure) {
        handleView(highlightProcedureId);
        const element = document.getElementById(`procedure-${highlightProcedureId}`);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  }, [highlightProcedureId, procedures]);


  const filteredRecords = procedures.filter(record => {
    const matchesSearch =
      record.procedure_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.country_port || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const handleEdit = (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (procedure) {
      setSelectedProcedure(procedure);
      setShowEditModal(true);
    }
  };

  const handleDelete = (id: string) => {
    setProcedureToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (procedureToDelete) {
      deleteProcedure(procedureToDelete);
      setShowDeleteModal(false);
      setProcedureToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProcedureToDelete(null);
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
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">القسم البيطري بمحجر ميناء جدة الإسلامي</h1>
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
    printContainer.id = 'temp-print-container-qproc';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-qproc';
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

        body > *:not(#temp-print-container-qproc) {
          display: none !important;
        }

        #temp-print-container-qproc {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-qproc > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-qproc * {
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

    const oldStyles = document.getElementById('dynamic-print-styles-qproc');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    // Print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-qproc');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-qproc');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const handleSaveEdit = async (updatedData: any) => {
    if (selectedProcedure) {
      await updateProcedure(selectedProcedure.id, updatedData);
      setShowEditModal(false);
      setSelectedProcedure(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={ClipboardList}
            title="سجل الإجراءات"
            subtitle="إدارة ومتابعة الإجراءات البيطرية"
          />

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
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد إجراءات</h3>
              <p className="text-gray-500">لم يتم العثور على أي إجراءات مطابقة للبحث</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">مجموع عدد العينات</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">أنواع الحيوانات</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">بلد المنشأ</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">تاريخ الإجراء البيطري</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">اسم العميل/الباخرة</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">رقم الإجراء البيطري</th>
                <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((record) => {
                const totalSamples = record.sample_groups?.reduce((sum, group) =>
                  sum + (group.sample_count || 0), 0) || 0;
                const animalCount = record.sample_groups?.reduce((total: number, group: any) =>
                  total + (group.sample_count || 0), 0) || 0;
                const animalTypes = Array.from(new Set(record.sample_groups?.map((group: any) => group.animal_type) || [])).join(' - ');

                return (
                  <tr
                    key={record.id}
                    id={`procedure-${record.id}`}
                    className={`border-b border-gray-100 hover:bg-[#61bf69]/5 transition-colors ${highlightProcedureId === record.id ? 'bg-secondary-50 ring-2 ring-secondary-300' : ''}`}
                  >
                    <td className="px-3 py-4 text-center">
                      <span className="text-[#003361]">{totalSamples}</span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">({animalTypes})</td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">{record.country_port}</td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">{record.reception_date}</td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">{record.client_name}</td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(record.procedure_number);
                            showToast.warning('تم نسخ رقم الإجراء');
                          }}
                          className="p-1.5 text-[#003361] hover:text-white hover:bg-[#003361] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="نسخ رقم الإجراء"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-[#003361]">{record.procedure_number}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleView(record.id)}
                          className="p-2 text-[#61bf69] hover:text-white hover:bg-[#61bf69] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(record.id)}
                          className="p-2 text-orange-600 hover:text-white hover:bg-orange-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {hasPermission('delete_vet_procedure') && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredRecords.length}
                />
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {showViewModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 print-modal-content">
              <div className="flex items-center justify-between mb-6 pb-4 print-header no-print">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedProcedure(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 no-print"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#003361' }}>القسم البيطري بمحجر ميناء جدة الإسلامي</h1>
                  <h2 className="text-lg font-semibold" style={{ color: '#00a651' }}>إجراء بيطري</h2>
                </div>
                <button
                  onClick={handlePrintProcedure}
                  className="p-2 text-white rounded-full transition-colors flex-shrink-0 flex items-center gap-2 px-4 no-print"
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
                <h3 className="font-bold text-gray-900 mb-3 text-right text-base">
                  الفحوصات المطلوبة
                </h3>
                <div className="space-y-2">
                  {selectedProcedure.sample_groups?.map((group: any, groupIndex: number) => (
                    <div key={groupIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200 no-break">
                      <div className="font-semibold text-gray-900 mb-2 text-sm">
                        {group.animal_type} - {group.animal_gender} ({group.sample_count || 0} عينة)
                      </div>
                      <div className="space-y-1">
                        {group.samples?.map((sample: any, sampleIndex: number) => (
                          <div key={sampleIndex} className="flex items-center p-3 bg-white rounded border border-gray-100">
                            <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
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

              {/* Footer */}
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

      {showEditModal && selectedProcedure && (
        <EditProcedureModal
          procedure={selectedProcedure}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProcedure(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-3">
                هل أنت متأكد من حذف هذا الإجراء؟
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                <p className="text-red-800 font-semibold text-sm mb-1">تحذير:</p>
                <p className="text-red-700 text-sm">
                  سيتم حذف جميع البيانات المرتبطة بهذا الإجراء نهائياً من قاعدة البيانات بما في ذلك:
                </p>
                <ul className="text-red-700 text-sm list-disc list-inside mt-2 text-right mr-2">
                  <li>جميع العينات المرتبطة</li>
                  <li>سجل الإرسالية الحيوانية المرتبط</li>
                  <li>جميع نتائج المختبر المرتبطة</li>
                </ul>
                <p className="text-red-800 font-bold text-sm mt-2">
                  لن تتمكن من استعادة هذه البيانات مستقبلاً
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const sampleReceptionSchema = z.object({
  client_name: z.string().min(1, 'اسم العميل/الباخرة مطلوب'),
  reception_date: z.string().min(1, 'تاريخ الإجراء مطلوب'),
  procedure_number: z.string().min(1, 'رقم الإجراء مطلوب'),
  country_port: z.string().min(1, 'بلد المنشأ مطلوب'),
  custom_country_port: z.string().optional(),
  receiver_name: z.string().min(1, 'اسم معد الإجراء مطلوب'),
  custom_receiver_name: z.string().optional(),
  sample_groups: z.array(z.object({
    animal_type: z.string().min(1, 'نوع الحيوان مطلوب'),
    custom_animal_type: z.string().optional(),
    animal_gender: z.string().min(1, 'جنس الحيوان مطلوب'),
    custom_animal_gender: z.string().optional(),
    sample_count: z.number({
      required_error: 'عدد العينات مطلوب',
      invalid_type_error: 'يجب إدخال رقم صحيح',
    }).min(1, 'يجب أن يكون عدد العينات 1 على الأقل'),
    samples: z.array(z.object({
      sample_number: z.string().optional(),
      required_test: z.string().min(1, 'الفحص المطلوب مطلوب'),
      custom_test: z.string().optional(),
      sample_type: z.string().min(1, 'نوع العينة مطلوب'),
      custom_sample_type: z.string().optional(),
    })).min(1, 'يجب إضافة عينة واحدة على الأقل'),
  })).min(1, 'يجب إضافة مجموعة واحدة على الأقل'),
  sampling_doctors: z.array(z.string()).min(1, 'يجب اختيار طبيب واحد على الأقل'),
  custom_sampling_doctor: z.string().optional(),
});

type SampleReceptionForm = z.infer<typeof sampleReceptionSchema>;

const requiredTestOptions = [
  'الحمى المالطية (البروسيلا)',
  'الحمى القلاعية (FMD)',
  'حمى الوادى المتصدع (RVF)',
  'كفاءة التحصين ضد مرض حمى الوادي المتصدع (RVF)',
  'جدري الأغنام (sheep pox)',
  'جدرى الجمال',
  'طاعون المجترات الصغيرة (PPR)',
  'التسمم الدموي (HS) باستريلا',
  'التسمم المعوي (ET) كلستريديم',
  'السالمونيلا',
  'أي كولاي (E.coli)',
  'نظير السل (جونز)',
  'الحمى المجهولة (Q fever)',
  'التهاب الضرع',
  'الكلاميديا',
  'ليستريا',
  'مرض مورل',
  'السل الكاذب',
  'الكامبيلوباكتر',
  'الليبتوسبيرا',
  'الإلتهاب الرئوي البلوري في الماعز (أبو رمح ) (ccpp)',
  'رعام الخيل (Glanders)',
  'خناق الخيل (ٍStrangles)',
  'التهاب رئوي (مانهيميا)',
  'اللسان الأزرق (BTV)',
  'الإسهال البقري الفيروسي (BVD)',
  'هربس الأبقار (pi3)',
  'الحمى النزلية الخبيثة في الأبقار (MCF)',
  'أي عينة سائل منوي',
  'سرطان الأبقار (Bovine Leukosis)',
  'أنفلونزا الخيول',
  'فيروس كورونا و الروتا',
  'التهاب الأنف البقري المعدي (IBR)',
  'هربس الخيول',
  'حمى غرب النيل',
  'التهاب الدماغ الخيلي',
  'التهاب الفم البثري (Orf)',
  'مرض السعار',
  'طاعون الخيل الافريقى',
  'نضير الانفلونزا النوع -3',
  'متلازمة الشرق الاوسط التنفسية',
  'حمى الثلاث ايام في الابقار',
  'حمى النزف الوبائية ( EHDV)',
  'التهاب الجلد العقدى في الابقر(LSDV)',
  'التهاب شرايين الخيل',
  'مرض انيميا الخيل المعدى',
  'الثايليريا',
  'البابيزيا',
  'الهيام (تريبانوسوما)',
  'أنابلازما',
  'كوكسيديا (Coccidia)',
  'طفيليات الدم (Blood Parasites)',
  'طفيليات داخلية (Interal Parasites)',
  'التكسوبلازما (Toxoplasmosis)',
  'ترايكوموناس',
  'الذباب',
  'يرقات',
  'قراد',
  'أنفلونزا الطيور (AIV)',
  'مرض النيوكاسل (ND)',
  'التهاب القصبة المعدي (IBV)',
  'مرض الجدرى في الطيور (Fowl pox)',
  'ماركس (marek\'s disease)',
  'فيروس الريو (Reo virus)',
  'ليكوزس الدجاج (Avian Leukosis)',
  'جاليد هربس فيرس – 1 (ILT)',
  'مرض الجمبورو (IBDV)',
  'مرض الادينو Avian Adeno virus',
  'انفلونزا الطيور',
  'أخرى'
];

const countryPortOptions = [
  'جيبوتي - جيبوتي',
  'السودان - سواكن',
  'الصومال - بربره',
  'الصومال - بوصاصو',
  'رومانيا - ميديا',
  'رومانيا - بريلاء',
  'جورجيا - باتومي',
  'جورجيا - بوتي',
  'اسبانيا - كارتاجينا',
  'اسبانيا - تارجوانا',
  'اسبانيا - كوراليجو',
  'تركيا - افياب',
  'تركيا - اسكندرون',
  'أوكرانيا - نيكوليف',
  'أوكرانيا - اوشاكوف',
  'كولمبيا - كارتاخينا',
  'البرازيل - فيلادي كواندا',
  'الهند - جواهرلال',
  'الصين - داليان',
  'الاوروغواي - مونتفيديو',
  'تايلندا - لايم تشايانج',
  'مولدوفيا - جورجيوليستس',
  'قبرص',
  'استراليا',
  'سوريا',
  'الخمرة',
  'أخرى'
];

const receiverNameOptions = [
  'سعود عيضة الثبيتي',
  'ماجد علي الفار',
  'سعود عبدالعزيز العمري',
  'عبدالله هاشم المعيرفي',
  'مرتضى عبدالله الجرفي',
  'اكرم المالي',
  'عبدالمجيد السواط',
  'طارق مطلق الغامدي',
  'كاظم أبو داوود',
  'الطيب عثمان',
  'أخرى'
];

const samplingDoctorOptions = [
  'سعود عيضة الثبيتي',
  'ماجد علي الفار',
  'سعود عبدالعزيز العمري',
  'عبدالله هاشم المعيرفي',
  'مرتضى عبدالله الجرفي',
  'اكرم المالي',
  'عبدالمجيد السواط',
  'طارق مطلق الغامدي',
  'كاظم أبو داوود',
  'الطيب عثمان',
  'أخرى'
];

function EditProcedureModal({ procedure, onClose, onSave }: any) {
  const [showCustomCountryPort, setShowCustomCountryPort] = useState(false);
  const [showCustomReceiverName, setShowCustomReceiverName] = useState(false);
  const [selectedSamplingDoctors, setSelectedSamplingDoctors] = useState<string[]>(procedure.sampling_doctors || []);
  const [showCustomSamplingDoctor, setShowCustomSamplingDoctor] = useState(false);
  const [expandedSampleGroups, setExpandedSampleGroups] = useState<{[key: number]: boolean}>({});
  const [expandedIndividualSamples, setExpandedIndividualSamples] = useState<{[key: string]: boolean}>({});

  const animalTypeOptions = ['ماعز', 'أبقار', 'ابل', 'خيل', 'دواجن', 'أغنام', 'بيض'];
  const animalGenderOptions = ['ذكور', 'إناث'];
  const sampleTypeOptions = ['دم', 'مسحة', 'براز', 'بول', 'حليب', 'سائل منوي', 'جثه', 'فرشه', 'كرش', 'جهاز تنفسي'];

  const processedSampleGroups = (procedure.sample_groups || []).map((group: any) => ({
    ...group,
    animal_type: animalTypeOptions.includes(group.animal_type) ? group.animal_type : 'أخرى',
    custom_animal_type: !animalTypeOptions.includes(group.animal_type) ? group.animal_type : '',
    animal_gender: animalGenderOptions.includes(group.animal_gender) ? group.animal_gender : 'أخرى',
    custom_animal_gender: !animalGenderOptions.includes(group.animal_gender) ? group.animal_gender : '',
    samples: (group.samples || []).map((sample: any) => ({
      ...sample,
      required_test: requiredTestOptions.includes(sample.required_test) ? sample.required_test : 'أخرى',
      custom_test: !requiredTestOptions.includes(sample.required_test) ? sample.required_test : '',
      sample_type: sampleTypeOptions.includes(sample.sample_type) ? sample.sample_type : 'أخرى',
      custom_sample_type: !sampleTypeOptions.includes(sample.sample_type) ? sample.sample_type : '',
    }))
  }));

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SampleReceptionForm>({
    resolver: zodResolver(sampleReceptionSchema),
    defaultValues: {
      procedure_number: procedure.procedure_number,
      reception_date: procedure.reception_date,
      client_name: procedure.client_name,
      country_port: countryPortOptions.includes(procedure.country_port) ? procedure.country_port : 'أخرى',
      custom_country_port: countryPortOptions.includes(procedure.country_port) ? '' : procedure.country_port,
      receiver_name: receiverNameOptions.includes(procedure.receiver_name) ? procedure.receiver_name : 'أخرى',
      custom_receiver_name: receiverNameOptions.includes(procedure.receiver_name) ? '' : procedure.receiver_name,
      sample_groups: processedSampleGroups,
      sampling_doctors: procedure.sampling_doctors || [],
    },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control,
    name: 'sample_groups',
  });

  const watchedCountryPort = watch('country_port');
  const watchedReceiverName = watch('receiver_name');
  const watchedSampleGroups = watch('sample_groups');

  const toggleSampleGroup = (groupIndex: number) => {
    setExpandedSampleGroups(prev => ({
      ...prev,
      [groupIndex]: !prev[groupIndex]
    }));
  };

  const toggleIndividualSample = (groupIndex: number, sampleIndex: number) => {
    const key = `${groupIndex}-${sampleIndex}`;
    setExpandedIndividualSamples(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // دالة للتحقق من صحة بيانات المجموعة
  const isGroupValid = (groupIndex: number): boolean => {
    const group = watchedSampleGroups?.[groupIndex];
    if (!group) return false;

    const hasValidAnimalData = !!(
      group.animal_type &&
      group.animal_type.trim() &&
      group.animal_gender &&
      group.animal_gender.trim() &&
      group.sample_count !== undefined &&
      group.sample_count !== ''
    );

    const hasValidSamples = group.samples && group.samples.length > 0 && group.samples.every((sample: any) =>
      sample.required_test &&
      sample.required_test.trim() &&
      sample.sample_type &&
      sample.sample_type.trim()
    );

    return hasValidAnimalData && hasValidSamples;
  };

  // دالة للتحقق من صحة البيانات الأساسية
  const isBasicDataValid = (): boolean => {
    return !!(
      watch('reception_date') &&
      watch('client_name') &&
      watch('country_port') &&
      watch('receiver_name')
    );
  };

  // دالة للتحقق من صحة بيانات مجموعات العينات
  const areGroupsValid = (): boolean => {
    const groups = watchedSampleGroups || [];
    if (groups.length === 0) return false;
    return groups.every((_, index) => isGroupValid(index));
  };

  useEffect(() => {
    setShowCustomCountryPort(!countryPortOptions.includes(procedure.country_port));
    setShowCustomReceiverName(!receiverNameOptions.includes(procedure.receiver_name));
  }, []);

  useEffect(() => {
    if (watchedCountryPort === 'أخرى') {
      setShowCustomCountryPort(true);
    } else {
      setShowCustomCountryPort(false);
      setValue('custom_country_port', '');
    }
  }, [watchedCountryPort, setValue]);

  useEffect(() => {
    if (watchedReceiverName === 'أخرى') {
      setShowCustomReceiverName(true);
    } else {
      setShowCustomReceiverName(false);
      setValue('custom_receiver_name', '');
    }
  }, [watchedReceiverName, setValue]);

  const handleSamplingDoctorToggle = (doctor: string) => {
    setSelectedSamplingDoctors(prev => {
      const newDoctors = prev.includes(doctor)
        ? prev.filter(d => d !== doctor)
        : [...prev, doctor];
      setValue('sampling_doctors', newDoctors);
      return newDoctors;
    });
  };

  const removeSamplingDoctor = (doctor: string) => {
    setSelectedSamplingDoctors(prev => {
      const newDoctors = prev.filter(d => d !== doctor);
      setValue('sampling_doctors', newDoctors);
      return newDoctors;
    });
  };

  const addCustomSamplingDoctor = (doctorName: string) => {
    if (doctorName && !selectedSamplingDoctors.includes(doctorName)) {
      setSelectedSamplingDoctors(prev => {
        const newDoctors = [...prev, doctorName];
        setValue('sampling_doctors', newDoctors);
        return newDoctors;
      });
      setValue('custom_sampling_doctor', '');
      setShowCustomSamplingDoctor(false);
    }
  };

  const onSubmit = async (data: SampleReceptionForm) => {
    const procedureData = {
      procedure_number: data.procedure_number,
      client_name: data.client_name,
      reception_date: data.reception_date,
      country_port: data.country_port === 'أخرى' ? data.custom_country_port : data.country_port,
      receiver_name: data.receiver_name === 'أخرى' ? data.custom_receiver_name : data.receiver_name,
      sampling_doctors: data.sampling_doctors.map(doctor =>
        doctor === 'أخرى' ? data.custom_sampling_doctor : doctor
      ).filter(Boolean),
      sample_groups: data.sample_groups.map(group => ({
        animal_type: group.animal_type === 'أخرى' ? group.custom_animal_type : group.animal_type,
        animal_gender: group.animal_gender === 'أخرى' ? group.custom_animal_gender : group.animal_gender,
        sample_count: group.sample_count,
        samples: group.samples.map(sample => ({
          sample_number: sample.sample_number || '',
          required_test: sample.required_test === 'أخرى' ? sample.custom_test : sample.required_test,
          sample_type: sample.sample_type === 'أخرى' ? sample.custom_sample_type : sample.sample_type,
        })),
      })),
    };

    await onSave(procedureData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-6 border-b-2 border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">القسم البيطري بمحجر ميناء جدة الإسلامي</h1>
              <h2 className="text-lg font-semibold text-gray-700">تعديل الإجراء</h2>
            </div>
            <div className="w-10"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className={`border-2 rounded-xl p-6 shadow-lg transition-all ${
            !isBasicDataValid() ? 'bg-red-50/80 border-red-300' : 'bg-primary-50/80 border-primary-200'
          }`}>
            <h3 className="text-xl font-bold mb-6 text-right flex items-center justify-start gap-3">
              <span className={!isBasicDataValid() ? 'text-red-700' : 'text-primary-800'}>البيانات الأساسية</span>
              {!isBasicDataValid() && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  حقول إلزامية مفقودة
                </span>
              )}
              <div className={`w-3 h-3 rounded-full ${!isBasicDataValid() ? 'bg-red-500' : 'bg-primary-500'}`}></div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الإجراء<span className="text-red-500">*</span>
                </label>
                <input
                  {...register('procedure_number')}
                  readOnly
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg text-right font-mono text-lg font-bold shadow-inner bg-gray-100 cursor-not-allowed"
                  style={{ borderColor: 'rgba(97, 191, 105, 0.3)', color: '#61bf69' }}
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الإجراء<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('reception_date')}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
                />
                {errors.reception_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.reception_date.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم العميل/الباخرة <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('client_name')}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                />
                {errors.client_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.client_name.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  بلد المنشأ <span className="text-red-500">*</span>
                </label>
                {watchedCountryPort === 'أخرى' ? (
                  <div className="relative">
                    <input
                      {...register('custom_country_port')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                      style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                      placeholder="اكتب اسم البلد أو الميناء..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setValue('country_port', '');
                        setValue('custom_country_port', '');
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('country_port')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                  >
                    <option value="">اختر بلد المنشأ</option>
                    {countryPortOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {errors.country_port && (
                  <p className="text-red-500 text-sm mt-1">{errors.country_port.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم معد الإجراء<span className="text-red-500">*</span>
                </label>
                {watchedReceiverName === 'أخرى' ? (
                  <div className="relative">
                    <input
                      {...register('custom_receiver_name')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                      style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                      placeholder="اكتب اسم معد الإجراء..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setValue('receiver_name', '');
                        setValue('custom_receiver_name', '');
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('receiver_name')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                  >
                    <option value="">اختر اسم معد الإجراء</option>
                    {receiverNameOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {errors.receiver_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.receiver_name.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-accent-50/80 border-2 border-accent-200 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-right text-accent-800 flex items-center gap-3 mb-6">
              <span>العينات</span>
              <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
            </h3>

            <div className="space-y-4">
              {groupFields.map((groupField, groupIndex) => {
                const isGroupExpanded = expandedSampleGroups[groupIndex];
                const group = watchedSampleGroups?.[groupIndex];

                return (
                  <EditSampleGroupComponent
                    key={groupField.id}
                    groupIndex={groupIndex}
                    isGroupExpanded={isGroupExpanded}
                    group={group}
                    toggleSampleGroup={toggleSampleGroup}
                    register={register}
                    control={control}
                    setValue={setValue}
                    errors={errors}
                    removeGroup={removeGroup}
                    groupFieldsLength={groupFields.length}
                    toggleIndividualSample={toggleIndividualSample}
                    expandedIndividualSamples={expandedIndividualSamples}
                    requiredTestOptions={requiredTestOptions}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => appendGroup({ samples: [{ sample_number: '1' }] })}
              className="mt-4 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-md transform hover:scale-105 transition-all duration-200"
              style={{ background: '#61bf69' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#52a65a'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#61bf69'}
            >
              <Plus className="w-5 h-5" />
              إضافة نوع حيوان آخر
            </button>
          </div>

          <div className="bg-secondary-50/80 border-2 border-secondary-200 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-right text-secondary-800 flex items-center gap-3 mb-6">
              <span>الأطباء القائمين بالكشف و سحب العينات</span>
              <div className="w-3 h-3 bg-secondary-500 rounded-full"></div>
            </h3>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الأطباء <span className="text-red-500">*</span>
              </label>

              {selectedSamplingDoctors.length > 0 && (
                <div className="mb-2 p-2 bg-gradient-to-r from-secondary-50 to-secondary-100/50 rounded-lg border border-secondary-200">
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {selectedSamplingDoctors.map((doctor, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 bg-white border border-secondary-300 text-secondary-800 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => removeSamplingDoctor(doctor)}
                          className="text-secondary-400 hover:text-red-600 transition-colors"
                          title="إزالة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {doctor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSamplingDoctorToggle(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right appearance-none bg-white"
                  defaultValue=""
                >
                  <option value="">اختر طبيب...</option>
                  {samplingDoctorOptions.filter(d => d !== 'أخرى' && !selectedSamplingDoctors.includes(d)).map((doctor) => (
                    <option key={doctor} value={doctor}>
                      {doctor}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {!showCustomSamplingDoctor && (
                <button
                  type="button"
                  onClick={() => setShowCustomSamplingDoctor(true)}
                  className="mt-2 text-xs text-secondary-600 hover:text-secondary-800 hover:underline flex items-center gap-1 mr-auto"
                >
                  <Plus className="w-3 h-3" />
                  إضافة طبيب جديد
                </button>
              )}

              {showCustomSamplingDoctor && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const customName = (document.getElementById('edit_custom_sampling_doctor') as HTMLInputElement)?.value;
                      if (customName) {
                        addCustomSamplingDoctor(customName);
                      }
                    }}
                    className="bg-secondary-600 text-white px-4 py-2 rounded-lg hover:bg-secondary-700 transition-colors text-sm"
                  >
                    إضافة
                  </button>
                  <input
                    id="edit_custom_sampling_doctor"
                    {...register('custom_sampling_doctor')}
                    className="flex-1 px-3 h-[40px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right text-sm"
                    placeholder="اسم الطبيب..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomSamplingDoctor(false);
                      setValue('custom_sampling_doctor', '');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {errors.sampling_doctors && (
                <p className="text-red-500 text-xs mt-1">{errors.sampling_doctors.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-12 py-4 rounded-2xl flex items-center gap-3 shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="text-white px-12 py-4 rounded-2xl flex items-center gap-3 shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-bold"
              style={{ background: '#61bf69' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#52a65a'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#61bf69'}
            >
              <Save className="w-6 h-6" />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditSampleGroupComponent({
  groupIndex,
  isGroupExpanded,
  group,
  toggleSampleGroup,
  register,
  control,
  setValue,
  errors,
  removeGroup,
  groupFieldsLength,
  toggleIndividualSample,
  expandedIndividualSamples,
  requiredTestOptions,
}: any) {
  const { fields: sampleFields, append: appendSample, remove: removeSample } = useFieldArray({
    control,
    name: `sample_groups.${groupIndex}.samples`,
  });

  const watchedAnimalType = group?.animal_type;
  const watchedAnimalGender = group?.animal_gender;
  const watchedSamples = group?.samples || [];

  // التحقق من صحة المجموعة
  const isValid = !!(
    group?.animal_type &&
    group.animal_type.trim() &&
    group?.animal_gender &&
    group.animal_gender.trim() &&
    group?.sample_count !== undefined &&
    group.sample_count !== '' &&
    group?.samples &&
    group.samples.length > 0 &&
    group.samples.every((sample: any) =>
      sample.required_test &&
      sample.required_test.trim() &&
      sample.sample_type &&
      sample.sample_type.trim()
    )
  );

  return (
    <div className={`bg-white/80 backdrop-blur-sm border-2 rounded-xl shadow-md overflow-hidden transition-all ${
      !isValid ? 'border-red-400 shadow-red-200' : ''
    }`} style={isValid ? { borderColor: 'rgba(97, 191, 105, 0.2)' } : {}}>
      <div
        onClick={() => toggleSampleGroup(groupIndex)}
        className={`px-4 h-[50px] flex items-center justify-between cursor-pointer hover:bg-opacity-90 transition-all duration-200 ${
          !isValid ? 'bg-red-50' : ''
        }`}
        style={isValid ? { background: 'rgba(97, 191, 105, 0.15)' } : {}}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: !isValid ? '#dc2626' : '#61bf69' }}>
            {isGroupExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
          <span className="font-bold text-lg" style={{ color: !isValid ? '#dc2626' : '#61bf69' }}>
            {group?.animal_type && group.animal_type !== 'أخرى'
              ? group.animal_type
              : group?.custom_animal_type
                ? group.custom_animal_type
                : `نوع الحيوان ${groupIndex + 1}`}
          </span>
          {!isValid && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" />
              حقول إلزامية مفقودة
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {groupFieldsLength > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeGroup(groupIndex);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              حذف الحيوان
            </button>
          )}
        </div>
      </div>

      {isGroupExpanded && (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b-2 border-gray-200">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الحيوان <span className="text-red-500">*</span>
              </label>
              {watchedAnimalType === 'أخرى' ? (
                <div className="relative">
                  <input
                    {...register(`sample_groups.${groupIndex}.custom_animal_type`)}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                    style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                    placeholder="اكتب نوع الحيوان..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`sample_groups.${groupIndex}.animal_type`, '');
                      setValue(`sample_groups.${groupIndex}.custom_animal_type`, '');
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  {...register(`sample_groups.${groupIndex}.animal_type`)}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
                >
                  <option value="">اختر نوع الحيوان</option>
                  <option value="ماعز">ماعز</option>
                  <option value="أبقار">أبقار</option>
                  <option value="ابل">ابل</option>
                  <option value="خيل">خيل</option>
                  <option value="دواجن">دواجن</option>
                  <option value="أغنام">أغنام</option>
                  <option value="بيض">بيض</option>
                  <option value="أخرى">أخرى</option>
                </select>
              )}
              {errors.sample_groups?.[groupIndex]?.animal_type && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.animal_type?.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                جنس الحيوان <span className="text-red-500">*</span>
              </label>
              {watchedAnimalGender === 'أخرى' ? (
                <div className="relative">
                  <input
                    {...register(`sample_groups.${groupIndex}.custom_animal_gender`)}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                    style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                    placeholder="اكتب جنس الحيوان..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`sample_groups.${groupIndex}.animal_gender`, '');
                      setValue(`sample_groups.${groupIndex}.custom_animal_gender`, '');
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  {...register(`sample_groups.${groupIndex}.animal_gender`)}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
                >
                  <option value="">اختر جنس الحيوان</option>
                  <option value="ذكور">ذكور</option>
                  <option value="إناث">إناث</option>
                  <option value="أخرى">أخرى</option>
                </select>
              )}
              {errors.sample_groups?.[groupIndex]?.animal_gender && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.animal_gender?.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد العينات <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                {...register(`sample_groups.${groupIndex}.sample_count`, { valueAsNumber: true })}
                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
              />
              {errors.sample_groups?.[groupIndex]?.sample_count && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.sample_count?.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {sampleFields.map((sampleField, sampleIndex) => {
              const key = `${groupIndex}-${sampleIndex}`;
              const isSampleExpanded = expandedIndividualSamples[key];
              const sample = watchedSamples[sampleIndex];

              return (
                <div key={sampleField.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div
                    onClick={() => toggleIndividualSample(groupIndex, sampleIndex)}
                    className="px-4 h-[50px] flex items-center justify-between cursor-pointer bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600">
                        {isSampleExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-semibold text-sm text-gray-700">
                        الفحص {sampleIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sampleFields.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSample(sampleIndex);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          appendSample({ sample_number: (sampleFields.length + 1).toString() });
                        }}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-all duration-200"
                        style={{ background: '#61bf69' }}
                      >
                        <Plus className="w-3 h-3" />
                        إضافة فحص آخر
                      </button>
                    </div>
                  </div>

                  {isSampleExpanded && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            رقم العينة
                          </label>
                          <input
                            {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_number`)}
                            placeholder={(sampleIndex + 1).toString()}
                            className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                          />
                        </div>

                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الفحص المطلوب <span className="text-red-500">*</span>
                          </label>
                          {sample?.required_test === 'أخرى' ? (
                            <div className="relative">
                              <input
                                {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_test`)}
                                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-10"
                                style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                                placeholder="اكتب الفحص المطلوب..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.required_test`, '');
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_test`, '');
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <select
                              {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.required_test`)}
                              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white"
                            >
                              <option value="">اختر الفحص المطلوب</option>
                              {requiredTestOptions.map((test: string) => (
                                <option key={test} value={test}>
                                  {test}
                                </option>
                              ))}
                            </select>
                          )}
                          {errors.sample_groups?.[groupIndex]?.samples?.[sampleIndex]?.required_test && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.sample_groups[groupIndex]?.samples[sampleIndex]?.required_test?.message}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            نوع العينة <span className="text-red-500">*</span>
                          </label>
                          {sample?.sample_type === 'أخرى' ? (
                            <div className="relative">
                              <input
                                {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_sample_type`)}
                                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-10"
                                style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                                placeholder="اكتب نوع العينة..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_type`, '');
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_sample_type`, '');
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <select
                              {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_type`)}
                              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white"
                            >
                              <option value="">اختر نوع العينة</option>
                              <option value="مصل">مصل</option>
                              <option value="دم كامل">دم كامل</option>
                              <option value="أحشاء">أحشاء</option>
                              <option value="مسحات">مسحات</option>
                              <option value="كحتات">كحتات</option>
                              <option value="صيصان">صيصان</option>
                              <option value="بيض">بيض</option>
                              <option value="روث">روث</option>
                              <option value="حليب">حليب</option>
                              <option value="أعضاء">أعضاء</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          )}
                          {errors.sample_groups?.[groupIndex]?.samples?.[sampleIndex]?.sample_type && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.sample_groups[groupIndex]?.samples[sampleIndex]?.sample_type?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
