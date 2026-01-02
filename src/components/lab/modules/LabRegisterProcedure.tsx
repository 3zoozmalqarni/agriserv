import { useState, useEffect, useRef } from 'react';
import { Search, Eye, CreditCard as Edit, Trash2, Filter, X, CheckCircle, Clock, AlertCircle, ClipboardList, Printer, TestTube2, Copy } from 'lucide-react';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useAuth } from '../../../hooks/useAuth.tsx';
import LabEditProcedure from './LabEditProcedure';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';
import PageHeader from '../../shared/PageHeader';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';

const sections = [
  { value: 'bacteriology', label: 'البكتيريا' },
  { value: 'Virology', label: 'الفيروسات' },
  { value: 'parasitology', label: 'الطفيليات' },
  { value: 'poultry', label: 'الدواجن' },
  { value: 'Molecular biology', label: 'الأحياء الجزيئية' },
  { value: 'other', label: 'أخرى' },
];

const getSectionLabel = (value: string) => {
  const section = sections.find(s => s.value === value);
  return section ? section.label : value;
};

// دالة لحساب مدة الفحص
const calculateTestDuration = (procedure: any, results: any[]): string => {
  if (!procedure.samples || procedure.samples.length === 0) {
    return '-';
  }

  const sampleIds = procedure.samples.map((sample: any) => sample.id);
  const procedureResults = results.filter((result: any) =>
    sampleIds.includes(result.sample_id) && result.approval_status === 'approved'
  );

  // إذا لم يتم اعتماد أي نتيجة بعد، لا توجد مدة
  if (procedureResults.length === 0) {
    return '-';
  }

  // إذا كان الإجراء غير مكتمل، لا نعرض مدة
  if (procedureResults.length < procedure.samples.length) {
    return '-';
  }

  // حساب الوقت من وقت تسجيل الإجراء إلى آخر نتيجة معتمدة
  const procedureStartDate = new Date(procedure.created_at);

  // البحث عن آخر تاريخ نتيجة معتمدة
  let lastApprovedDate = procedureStartDate;
  procedureResults.forEach(result => {
    const resultDate = new Date(result.created_at);
    if (resultDate > lastApprovedDate) {
      lastApprovedDate = resultDate;
    }
  });

  // حساب الفرق بالميلي ثانية
  const durationMs = lastApprovedDate.getTime() - procedureStartDate.getTime();

  // إذا كانت المدة سالبة أو صفر، نعرض أقل من دقيقة
  if (durationMs <= 0) {
    return 'أقل من دقيقة';
  }

  // تحويل إلى أيام وساعات ودقائق
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // تنسيق النص
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'يوم' : 'أيام'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`);

  return parts.join(' و ');
};

interface ProcedureRecordsProps {
  searchData?: any;
}

export default function ProcedureRecords({ searchData }: ProcedureRecordsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<string | null>(null);
  const searchProcessedRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures, loading, deleteProcedure } = useProcedures();
  const { results } = useTestResults();
  const auth = useAuth();
  const { hasPermission } = auth || {};

  // عند وجود بيانات من البحث
  useEffect(() => {
    if (searchData?.type === 'procedure' && searchData.data && !searchProcessedRef.current) {
      searchProcessedRef.current = true;
      const procedure = procedures.find(p => p.id === searchData.data.id) || searchData.data;
      setSelectedProcedure(procedure);
      setShowViewModal(true);
    }
  }, [searchData, procedures]);

  const getProcedureStatus = (procedure: any) => {
    if (!procedure.samples || procedure.samples.length === 0) {
      return { status: 'not_tested', label: 'لم تفحص بعد', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }

    const sampleIds = procedure.samples.map((sample: any) => sample.id);
    const approvedResults = results.filter((result: any) =>
      sampleIds.includes(result.sample_id) && result.approval_status === 'approved'
    );

    if (approvedResults.length === 0) {
      return { status: 'not_tested', label: 'لم تفحص بعد', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }

    if (approvedResults.length === procedure.samples.length) {
      return { status: 'completed', label: 'مكتمل', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }

    return { status: 'partial', label: 'مكتمل جزئياً', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
  };

  const filteredRecords = procedures.filter(record => {
    const matchesSearch =
      record.internal_procedure_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.country_port || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.external_procedure_number || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;

    if (statusFilter !== 'all') {
      const status = getProcedureStatus(record);
      matchesStatus = status.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // حساب الصفحات
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // إعادة تعيين الصفحة إلى 1 عند تغيير البحث أو الفلتر
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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

  const getSectionLabel = (value: string) => {
    const section = sections.find(s => s.value === value);
    return section ? section.label : value;
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
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">قسم المختبر بمحجر ميناء جدة الإسلامي</h1>
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">إجراء مخبري</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 0; margin-top: 4px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.internal_procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">العميل:</span> <span style="font-weight: 600; color: #111827;">${selectedProcedure.client_name}</span></div>
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
    printContainer.id = 'temp-print-container-procedure';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-procedure';
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

        .sample-card {
          page-break-inside: auto !important;
        }

        body::after {
          content: "هذا الإجراء تم إنشاءه لاستخدامات قسم المختبر بمحجر ميناء جدة الإسلامي • تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية • للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي" !important;
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

        body > *:not(#temp-print-container-procedure) {
          display: none !important;
        }

        #temp-print-container-procedure {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-procedure > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-procedure * {
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

        .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 1rem !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-procedure');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    // Print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-procedure');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-procedure');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const ViewModal = () => {
    if (!showViewModal || !selectedProcedure) return null;

    const totalSamples = selectedProcedure.samples?.reduce((sum: number, sample: any) => sum + (sample.sample_count || 0), 0) || 0;
    const allTests = [...new Set(selectedProcedure.samples?.map((s: any) => s.requested_test) || [])];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 print-modal-content">
            <div className="flex items-center justify-between mb-3 pb-3 no-print">
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-1" style={{ color: '#003361' }}>قسم المختبر بمحجر ميناء جدة الإسلامي</h1>
                <h2 className="text-xl font-semibold" style={{ color: '#00a651' }}>إجراء مخبري</h2>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#003361]/5 p-4 rounded-lg no-break">
                <h3 className="font-bold text-[#003361] mb-3 text-right">معلومات أساسية</h3>
                <div className="space-y-2 text-right">
                  <div><span className="font-semibold">رقم الإجراء المخبري:</span> {selectedProcedure.internal_procedure_number || 'غير محدد'}</div>
                  <div><span className="font-semibold">رقم الإجراء الخارجي:</span> {selectedProcedure.external_procedure_number || 'غير محدد'}</div>
                  <div><span className="font-semibold">اسم العميل:</span> {selectedProcedure.client_name}</div>
                  <div><span className="font-semibold">تاريخ الإجراء المخبري:</span> {selectedProcedure.reception_date}</div>
                  <div><span className="font-semibold">بلد المنشأ:</span> {selectedProcedure.country_port || 'غير محدد'}</div>
                </div>
              </div>

              <div className="bg-[#00a651]/5 p-4 rounded-lg no-break">
                <h3 className="font-bold text-[#00a651] mb-3 text-right">إحصائيات</h3>
                <div className="space-y-2 text-right">
                  <div><span className="font-semibold">إجمالي عدد العينات:</span> <span className="text-[#00a651] font-bold">{totalSamples}</span></div>
                  <div><span className="font-semibold">عدد الفحوصات:</span> <span className="text-[#003361] font-bold">{allTests.length}</span></div>
                  <div><span className="font-semibold">مستلم العينة:</span> {selectedProcedure.receiver_name}</div>
                  <div><span className="font-semibold">مكان ورود العينة:</span> {selectedProcedure.sample_origin || 'غير محدد'}</div>
                </div>
              </div>
            </div>

            {selectedProcedure.quality_check && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-4 text-right">فحص جودة العينات</h3>
                <div className="bg-gray-50 rounded-lg p-4 no-break">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                    <div dir="rtl">
                      <span className="font-semibold">درجة الحرارة: </span>
                      <span className={selectedProcedure.quality_check.temperature === 'appropriate' ? 'text-green-600' : 'text-red-600'}>
                        {selectedProcedure.quality_check.temperature === 'appropriate' ? 'مناسب' : 'غير مناسب'}
                      </span>
                    </div>
                    <div dir="rtl">
                      <span className="font-semibold">طريقة الحفظ: </span>
                      <span className={selectedProcedure.quality_check.preservation_method === 'appropriate' ? 'text-green-600' : 'text-red-600'}>
                        {selectedProcedure.quality_check.preservation_method === 'appropriate' ? 'مناسب' : 'غير مناسب'}
                      </span>
                    </div>
                    <div dir="rtl">
                      <span className="font-semibold">البيانات: </span>
                      <span className={selectedProcedure.quality_check.sample_data === 'correct' ? 'text-green-600' : 'text-red-600'}>
                        {selectedProcedure.quality_check.sample_data === 'correct' ? 'صحيحة' : 'غير صحيحة'}
                      </span>
                    </div>
                    <div dir="rtl">
                      <span className="font-semibold">عدد العينات: </span>
                      <span className={selectedProcedure.quality_check.sample_count_accuracy === 'correct' ? 'text-green-600' : 'text-red-600'}>
                        {selectedProcedure.quality_check.sample_count_accuracy === 'correct' ? 'صحيح' : 'غير صحيح'}
                      </span>
                    </div>
                  </div>
                  {selectedProcedure.quality_check.notes && (
                    <div className="mt-4 text-right" dir="rtl">
                      <span className="font-semibold">ملاحظات الجودة: </span>
                      <p className="text-gray-700 mt-1">{selectedProcedure.quality_check.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-sm">العينات</h3>
              <div className="space-y-2">
                {selectedProcedure.samples?.map((sample: any, index: number) => (
                  <div key={sample.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200 no-break">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] text-gray-500">
                        {sample.sample_number && (
                          <span className="font-semibold text-gray-900">رقم العينة: {sample.sample_number}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#003361]">عينة #{index + 1}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-right text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-medium">القسم:</span>
                        <span className="text-gray-900">{getSectionLabel(sample.department)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-medium">الفحص:</span>
                        <span className="text-gray-900">{sample.requested_test}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-medium">نوع العينة:</span>
                        <span className="text-gray-900">{sample.sample_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-medium">نوع الحيوان:</span>
                        <span className="text-gray-900">{sample.animal_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-medium">العدد:</span>
                        <span className="text-gray-900 font-semibold">{sample.sample_count}</span>
                      </div>
                      {sample.notes && (
                        <div className="col-span-3 flex items-start gap-1">
                          <span className="text-gray-500 font-medium">ملاحظات:</span>
                          <span className="text-gray-900">{sample.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-200 print-footer no-print">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-900 font-semibold mb-2 text-sm">
                  هذا الإجراء تم إنشاءه لاستخدامات قسم المختبر بمحجر ميناء جدة الإسلامي
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
    );
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
            title="سجل الإجراءات"
            subtitle="إدارة ومتابعة الإجراءات المخبرية"
          />

          <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <SearchInputWithPaste
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="البحث برقم الإجراء، رقم الإجراء الخارجي، اسم العميل، أو البلد..."
                />
              </div>

              <div className="relative">
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-64 pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00a651] focus:border-[#00a651] text-right transition-all appearance-none bg-white"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="not_tested">لم تفحص بعد</option>
                  <option value="partial">مكتمل جزئياً</option>
                  <option value="completed">مكتمل</option>
                </select>
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
              <div className="rounded-xl border-2 border-gray-200 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الحالة</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">عدد العينات</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">مدة الفحص</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">تاريخ الإجراء المخبري</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">اسم العميل/الباخرة</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">رقم الإجراء المخبري</th>
                      <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record, index) => {
                      const status = getProcedureStatus(record);
                      const StatusIcon = status.icon;
                      const totalSamples = record.samples?.reduce((sum: number, s: any) => sum + s.sample_count, 0) || 0;
                      const actualIndex = startIndex + index;

                      return (
                        <tr
                          key={record.id}
                          className={`
                            transition-all duration-150
                            ${actualIndex % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}
                            hover:bg-teal-50/30 border-b border-gray-100
                          `}
                        >
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="text-[#003361] text-sm">{totalSamples}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-700 text-sm whitespace-nowrap">{calculateTestDuration(record, results)}</td>
                          <td className="px-3 py-3 text-center text-gray-700 text-sm whitespace-nowrap">{record.reception_date}</td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="text-gray-900 text-sm">{record.client_name}</span>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(record.internal_procedure_number);
                                  showToast.primary('تم نسخ رقم الإجراء');
                                }}
                                className="p-1.5 text-[#003361] hover:text-white hover:bg-[#003361] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                title="نسخ رقم الإجراء"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-[#003361] text-sm">{record.internal_procedure_number}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleView(record.id)}
                                className="p-2 rounded-lg hover:bg-teal-100 text-teal-600 transition-colors"
                                title="معاينة"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(record.id)}
                                className="p-2 rounded-lg hover:bg-orange-600 hover:text-white text-orange-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {hasPermission('delete_lab_procedure') && (
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-600"
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
                      // عرض أول صفحتين، آخر صفحتين، والصفحات المحيطة بالصفحة الحالية
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

      <ViewModal />
      {showEditModal && selectedProcedure && (
        <LabEditProcedure
          procedure={selectedProcedure}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProcedure(null);
          }}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
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
                  <li>جميع النتائج المرتبطة</li>
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
    </div>
  );
}
