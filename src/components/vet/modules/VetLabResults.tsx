import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, TestTube2, FileText, Search, Printer, X } from 'lucide-react';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import Pagination from '../../shared/Pagination';

export default function VetLabResults() {
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printContent, setPrintContent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures, loading: proceduresLoading } = useProcedures();
  const { results } = useTestResults();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleProcedure = (procedureId: string) => {
    const newExpanded = new Set(expandedProcedures);
    if (newExpanded.has(procedureId)) {
      newExpanded.delete(procedureId);
    } else {
      newExpanded.add(procedureId);
    }
    setExpandedProcedures(newExpanded);
  };

  const getResultLabel = (testResult: string) => {
    switch (testResult) {
      case 'positive':
        return 'إيجابي';
      case 'negative':
        return 'سلبي';
      case 'إيجابي بعد التأكيد':
        return 'إيجابي بعد التأكيد';
      case 'سلبي بعد التأكيد':
        return 'سلبي بعد التأكيد';
      case 'vaccination_efficacy':
        return 'كفاءة تحصين';
      case 'اختبار كفاءة تحصين':
        return 'اختبار كفاءة تحصين';
      case 'كفاءة تحصين':
        return 'كفاءة تحصين';
      default:
        return testResult;
    }
  };

  const handlePrintProcedure = (procedure: any) => {
    const procedureSamples = procedure.samples || [];
    const samplesWithResults = procedureSamples
      .map((sample: any) => {
        const result = results.find(r => r.sample_id === sample.id && r.approval_status === 'approved');
        return { sample, result };
      })
      .filter((item: any) => item.result);

    setPrintContent({
      type: 'procedure',
      procedure,
      samples: samplesWithResults
    });
    setShowPrintModal(true);
  };

  const handlePrintSample = (procedure: any, sample: any) => {
    const result = results.find(r => r.sample_id === sample.id && r.approval_status === 'approved');

    if (!result) {
      toast.error('لا توجد نتيجة لهذه العينة');
      return;
    }

    setPrintContent({
      type: 'sample',
      procedure,
      sample,
      result
    });
    setShowPrintModal(true);
  };

      const handlePrint = () => {
    if (!printContent) return;

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
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">قسم المختبر بمحجر ميناء جدة الإسلامي - القسم البيطري</h1>
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">نتيجة فحص مخبري</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 0; margin-top: 4px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء البيطري:</span> <span style="font-weight: 600; color: #111827;">${printContent.procedure.external_procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">العميل:</span> <span style="font-weight: 600; color: #111827;">${printContent.procedure.client_name}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">تاريخ الإجراء البيطري:</span> <span style="font-weight: 600; color: #111827;">${printContent.procedure.reception_date}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">بلد المنشأ:</span> <span style="font-weight: 600; color: #111827;">${printContent.procedure.country_port || 'غير محدد'}</span></div>
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
    printContainer.id = 'temp-print-container-qlab';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-qlab';
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

        body > *:not(#temp-print-container-qlab) {
          display: none !important;
        }

        #temp-print-container-qlab {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-qlab > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-qlab * {
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

        .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 1rem !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-qlab');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    // Print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-qlab');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-qlab');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const generateProcedureHTML = () => {
    if (!printContent || printContent.type !== 'procedure') return '';
    const proc = printContent.procedure;
    const samplesData = printContent.samples || [];

    const SAMPLES_PER_PAGE = 2;
    const totalPages = Math.ceil(samplesData.length / SAMPLES_PER_PAGE);

    const procedureInfoHTML = `
        <div class="section" style="margin-bottom: 6px; padding: 0; border: none; box-shadow: none;">
          <div class="section-title" style="margin-bottom: 4px; padding-bottom: 2px; font-size: 10pt;">المعلومات الأساسية</div>
          <div class="info-grid" style="grid-template-columns: repeat(3, 1fr); gap: 2px; row-gap: 1px;">
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">رقم إجراء قسم المختبر:</span>
              <span class="info-value" style="font-size: 7.5pt; font-weight: 600;">${proc.internal_procedure_number || '-'}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">رقم الإجراء البيطري:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.external_procedure_number || '-'}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">اسم العميل:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.client_name}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">تاريخ الاستلام:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.reception_date}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">بلد المنشأ:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.country_port || '-'}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">مصدر العينة:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.sample_origin || '-'}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">مستلم العينات في المختبر:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.receiver_name}</span>
            </div>
            <div class="info-item" style="padding: 0; border: none; background: transparent;">
              <span class="info-label" style="font-size: 7pt;">تاريخ الإجراء البيطري:</span>
              <span class="info-value" style="font-size: 7.5pt;">${proc.external_procedure_date || '-'}</span>
            </div>
          </div>
        </div>
    `;

    return `
      <div class="page">
        ${procedureInfoHTML}

        <div class="section">
          <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>نتائج العينات (${samplesData.length})</span>
            <span style="font-size: 9pt; color: #6b7280;">الصفحة 1 من ${totalPages}</span>
          </div>
          ${samplesData.slice(0, SAMPLES_PER_PAGE).map((item: any, index: number) => {
          const sample = item.sample;
          const result = item.result;
          return `
            <div class="sample-card" style="padding: 0; margin-bottom: 4px; background: transparent; border: none; border-radius: 0; box-shadow: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #e5e7eb;">
                <span class="badge ${
                  (result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد') ? 'badge-positive' :
                  (result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد') ? 'badge-negative' :
                  'badge-vaccination'
                }" style="font-size: 6.5pt; padding: 1px 5px;">
                  ${getResultLabel(result.test_result)}
                </span>
                <strong style="font-size: 8pt;">رقم العينة: ${sample.sample_number || '-'}</strong>
              </div>
              <div class="info-grid" style="grid-template-columns: repeat(3, 1fr); gap: 2px; row-gap: 0.5px;">
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">القسم:</span>
                  <span class="info-value" style="font-size: 7pt;">${sample.department}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">الفحص المطلوب:</span>
                  <span class="info-value" style="font-size: 7pt;">${sample.requested_test}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">نوع العينة:</span>
                  <span class="info-value" style="font-size: 7pt;">${sample.sample_type}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">نوع الحيوان:</span>
                  <span class="info-value" style="font-size: 7pt;">${sample.animal_type}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">عدد العينات:</span>
                  <span class="info-value" style="font-size: 7pt; font-weight: 600;">${sample.sample_count}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">طريقة الاختبار:</span>
                  <span class="info-value" style="font-size: 7pt;">${result.test_method}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">تاريخ الفحص:</span>
                  <span class="info-value" style="font-size: 7pt;">${result.test_date || '-'}</span>
                </div>
                <div class="info-item" style="padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">العينات الإيجابية:</span>
                  <span class="info-value" style="font-size: 7pt; font-weight: 600; color: #dc2626;">${result.positive_samples}</span>
                </div>
                ${result.is_vaccination_efficiency_test && result.vaccination_efficiency_percentage ? `
                <div class="info-item" style="background: #eff6ff; border: 1px solid #93c5fd; padding: 3px; border-radius: 2px;">
                  <span class="info-label" style="color: #1e40af; font-weight: bold; font-size: 6pt;">نسبة كفاءة التحصين:</span>
                  <span class="info-value" style="color: #1e3a8a; font-weight: bold; font-size: 7.5pt;">${result.vaccination_efficiency_percentage}%</span>
                </div>
                ` : ''}
                <div class="info-item" style="grid-column: 1 / -1; padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">الأخصائيين:</span>
                  <span class="info-value" style="font-size: 7pt;">${result.specialists?.join('، ') || '-'}</span>
                </div>
                ${result.approved_by ? `
                <div class="info-item" style="grid-column: 1 / -1; padding: 0; border: none; background: transparent;">
                  <span class="info-label" style="font-size: 6pt;">معتمد النتائج:</span>
                  <span class="info-value" style="font-size: 7pt; font-weight: bold; color: #0369a1;">${result.approved_by}</span>
                </div>
                ` : ''}
              </div>
              ${result.confirmatory_test?.test_type ? `
                <div class="confirmatory-section" style="margin-top: 3px; padding: 3px; background: #f0f9ff; border-radius: 2px; border-right: 2px solid #0284c7;">
                  <div class="confirmatory-title" style="font-size: 6.5pt; font-weight: bold; margin-bottom: 1px; color: #0369a1;">الفحص التأكيدي</div>
                  <div class="info-grid" style="grid-template-columns: repeat(2, 1fr); gap: 1px;">
                    <div class="info-item" style="padding: 0; border: none; background: transparent;">
                      <span class="info-label" style="font-size: 6pt;">النوع:</span>
                      <span class="info-value" style="font-size: 7pt;">${result.confirmatory_test.test_type}</span>
                    </div>
                    <div class="info-item" style="padding: 0; border: none; background: transparent;">
                      <span class="info-label" style="font-size: 6pt;">العينات الإيجابية:</span>
                      <span class="info-value" style="font-size: 7pt; font-weight: 600;">${result.confirmatory_test.positive_samples || 0}</span>
                    </div>
                  </div>
                </div>
              ` : ''}
              ${result.notes ? `<div style="margin-top: 3px; padding: 3px; background: #fef3c7; border-radius: 2px; font-size: 6.5pt; border-right: 2px solid #f59e0b;"><strong>ملاحظات:</strong> ${result.notes}</div>` : ''}
            </div>
          `;
        }).join('')}
        </div>
      </div>

      ${totalPages > 1 ? Array.from({ length: totalPages - 1 }, (_, pageIndex) => {
        const startIdx = (pageIndex + 1) * SAMPLES_PER_PAGE;
        const endIdx = startIdx + SAMPLES_PER_PAGE;
        const pageSamples = samplesData.slice(startIdx, endIdx);

        return `
          <div class="page-break"></div>
          <div class="page">
            ${generatePrintHeader('تقرير نتائج الفحوصات المخبرية - المحجر', true)}

            ${procedureInfoHTML}

            <div class="section">
              <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
                <span>نتائج العينات (تابع)</span>
                <span style="font-size: 9pt; color: #6b7280;">الصفحة ${pageIndex + 2} من ${totalPages}</span>
              </div>
              ${pageSamples.map((item: any, idx: number) => {
                const sample = item.sample;
                const result = item.result;
                const globalIndex = startIdx + idx;

                return `
                  <div class="sample-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                      <span class="badge ${
                        (result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد') ? 'badge-positive' :
                        (result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد') ? 'badge-negative' :
                        'badge-vaccination'
                      }">
                        ${getResultLabel(result.test_result)}
                      </span>
                      <strong style="font-size: 14px;">رقم العينة: ${sample.sample_number || '-'}</strong>
                    </div>
                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">القسم:</span>
                        <span class="info-value">${sample.department}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">الفحص المطلوب:</span>
                        <span class="info-value">${sample.requested_test}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">نوع العينة:</span>
                        <span class="info-value">${sample.sample_type}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">نوع الحيوان:</span>
                        <span class="info-value">${sample.animal_type}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">عدد العينات:</span>
                        <span class="info-value">${sample.sample_count}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">طريقة الاختبار:</span>
                        <span class="info-value">${result.test_method}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">تاريخ الفحص:</span>
                        <span class="info-value">${result.test_date || '-'}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">العينات الإيجابية:</span>
                        <span class="info-value">${result.positive_samples}</span>
                      </div>
                      ${result.is_vaccination_efficiency_test && result.vaccination_efficiency_percentage ? `
                      <div class="info-item">
                        <span class="info-label">نسبة كفاءة التحصين:</span>
                        <span class="info-value" style="color: #1e40af; font-weight: bold;">${result.vaccination_efficiency_percentage}%</span>
                      </div>
                      ` : ''}
                      <div class="info-item" style="grid-column: 1 / -1;">
                        <span class="info-label">الأخصائيين:</span>
                        <span class="info-value">${result.specialists?.join('، ') || '-'}</span>
                      </div>
                      ${result.approved_by ? `
                      <div class="info-item" style="grid-column: 1 / -1;">
                        <span class="info-label">معتمد النتائج:</span>
                        <span class="info-value" style="font-weight: bold; color: #0369a1;">${result.approved_by}</span>
                      </div>
                      ` : ''}
                    </div>
                    ${result.confirmatory_test?.test_type ? `
                      <div class="confirmatory-section">
                        <div class="confirmatory-title">الفحص التأكيدي</div>
                        <div class="info-grid">
                          <div class="info-item">
                            <span class="info-label">النوع:</span>
                            <span class="info-value">${result.confirmatory_test.test_type}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">العينات الإيجابية:</span>
                            <span class="info-value">${result.confirmatory_test.positive_samples || 0}</span>
                          </div>
                        </div>
                      </div>
                    ` : ''}
                    ${result.notes ? `<div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 4px; font-size: 10pt;"><strong>ملاحظات:</strong> ${result.notes}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('') : ''}
    `;
  };

  const generateSampleHTML = () => {
    if (!printContent || printContent.type !== 'sample') return '';
    const sample = printContent.sample;
    const result = printContent.result;
    const procedure = printContent.procedure;

    return `
      <div class="section">
        <div class="section-title">معلومات الإجراء</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">رقم إجراء قسم المختبر:</span>
            <span class="info-value">${procedure.internal_procedure_number}</span>
          </div>
          <div class="info-item">
            <span class="info-label">رقم الإجراء الخارجي:</span>
            <span class="info-value">${procedure.external_procedure_number || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${procedure.client_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">تاريخ الاستلام:</span>
            <span class="info-value">${procedure.reception_date}</span>
          </div>
          <div class="info-item">
            <span class="info-label">البلد/الميناء:</span>
            <span class="info-value">${procedure.country_port || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">مصدر العينة:</span>
            <span class="info-value">${procedure.sample_origin || '-'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">معلومات العينة</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">رقم العينة:</span>
            <span class="info-value">${sample.sample_number || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">القسم:</span>
            <span class="info-value">${sample.department}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الفحص المطلوب:</span>
            <span class="info-value">${sample.requested_test}</span>
          </div>
          <div class="info-item">
            <span class="info-label">نوع العينة:</span>
            <span class="info-value">${sample.sample_type}</span>
          </div>
          <div class="info-item">
            <span class="info-label">نوع الحيوان:</span>
            <span class="info-value">${sample.animal_type}</span>
          </div>
          <div class="info-item">
            <span class="info-label">عدد العينات:</span>
            <span class="info-value">${sample.sample_count}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">نتيجة الفحص</div>
        <div style="margin-bottom: 12px;">
          <span class="badge ${
            (result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد') ? 'badge-positive' :
            (result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد') ? 'badge-negative' :
            'badge-vaccination'
          }">
            ${getResultLabel(result.test_result)}
          </span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">طريقة الاختبار:</span>
            <span class="info-value">${result.test_method}</span>
          </div>
          <div class="info-item">
            <span class="info-label">تاريخ الفحص:</span>
            <span class="info-value">${result.test_date || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">العينات الإيجابية:</span>
            <span class="info-value">${result.positive_samples}</span>
          </div>
          ${result.is_vaccination_efficiency_test && result.vaccination_efficiency_percentage ? `
          <div class="info-item">
            <span class="info-label">نسبة كفاءة التحصين:</span>
            <span class="info-value" style="color: #1e40af; font-weight: bold;">${result.vaccination_efficiency_percentage}%</span>
          </div>
          ` : ''}
          <div class="info-item" style="grid-column: 1 / -1;">
            <span class="info-label">الأخصائيين:</span>
            <span class="info-value">${result.specialists?.join('، ') || '-'}</span>
          </div>
        </div>
        ${result.approved_by ? `
        <div class="info-grid" style="margin-top: 8px;">
          <div class="info-item" style="grid-column: 1 / -1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px; border-radius: 4px;">
            <span class="info-label" style="color: #1e40af; font-weight: bold;">معتمد النتائج:</span>
            <span class="info-value" style="font-weight: bold; color: #0369a1;">${result.approved_by}</span>
          </div>
        </div>
        ` : ''}
        ${result.confirmatory_test?.test_type ? `
          <div class="confirmatory-section">
            <div class="confirmatory-title">الفحص التأكيدي</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">النوع:</span>
                <span class="info-value">${result.confirmatory_test.test_type}</span>
              </div>
              <div class="info-item">
                <span class="info-label">العينات الإيجابية:</span>
                <span class="info-value">${result.confirmatory_test.positive_samples || 0}</span>
              </div>
            </div>
          </div>
        ` : ''}
        ${result.notes ? `<div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 4px;"><strong>ملاحظات:</strong><br>${result.notes}</div>` : ''}
      </div>
    `;
  };

  if (proceduresLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#61bf69] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const filteredProcedures = procedures.filter((procedure) => {
    const countryPort = procedure.country_port?.trim().toLowerCase();

    if (countryPort === 'المملكة العربية السعودية'.toLowerCase() ||
        countryPort === 'السعودية'.toLowerCase()) {
      return false;
    }

    const procedureSamples = procedure.samples || [];
    const hasResults = procedureSamples.some((sample: any) =>
      results.some(r => r.sample_id === sample.id && r.approval_status === 'approved')
    );

    if (!hasResults) {
      return false;
    }

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      procedure.internal_procedure_number?.toLowerCase().includes(query) ||
      procedure.external_procedure_number?.toLowerCase().includes(query) ||
      procedure.client_name?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredProcedures.length / itemsPerPage);
  const paginatedProcedures = filteredProcedures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={TestTube2}
            title="نتائج المختبر"
            subtitle="عرض وطباعة نتائج الفحوصات المخبرية"
          />

          <div className="mb-6">
            <SearchInputWithPaste
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="ابحث برقم الإجراء أو اسم العميل..."
            />
          </div>

          <div className="space-y-4">
            {paginatedProcedures.map((procedure) => {
              const isExpanded = expandedProcedures.has(procedure.id);
              const procedureSamples = procedure.samples || [];
              const samplesWithResults = procedureSamples.filter((sample: any) =>
                results.some(r => r.sample_id === sample.id && r.approval_status === 'approved')
              );
              const hasResults = samplesWithResults.length > 0;

              return (
                <div key={procedure.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleProcedure(procedure.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#61bf69]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#61bf69]" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          العينات: {procedureSamples.length}
                        </span>
                        <span className="text-xs text-[#61bf69] font-semibold">
                          تم فحص: {samplesWithResults.length}
                        </span>
                      </div>

                      <div className="text-center">
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          {procedure.external_procedure_number || '-'}
                        </h3>
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <span>{procedure.internal_procedure_number}</span>
                          <span>•</span>
                          <span>{procedure.reception_date}</span>
                          <span>•</span>
                          <span>{procedure.client_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasResults && (
                          <button
                            onClick={() => handlePrintProcedure(procedure)}
                            className="px-3 py-1.5 text-white rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-1.5 text-xs font-semibold"
                            style={{ backgroundColor: '#f18700' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
                            title="طباعة جميع نتائج الإجراء"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3 text-right">معلومات الإجراء</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-right">
                          <div>
                            <span className="font-semibold text-gray-700">رقم الإجراء البيطري: </span>
                            <span className="text-gray-900">{procedure.external_procedure_number || '-'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">تاريخ الإجراء البيطري: </span>
                            <span className="text-gray-900">{procedure.external_procedure_date || '-'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">بلد المنشأ: </span>
                            <span className="text-gray-900">{procedure.country_port || '-'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">مصدر العينة: </span>
                            <span className="text-gray-900">{procedure.sample_origin || '-'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">مستلم العينات في المختبر: </span>
                            <span className="text-gray-900">{procedure.receiver_name}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 text-right mb-4">العينات والنتائج</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {procedureSamples.map((sample: any) => {
                          const result = results.find(r => r.sample_id === sample.id && r.approval_status === 'approved');

                          if (!result) {
                            return null;
                          }

                          return (
                            <div key={sample.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow flex flex-col h-full" dir="ltr">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handlePrintSample(procedure, sample)}
                                    className="p-1.5 text-white rounded-lg transition-colors"
                                    style={{ backgroundColor: '#f18700' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
                                    title="طباعة نتيجة العينة"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </button>
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                    result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد' ? 'bg-red-100 text-red-800' :
                                    result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد' ? 'bg-green-100 text-green-800' :
                                    (result.test_result === 'اختبار كفاءة تحصين' || result.is_vaccination_efficiency_test || result.test_result === 'كفاءة تحصين') ? 'bg-blue-100 text-blue-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {getResultLabel(result.test_result)}
                                  </span>
                                </div>

                                <h3 className="font-bold text-gray-900 text-base">
                                  {sample.sample_number || '-'}
                                </h3>
                              </div>

                              <div className="space-y-2 text-xs flex-1 mt-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-900 font-medium">{sample.department}</span>
                                  <span className="text-gray-600">القسم</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-900 font-medium">{sample.requested_test}</span>
                                  <span className="text-gray-600">الفحص المطلوب</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-900 font-medium">{sample.sample_type}</span>
                                  <span className="text-gray-600">نوع العينة</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-900 font-medium">{sample.animal_type}</span>
                                  <span className="text-gray-600">نوع الحيوان</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#61bf69] font-bold text-sm">{sample.sample_count}</span>
                                  <span className="text-gray-600">عدد العينات</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t-2 border-emerald-100 bg-emerald-50/50 rounded-lg p-3 -mx-1">
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-900">{result.test_method}</span>
                                    <span className="text-gray-600">الطريقة</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-900">{result.test_date || '-'}</span>
                                    <span className="text-gray-600">التاريخ</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600 font-bold">{result.positive_samples}</span>
                                    <span className="text-gray-600">إيجابية</span>
                                  </div>
                                  {result.is_vaccination_efficiency_test && result.vaccination_efficiency_percentage && (
                                    <div className="flex justify-between bg-blue-50 p-1.5 rounded border border-blue-200">
                                      <span className="text-blue-800 font-bold">{result.vaccination_efficiency_percentage}%</span>
                                      <span className="text-blue-600 font-semibold">نسبة الكفاءة</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-900 text-[10px]">{result.specialists?.join('، ') || '-'}</span>
                                    <span className="text-gray-600">الأخصائيين</span>
                                  </div>
                                  {result.approved_by && (
                                    <div className="flex justify-between bg-blue-50 -mx-2 px-2 py-1 rounded">
                                      <span className="text-blue-700 font-bold text-[10px]">{result.approved_by}</span>
                                      <span className="text-blue-600 font-semibold">معتمد النتائج</span>
                                    </div>
                                  )}
                                  {result.notes && (
                                    <div className="pt-1 mt-1 border-t border-emerald-200">
                                      <span className="text-gray-700 text-[10px] italic">{result.notes}</span>
                                    </div>
                                  )}
                                </div>

                                {result.confirmatory_test?.test_type && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                    <div className="font-semibold text-blue-900 text-[10px] mb-1">تأكيدي</div>
                                    <div className="space-y-1 text-[10px]">
                                      <div className="flex justify-between">
                                        <span className="text-blue-900">{result.confirmatory_test.test_type}</span>
                                        <span className="text-blue-700">الطريقة</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-blue-900 font-bold">{result.confirmatory_test.positive_samples || 0}</span>
                                        <span className="text-blue-700">إيجابية</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProcedures.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProcedures.length}
            />
          )}

          {filteredProcedures.length === 0 && !proceduresLoading && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'لا توجد نتائج مطابقة لعملية البحث' : 'لا توجد نتائج من المختبر'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showPrintModal && printContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto print-modal-content">
                <div className="flex items-center justify-between mb-6 pb-4 print-header no-print">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 no-print"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <h1 className="text-3xl font-bold mb-1" style={{ color: '#003361' }}>قسم المختبر بمحجر ميناء جدة الإسلامي - القسم البيطري</h1>
                    <h2 className="text-xl font-semibold" style={{ color: '#00a651' }}>نتيجة فحص مخبري</h2>
                  </div>
                  <button
                    onClick={handlePrint}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#003361]/5 p-4 rounded-lg no-break">
                    <h3 className="font-bold text-[#003361] mb-3 text-right">معلومات أساسية</h3>
                    <div className="space-y-2 text-right">
                      <div><span className="font-semibold">رقم إجراء قسم المختبر:</span> {printContent.procedure.internal_procedure_number || 'غير محدد'}</div>
                      <div><span className="font-semibold">رقم الإجراء البيطري:</span> {printContent.procedure.external_procedure_number || 'غير محدد'}</div>
                      <div><span className="font-semibold">اسم العميل:</span> {printContent.procedure.client_name}</div>
                      <div><span className="font-semibold">تاريخ الاستلام:</span> {printContent.procedure.reception_date}</div>
                      <div><span className="font-semibold">بلد المنشأ:</span> {printContent.procedure.country_port || 'غير محدد'}</div>
                    </div>
                  </div>

                  <div className="bg-[#00a651]/5 p-4 rounded-lg no-break">
                    <h3 className="font-bold text-[#00a651] mb-3 text-right">معلومات إضافية</h3>
                    <div className="space-y-2 text-right">
                      <div><span className="font-semibold">تاريخ الإجراء البيطري:</span> {printContent.procedure.external_procedure_date || 'غير محدد'}</div>
                      <div><span className="font-semibold">مستلم العينة في قسم المختبر:</span> {printContent.procedure.receiver_name}</div>
                      <div><span className="font-semibold">مصدر العينة:</span> {printContent.procedure.sample_origin || 'غير محدد'}</div>
                    </div>
                  </div>
                </div>

                  {printContent.type === 'procedure' ? (
                    <>
                      <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 text-right text-sm">العينات والنتائج</h3>
                        <div className="space-y-2">
                        {printContent.samples.map(({ sample, result }: any, index: number) => (
                          <div key={sample.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 no-break">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[11px] text-gray-500">
                                {result && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد' ? 'bg-red-100 text-red-800' :
                                    result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد' ? 'bg-green-100 text-green-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {getResultLabel(result.test_result)}
                                  </span>
                                )}
                                {!result && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-semibold">
                                    لم يتم الفحص
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-[#003361]">
                                {sample.sample_number ? `رقم العينة: ${sample.sample_number}` : `عينة #${index + 1}`}
                              </h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-right text-[11px]">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500 font-medium">القسم:</span>
                                <span className="text-gray-900">{sample.department}</span>
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
                              {result && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">الطريقة:</span>
                                    <span className="text-gray-900">{result.test_method}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">تاريخ الفحص:</span>
                                    <span className="text-gray-900">{result.test_date || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">إيجابية:</span>
                                    <span className="text-red-600 font-bold">{result.positive_samples}</span>
                                  </div>
                                  {result.is_vaccination_efficiency_test && result.vaccination_efficiency_percentage && (
                                    <div className="col-span-3 bg-blue-50 p-2 rounded border border-blue-200 flex gap-2">
                                      <span className="text-blue-700 font-semibold text-[11px]">نسبة كفاءة التحصين:</span>
                                      <span className="text-blue-900 font-bold">{result.vaccination_efficiency_percentage}%</span>
                                    </div>
                                  )}
                                  <div className="col-span-3 flex items-start gap-1">
                                    <span className="text-gray-500 font-medium">الأخصائيين:</span>
                                    <span className="text-gray-900">{result.specialists?.join('، ') || '-'}</span>
                                  </div>
                                  {result.approved_by && (
                                    <div className="col-span-3 bg-blue-50 p-2 rounded border border-blue-200 flex gap-2">
                                      <span className="text-blue-700 font-semibold text-[11px]">معتمد النتائج:</span>
                                      <span className="text-blue-900 font-bold">{result.approved_by}</span>
                                    </div>
                                  )}
                                  {result.notes && (
                                    <div className="col-span-3 flex items-start gap-1">
                                      <span className="text-gray-500 font-medium">ملاحظات:</span>
                                      <span className="text-gray-900">{result.notes}</span>
                                    </div>
                                  )}
                                  {result.confirmatory_test?.test_type && (
                                    <div className="col-span-3 bg-blue-50 p-2 rounded mt-2">
                                      <div className="font-semibold text-[#003361] text-[11px] mb-1">الاختبار التأكيدي</div>
                                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500 font-medium">الطريقة:</span>
                                          <span className="text-gray-900">{result.confirmatory_test.test_type}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500 font-medium">إيجابية:</span>
                                          <span className="text-red-600 font-bold">{result.confirmatory_test.positive_samples || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 text-right text-sm">معلومات العينة</h3>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 no-break">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] text-gray-500">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                printContent.result.test_result === 'positive' || printContent.result.test_result === 'إيجابي بعد التأكيد' ? 'bg-red-100 text-red-800' :
                                printContent.result.test_result === 'negative' || printContent.result.test_result === 'سلبي بعد التأكيد' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {getResultLabel(printContent.result.test_result)}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#003361]">رقم العينة: {printContent.sample.sample_number || '-'}</h4>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-right text-[11px]">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">القسم:</span>
                              <span className="text-gray-900">{printContent.sample.department}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">الفحص:</span>
                              <span className="text-gray-900">{printContent.sample.requested_test}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">نوع العينة:</span>
                              <span className="text-gray-900">{printContent.sample.sample_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">نوع الحيوان:</span>
                              <span className="text-gray-900">{printContent.sample.animal_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">العدد:</span>
                              <span className="text-gray-900 font-semibold">{printContent.sample.sample_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">الطريقة:</span>
                              <span className="text-gray-900">{printContent.result.test_method}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">تاريخ الفحص:</span>
                              <span className="text-gray-900">{printContent.result.test_date || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">إيجابية:</span>
                              <span className="text-red-600 font-bold">{printContent.result.positive_samples}</span>
                            </div>
                            {printContent.result.is_vaccination_efficiency_test && printContent.result.vaccination_efficiency_percentage && (
                              <div className="col-span-3 bg-blue-50 p-2 rounded border border-blue-200 flex gap-2">
                                <span className="text-blue-700 font-semibold text-[11px]">نسبة كفاءة التحصين:</span>
                                <span className="text-blue-900 font-bold">{printContent.result.vaccination_efficiency_percentage}%</span>
                              </div>
                            )}
                            <div className="col-span-3 flex items-start gap-1">
                              <span className="text-gray-500 font-medium">الأخصائيين:</span>
                              <span className="text-gray-900">{printContent.result.specialists?.join('، ') || '-'}</span>
                            </div>
                            {printContent.result.approved_by && (
                              <div className="col-span-3 bg-blue-50 p-2 rounded border border-blue-200 flex gap-2">
                                <span className="text-blue-700 font-semibold text-[11px]">معتمد النتائج:</span>
                                <span className="text-blue-900 font-bold">{printContent.result.approved_by}</span>
                              </div>
                            )}
                            {printContent.result.notes && (
                              <div className="col-span-3 flex items-start gap-1">
                                <span className="text-gray-500 font-medium">ملاحظات:</span>
                                <span className="text-gray-900">{printContent.result.notes}</span>
                              </div>
                            )}
                            {printContent.result.confirmatory_test?.test_type && (
                              <div className="col-span-3 bg-blue-50 p-2 rounded mt-2">
                                <div className="font-semibold text-[#003361] text-[11px] mb-1">الاختبار التأكيدي</div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">الطريقة:</span>
                                    <span className="text-gray-900">{printContent.result.confirmatory_test.test_type}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">إيجابية:</span>
                                    <span className="text-red-600 font-bold">{printContent.result.confirmatory_test.positive_samples || 0}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

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
        </div>
      )}
    </div>
  );
}
