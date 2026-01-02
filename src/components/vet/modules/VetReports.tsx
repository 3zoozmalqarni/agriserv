import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, BarChart3, X, Eye, Search, TestTube2, Ship, Users } from 'lucide-react';
import { useVetProcedures } from '../../../hooks/useVetProcedures';
import { vetDB, AnimalShipment } from '../../../lib/vetDatabase';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import { getSaudiDate } from '../../../lib/shared-constants';

type ReportType = 'samples' | 'shipments' | 'traders';

const countryOptions = [
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

const animalTypeOptions = [
  'ضأن',
  'ماعز',
  'أبقار',
  'ابل',
  'خيل',
  'دواجن',
  'أغنام',
  'بيض',
  'أخرى'
];

const animalGenderOptions = [
  'ذكور',
  'إناث',
  'أخرى'
];

const sampleTypeOptions = [
  'مصل',
  'دم كامل',
  'أحشاء',
  'مسحات',
  'كحتات',
  'صيصان',
  'بيض',
  'روث',
  'حليب',
  'أعضاء',
  'أخرى'
];

const requiredTestOptions = [
  'البروسيلا',
  'حمى الوادي المتصدع',
  'حمى الوادي المتصدع (كفاءة تحصين)',
  'الحمى القلاعية',
  'جدي الضأن',
  'جدري الإبل',
  'طاعون المجترات الصغيرة',
  'أخرى'
];

const preparerNameOptions = [
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

const doctorOptions = [
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

const arrivalTimeOptions = [
  'صباحاً',
  'مساءً',
  'منتصف الليل'
];

export default function VetReports() {
  const [activeReportType, setActiveReportType] = useState<ReportType>('samples');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState('تقرير المحجر');

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    procedureNumber: '',
    shipName: '',
    countryPort: '',
    preparerName: '',
    samplingDoctors: '',
    animalType: '',
    animalGender: '',
    sampleType: '',
  });

  const [shipmentFilters, setShipmentFilters] = useState({
    startDate: '',
    endDate: '',
    procedureNumber: '',
    transportMode: '',
    importerName: '',
    originCountry: '',
    arrivalTime: '',
    animalType: '',
    animalGender: '',
    samplingDoctors: '',
    shipmentStatus: '',
  });

  const [traderFilters, setTraderFilters] = useState({
    startDate: '',
    endDate: '',
    procedureNumber: '',
    importerName: '',
    permitNumber: '',
    statementNumber: '',
    animalType: '',
    quarantineLocation: '',
    reason: '',
    notes: '',
  });

  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomAnimalType, setShowCustomAnimalType] = useState(false);
  const [showCustomAnimalGender, setShowCustomAnimalGender] = useState(false);
  const [showCustomSampleType, setShowCustomSampleType] = useState(false);
  const [showCustomPreparer, setShowCustomPreparer] = useState(false);
  const [showCustomDoctor, setShowCustomDoctor] = useState(false);

  const [showShipmentCustomCountry, setShowShipmentCustomCountry] = useState(false);
  const [showShipmentCustomAnimalType, setShowShipmentCustomAnimalType] = useState(false);
  const [showShipmentCustomAnimalGender, setShowShipmentCustomAnimalGender] = useState(false);
  const [showShipmentCustomDoctor, setShowShipmentCustomDoctor] = useState(false);

  const { procedures, loading } = useVetProcedures();
  const [shipments, setShipments] = useState<AnimalShipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);

  useEffect(() => {
    const loadShipments = async () => {
      try {
        setShipmentsLoading(true);
        const data = await vetDB.getAnimalShipments();
        setShipments(data);
      } catch (error) {
        console.error('Error loading shipments:', error);
        toast.error('خطأ في تحميل الإرساليات');
      } finally {
        setShipmentsLoading(false);
      }
    };

    loadShipments();

    const handleDataChange = () => {
      loadShipments();
    };

    window.addEventListener('vet-data-changed', handleDataChange);
    return () => window.removeEventListener('vet-data-changed', handleDataChange);
  }, []);

  const generateFilteredData = async () => {
    let data: any[] = [];
    let title = '';

    if (activeReportType === 'samples') {
      title = 'تقرير العينات';

      const allData = procedures.map(proc => {
        const sampleGroups = proc.sample_groups || [];
        return sampleGroups.map(group => {
          // Get all unique sample types from the group
          const sampleTypes = group.samples?.map(s => s.sample_type).filter(Boolean) || [];
          const uniqueSampleTypes = [...new Set(sampleTypes)];
          const sampleTypeDisplay = uniqueSampleTypes.length > 0 ? uniqueSampleTypes.join(', ') : '-';

          return {
            'رقم الإجراء البيطري': proc.procedure_number,
            'اسم الباخرة': proc.client_name,
            'تاريخ الإجراء': proc.reception_date,
            'بلد المنشأ': proc.country_port || '-',
            'اسم معد الإجراء البيطري': proc.receiver_name || '-',
            'الأطباء القائمين بالكشف وسحب العينات': proc.sampling_doctors?.join(', ') || '-',
            'نوع الحيوان': group.animal_type,
            'جنس الحيوان': group.animal_gender,
            'عدد العينات': group.sample_count,
            'نوع العينة': sampleTypeDisplay,
          };
        });
      }).flat();

      data = allData.filter(item => {
        let matches = true;

        if (filters.startDate || filters.endDate) {
          const itemDate = new Date(item['تاريخ الإجراء']);
          const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
          const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');
          matches = matches && itemDate >= start && itemDate <= end;
        }

        if (filters.procedureNumber) {
          matches = matches && item['رقم الإجراء البيطري'].toLowerCase().includes(filters.procedureNumber.toLowerCase());
        }

        if (filters.shipName) {
          matches = matches && item['اسم الباخرة'].toLowerCase().includes(filters.shipName.toLowerCase());
        }

        if (filters.countryPort) {
          matches = matches && (item['بلد المنشأ'] ?? '').toLowerCase().includes(filters.countryPort.toLowerCase());
        }

        if (filters.preparerName) {
          matches = matches && (item['اسم معد الإجراء البيطري'] ?? '').toLowerCase().includes(filters.preparerName.toLowerCase());
        }

        if (filters.samplingDoctors) {
          matches = matches && (item['الأطباء القائمين بالكشف وسحب العينات'] ?? '').toLowerCase().includes(filters.samplingDoctors.toLowerCase());
        }

        if (filters.animalType) {
          matches = matches && item['نوع الحيوان'].toLowerCase().includes(filters.animalType.toLowerCase());
        }

        if (filters.animalGender) {
          matches = matches && item['جنس الحيوان'].toLowerCase().includes(filters.animalGender.toLowerCase());
        }

        if (filters.sampleType) {
          const sampleType = item['نوع العينة'];
          // Skip items with no sample type (-)
          if (sampleType === '-') {
            matches = false;
          } else {
            matches = matches && sampleType.toLowerCase().includes(filters.sampleType.toLowerCase());
          }
        }

        return matches;
      });
    } else if (activeReportType === 'shipments') {
      title = 'تقرير الإرساليات';

      const allData = shipments.map(shipment => {
        const animalsList = shipment.animals || [];
        return animalsList.map(animal => ({
          'رقم الإجراء البيطري': shipment.procedure_number,
          'وسيلة النقل': shipment.transport_method,
          'اسم المستورد': shipment.importer_name,
          'بلد المنشأ': shipment.origin_country,
          'وقت الوصول': shipment.arrival_time,
          'نوع الحيوان': animal.animal_type || '-',
          'جنس الحيوان': animal.animal_gender || '-',
          'عدد الحيوانات': animal.animal_count || 0,
          'عدد النافق': animal.death_count || 0,
          'الأطباء القائمين بالكشف': shipment.doctors?.join(', ') || '-',
          'حالة الإرسالية': shipment.final_decision || '-',
          'تاريخ التسجيل': shipment.created_at ? new Date(shipment.created_at).toLocaleDateString('en-GB') : '-',
        }));
      }).flat();

      data = allData.filter(item => {
        let matches = true;

        if (shipmentFilters.startDate || shipmentFilters.endDate) {
          const itemDate = new Date(item['تاريخ التسجيل']);
          const start = shipmentFilters.startDate ? new Date(shipmentFilters.startDate) : new Date('1900-01-01');
          const end = shipmentFilters.endDate ? new Date(shipmentFilters.endDate) : new Date('2100-12-31');
          matches = matches && itemDate >= start && itemDate <= end;
        }

        if (shipmentFilters.procedureNumber) {
          matches = matches && item['رقم الإجراء البيطري'].toLowerCase().includes(shipmentFilters.procedureNumber.toLowerCase());
        }

        if (shipmentFilters.transportMode) {
          matches = matches && (item['وسيلة النقل'] ?? '').toLowerCase().includes(shipmentFilters.transportMode.toLowerCase());
        }

        if (shipmentFilters.importerName) {
          matches = matches && (item['اسم المستورد'] ?? '').toLowerCase().includes(shipmentFilters.importerName.toLowerCase());
        }

        if (shipmentFilters.originCountry) {
          matches = matches && (item['بلد المنشأ'] ?? '').toLowerCase().includes(shipmentFilters.originCountry.toLowerCase());
        }

        if (shipmentFilters.arrivalTime) {
          matches = matches && (item['وقت الوصول'] ?? '').toLowerCase().includes(shipmentFilters.arrivalTime.toLowerCase());
        }

        if (shipmentFilters.animalType) {
          matches = matches && (item['نوع الحيوان'] ?? '').toLowerCase().includes(shipmentFilters.animalType.toLowerCase());
        }

        if (shipmentFilters.animalGender) {
          matches = matches && (item['جنس الحيوان'] ?? '').toLowerCase().includes(shipmentFilters.animalGender.toLowerCase());
        }

        if (shipmentFilters.samplingDoctors) {
          matches = matches && (item['الأطباء القائمين بالكشف'] ?? '').toLowerCase().includes(shipmentFilters.samplingDoctors.toLowerCase());
        }

        if (shipmentFilters.shipmentStatus) {
          matches = matches && (item['حالة الإرسالية'] ?? '').toLowerCase().includes(shipmentFilters.shipmentStatus.toLowerCase());
        }

        return matches;
      });
    } else if (activeReportType === 'traders') {
      title = 'تقارير مفصلة بالمستوردين والأذونات';

      const loadTradersData = async () => {
        if (!window.electronAPI?.getAllQuarantineTraders) {
          toast.error('هذه الميزة متاحة فقط في النسخة المكتبية');
          return [];
        }

        try {
          const traders = await window.electronAPI.getAllQuarantineTraders();

          if (!traders || !Array.isArray(traders)) {
            console.error('Invalid traders data:', traders);
            toast.error('البيانات المسترجعة غير صحيحة');
            return [];
          }

          const allData = traders.map(trader => ({
            'اسم المستورد': trader.importer_name || '-',
            'رقم الإذن': trader.permit_number || '-',
            'رقم البيان': trader.statement_number || '-',
            'عدد الحيوانات': trader.animal_count || '-',
            'نوع الحيوان': trader.animal_type || '-',
            'مكان الحجر': trader.quarantine_location || '-',
            'السبب': Array.isArray(trader.reasons) ? trader.reasons.join(' - ') : (trader.reasons || '-'),
            'ملاحظات': trader.notes || '-',
            'رقم الإجراء البيطري': trader.shipment_id || '-',
            'تاريخ التسجيل': trader.created_at ? new Date(trader.created_at).toLocaleDateString('en-GB') : '-',
            _rawDate: trader.created_at,
          }));

          const filteredData = allData.filter(item => {
            let matches = true;

            if (traderFilters.startDate || traderFilters.endDate) {
              if (item._rawDate) {
                const itemDate = new Date(item._rawDate);
                const start = traderFilters.startDate ? new Date(traderFilters.startDate) : new Date('1900-01-01');
                const end = traderFilters.endDate ? new Date(traderFilters.endDate) : new Date('2100-12-31');
                matches = matches && itemDate >= start && itemDate <= end;
              }
            }

            if (traderFilters.procedureNumber) {
              matches = matches && (item['رقم الإجراء البيطري'] ?? '').toLowerCase().includes(traderFilters.procedureNumber.toLowerCase());
            }

            if (traderFilters.importerName) {
              matches = matches && (item['اسم المستورد'] ?? '').toLowerCase().includes(traderFilters.importerName.toLowerCase());
            }

            if (traderFilters.permitNumber) {
              matches = matches && (item['رقم الإذن'] ?? '').toLowerCase().includes(traderFilters.permitNumber.toLowerCase());
            }

            if (traderFilters.statementNumber) {
              matches = matches && (item['رقم البيان'] ?? '').toLowerCase().includes(traderFilters.statementNumber.toLowerCase());
            }

            if (traderFilters.animalType) {
              matches = matches && (item['نوع الحيوان'] ?? '').toLowerCase().includes(traderFilters.animalType.toLowerCase());
            }

            if (traderFilters.quarantineLocation) {
              matches = matches && (item['مكان الحجر'] ?? '').toLowerCase().includes(traderFilters.quarantineLocation.toLowerCase());
            }

            if (traderFilters.reason) {
              matches = matches && (item['السبب'] ?? '').toLowerCase().includes(traderFilters.reason.toLowerCase());
            }

            if (traderFilters.notes) {
              matches = matches && (item['ملاحظات'] ?? '').toLowerCase().includes(traderFilters.notes.toLowerCase());
            }

            return matches;
          });

          // إزالة البيانات الخام قبل العرض
          return filteredData.map(item => {
            const { _rawDate, ...cleanItem } = item;
            return cleanItem;
          });
        } catch (error) {
          console.error('Error loading traders data:', error);
          toast.error('خطأ في تحميل بيانات التجار');
          return [];
        }
      };

      data = await loadTradersData();
    }

    setPreviewData(data);
    setReportTitle(title);
    return data;
  };

  const handlePreview = async () => {
    const data = await generateFilteredData();
    if (data.length === 0) {
      toast.error('لا توجد بيانات تطابق الفلاتر المحددة');
      return;
    }
    setShowPreview(true);
    toast.success(`تم إنشاء معاينة التقرير - ${data.length} سجل`);
  };

  const exportToExcel = () => {
    if (previewData.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    try {
      console.log('Exporting data:', previewData.length, 'records');
      console.log('Sample data:', previewData[0]);

      const worksheet = XLSX.utils.json_to_sheet(previewData);
      const workbook = XLSX.utils.book_new();

      // استخدام اسم آمن للورقة (Sheet name)
      const safeSheetName = reportTitle.substring(0, 31).replace(/[:\\/?*[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

      const fileName = `${reportTitle.replace(/[:\\/?*<>|"]/g, '_')}_${getSaudiDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error(`خطأ في تصدير التقرير: ${error.message}`);
    }
  };

  const exportToPDF = () => {
    if (previewData.length === 0) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }

    const htmlContent = generateReportPrintHTML();
    const success = createPrintWindow(htmlContent);

    if (!success) {
      toast.error('يرجى السماح بفتح النوافذ المنبثقة في المتصفح', {
        duration: 4000,
      });
    } else {
      toast.success('تم فتح نافذة الطباعة بنجاح');
    }
  };

  const generateReportPrintHTML = () => {
    if (previewData.length === 0) return '';

    const columns = Object.keys(previewData[0]);

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportTitle}</title>
        ${getCommonPrintStyles()}
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 9pt;
          }
          table th, table td {
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            text-align: right;
            white-space: nowrap;
          }
          table th {
            background: #f3f4f6;
            font-weight: 600;
          }
          .filters-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${generatePrintHeader(reportTitle)}

          <div class="section">
            <div class="section-title">معلومات التقرير</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">نوع التقرير:</span>
                <span class="info-value">${reportTitle}</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ الإنشاء:</span>
                <span class="info-value">${new Date().toLocaleDateString('ar-SA')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">وقت الإنشاء:</span>
                <span class="info-value">${new Date().toLocaleTimeString('ar-SA')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">عدد السجلات:</span>
                <span class="info-value">${previewData.length}</span>
              </div>
            </div>
          </div>

          ${Object.values(filters).some(f => f) ? `
            <div class="section">
              <div class="section-title">الفلاتر المطبقة</div>
              <div class="filters-section">
                ${filters.startDate ? `<div><strong>من تاريخ:</strong> ${filters.startDate}</div>` : ''}
                ${filters.endDate ? `<div><strong>إلى تاريخ:</strong> ${filters.endDate}</div>` : ''}
                ${filters.procedureNumber ? `<div><strong>رقم الإجراء البيطري:</strong> ${filters.procedureNumber}</div>` : ''}
                ${filters.shipName ? `<div><strong>اسم الباخرة:</strong> ${filters.shipName}</div>` : ''}
                ${filters.countryPort ? `<div><strong>بلد المنشأ:</strong> ${filters.countryPort}</div>` : ''}
                ${filters.preparerName ? `<div><strong>معد الإجراء البيطري:</strong> ${filters.preparerName}</div>` : ''}
                ${filters.samplingDoctors ? `<div><strong>الأطباء القائمين بالكشف:</strong> ${filters.samplingDoctors}</div>` : ''}
                ${filters.animalType ? `<div><strong>نوع الحيوان:</strong> ${filters.animalType}</div>` : ''}
                ${filters.animalGender ? `<div><strong>جنس الحيوان:</strong> ${filters.animalGender}</div>` : ''}
                ${filters.sampleType ? `<div><strong>نوع العينة:</strong> ${filters.sampleType}</div>` : ''}
              </div>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">بيانات التقرير</div>
            <table>
              <thead>
                <tr>
                  ${columns.map(column => `<th>${column}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${previewData.map(row => `
                  <tr>
                    ${columns.map(column => `<td>${row[column] || '-'}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${generatePrintFooter()}
        </div>
      </body>
      </html>
    `;
  };

  if (loading || shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008a40] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={BarChart3}
            title="التقارير"
            subtitle="عرض وتصدير تقارير الإجراءات البيطرية"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => {
                setActiveReportType('samples');
                setShowPreview(false);
                setPreviewData([]);
              }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
                activeReportType === 'samples'
                  ? 'border-[#008a40] bg-[#008a40]/5'
                  : 'border-gray-200 hover:border-[#008a40]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">تقارير العينات</h3>
                  <p className="text-sm text-gray-600">الإجراءات البيطرية والعينات</p>
                </div>
                <TestTube2 className="w-8 h-8 text-[#008a40]" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveReportType('shipments');
                setShowPreview(false);
                setPreviewData([]);
              }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
                activeReportType === 'shipments'
                  ? 'border-[#008a40] bg-[#008a40]/5'
                  : 'border-gray-200 hover:border-[#008a40]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">تقارير الإرساليات</h3>
                  <p className="text-sm text-gray-600">سجلات الإرساليات والحيوانات</p>
                </div>
                <Ship className="w-8 h-8 text-[#008a40]" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveReportType('traders');
                setShowPreview(false);
                setPreviewData([]);
              }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
                activeReportType === 'traders'
                  ? 'border-[#008a40] bg-[#008a40]/5'
                  : 'border-gray-200 hover:border-[#008a40]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">تقارير مفصلة بالمستوردين والأذونات</h3>
                  <p className="text-sm text-gray-600">بيانات المستوردين وأذونات الحجر البيطري</p>
                </div>
                <Users className="w-8 h-8 text-[#008a40]" />
              </div>
            </button>
          </div>

          {activeReportType === 'samples' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">فلاتر التقرير</h3>
            <Filter className="w-5 h-5 text-gray-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
              />
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
              />
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإجراء البيطري</label>
              <input
                type="text"
                placeholder="رقم الإجراء البيطري..."
                value={filters.procedureNumber}
                onChange={(e) => setFilters({...filters, procedureNumber: e.target.value})}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              />
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم الباخرة</label>
              <input
                type="text"
                placeholder="اسم الباخرة..."
                value={filters.shipName}
                onChange={(e) => setFilters({...filters, shipName: e.target.value})}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              />
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">بلد المنشأ</label>
              {showCustomCountry ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="بلد المنشأ..."
                    value={filters.countryPort}
                    onChange={(e) => setFilters({...filters, countryPort: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomCountry(false);
                      setFilters({...filters, countryPort: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.countryPort}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomCountry(true);
                      setFilters({...filters, countryPort: ''});
                    } else {
                      setFilters({...filters, countryPort: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع البلدان</option>
                  {countryOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم معد الإجراء البيطري</label>
              {showCustomPreparer ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="اسم معد الإجراء البيطري..."
                    value={filters.preparerName}
                    onChange={(e) => setFilters({...filters, preparerName: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomPreparer(false);
                      setFilters({...filters, preparerName: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.preparerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomPreparer(true);
                      setFilters({...filters, preparerName: ''});
                    } else {
                      setFilters({...filters, preparerName: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع المعدين</option>
                  {preparerNameOptions.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">الأطباء القائمين بالكشف وسحب العينات</label>
              {showCustomDoctor ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="الأطباء القائمين بالكشف وسحب العينات..."
                    value={filters.samplingDoctors}
                    onChange={(e) => setFilters({...filters, samplingDoctors: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomDoctor(false);
                      setFilters({...filters, samplingDoctors: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.samplingDoctors}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomDoctor(true);
                      setFilters({...filters, samplingDoctors: ''});
                    } else {
                      setFilters({...filters, samplingDoctors: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع الأطباء</option>
                  {doctorOptions.map(doctor => (
                    <option key={doctor} value={doctor}>{doctor}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحيوان</label>
              {showCustomAnimalType ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="نوع الحيوان..."
                    value={filters.animalType}
                    onChange={(e) => setFilters({...filters, animalType: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomAnimalType(false);
                      setFilters({...filters, animalType: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.animalType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomAnimalType(true);
                      setFilters({...filters, animalType: ''});
                    } else {
                      setFilters({...filters, animalType: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع الأنواع</option>
                  {animalTypeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">جنس الحيوان</label>
              {showCustomAnimalGender ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="جنس الحيوان..."
                    value={filters.animalGender}
                    onChange={(e) => setFilters({...filters, animalGender: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomAnimalGender(false);
                      setFilters({...filters, animalGender: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.animalGender}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomAnimalGender(true);
                      setFilters({...filters, animalGender: ''});
                    } else {
                      setFilters({...filters, animalGender: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع الأجناس</option>
                  {animalGenderOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع العينة</label>
              {showCustomSampleType ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="نوع العينة..."
                    value={filters.sampleType}
                    onChange={(e) => setFilters({...filters, sampleType: e.target.value})}
                    className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomSampleType(false);
                      setFilters({...filters, sampleType: ''});
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={filters.sampleType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'أخرى') {
                      setShowCustomSampleType(true);
                      setFilters({...filters, sampleType: ''});
                    } else {
                      setFilters({...filters, sampleType: value});
                    }
                  }}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع أنواع العينات</option>
                  {sampleTypeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-center mt-4">
            <button
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  procedureNumber: '',
                  shipName: '',
                  countryPort: '',
                  preparerName: '',
                  samplingDoctors: '',
                  animalType: '',
                  animalGender: '',
                  sampleType: '',
                });
                setShowCustomCountry(false);
                setShowCustomAnimalType(false);
                setShowCustomAnimalGender(false);
                setShowCustomSampleType(false);
                setShowCustomPreparer(false);
                setShowCustomDoctor(false);
                setShowPreview(false);
                setPreviewData([]);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>

            <button
              onClick={handlePreview}
              className="bg-[#008a40] text-white px-6 py-2 rounded-lg hover:bg-[#007035] flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              معاينة التقرير
            </button>
          </div>
        </div>
        )}

        {activeReportType === 'shipments' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">فلاتر التقرير</h3>
              <Filter className="w-5 h-5 text-gray-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={shipmentFilters.startDate}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, startDate: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={shipmentFilters.endDate}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, endDate: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإجراء البيطري</label>
                <input
                  type="text"
                  placeholder="رقم الإجراء البيطري..."
                  value={shipmentFilters.procedureNumber}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, procedureNumber: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">وسيلة النقل</label>
                <input
                  type="text"
                  placeholder="وسيلة النقل..."
                  value={shipmentFilters.transportMode}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, transportMode: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستورد</label>
                <input
                  type="text"
                  placeholder="اسم المستورد..."
                  value={shipmentFilters.importerName}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, importerName: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">بلد المنشأ</label>
                {showShipmentCustomCountry ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بلد المنشأ..."
                      value={shipmentFilters.originCountry}
                      onChange={(e) => setShipmentFilters({...shipmentFilters, originCountry: e.target.value})}
                      className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowShipmentCustomCountry(false);
                        setShipmentFilters({...shipmentFilters, originCountry: ''});
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={shipmentFilters.originCountry}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'أخرى') {
                        setShowShipmentCustomCountry(true);
                        setShipmentFilters({...shipmentFilters, originCountry: ''});
                      } else {
                        setShipmentFilters({...shipmentFilters, originCountry: value});
                      }
                    }}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الدول</option>
                    {countryOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">وقت الوصول</label>
                <select
                  value={shipmentFilters.arrivalTime}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, arrivalTime: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع الأوقات</option>
                  {arrivalTimeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحيوان</label>
                {showShipmentCustomAnimalType ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="نوع الحيوان..."
                      value={shipmentFilters.animalType}
                      onChange={(e) => setShipmentFilters({...shipmentFilters, animalType: e.target.value})}
                      className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowShipmentCustomAnimalType(false);
                        setShipmentFilters({...shipmentFilters, animalType: ''});
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={shipmentFilters.animalType}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'أخرى') {
                        setShowShipmentCustomAnimalType(true);
                        setShipmentFilters({...shipmentFilters, animalType: ''});
                      } else {
                        setShipmentFilters({...shipmentFilters, animalType: value});
                      }
                    }}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الأنواع</option>
                    {animalTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">جنس الحيوان</label>
                {showShipmentCustomAnimalGender ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="جنس الحيوان..."
                      value={shipmentFilters.animalGender}
                      onChange={(e) => setShipmentFilters({...shipmentFilters, animalGender: e.target.value})}
                      className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowShipmentCustomAnimalGender(false);
                        setShipmentFilters({...shipmentFilters, animalGender: ''});
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={shipmentFilters.animalGender}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'أخرى') {
                        setShowShipmentCustomAnimalGender(true);
                        setShipmentFilters({...shipmentFilters, animalGender: ''});
                      } else {
                        setShipmentFilters({...shipmentFilters, animalGender: value});
                      }
                    }}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الأجناس</option>
                    {animalGenderOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">الأطباء القائمين بالكشف وسحب العينات</label>
                {showShipmentCustomDoctor ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اسم الطبيب..."
                      value={shipmentFilters.samplingDoctors}
                      onChange={(e) => setShipmentFilters({...shipmentFilters, samplingDoctors: e.target.value})}
                      className="w-full px-3 h-[50px] border-2 border-[#008a40] rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#008a40] text-right bg-green-50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowShipmentCustomDoctor(false);
                        setShipmentFilters({...shipmentFilters, samplingDoctors: ''});
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={shipmentFilters.samplingDoctors}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'أخرى') {
                        setShowShipmentCustomDoctor(true);
                        setShipmentFilters({...shipmentFilters, samplingDoctors: ''});
                      } else {
                        setShipmentFilters({...shipmentFilters, samplingDoctors: value});
                      }
                    }}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الأطباء</option>
                    {doctorOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">حالة الإرسالية</label>
                <select
                  value={shipmentFilters.shipmentStatus}
                  onChange={(e) => setShipmentFilters({...shipmentFilters, shipmentStatus: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">جميع الحالات</option>
                  <option value="فسح">فسح</option>
                  <option value="حجر">حجر</option>
                  <option value="إرجاع">إرجاع</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => {
                  setShipmentFilters({
                    startDate: '',
                    endDate: '',
                    procedureNumber: '',
                    transportMode: '',
                    importerName: '',
                    originCountry: '',
                    arrivalTime: '',
                    animalType: '',
                    animalGender: '',
                    samplingDoctors: '',
                    shipmentStatus: '',
                  });
                  setShowShipmentCustomCountry(false);
                  setShowShipmentCustomAnimalType(false);
                  setShowShipmentCustomAnimalGender(false);
                  setShowShipmentCustomDoctor(false);
                  setShowPreview(false);
                  setPreviewData([]);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                مسح الفلاتر
              </button>

              <button
                onClick={handlePreview}
                className="bg-[#008a40] text-white px-6 py-2 rounded-lg hover:bg-[#007035] flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                معاينة التقرير
              </button>
            </div>
          </div>
        )}

        {activeReportType === 'traders' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">فلاتر التقرير</h3>
              <Filter className="w-5 h-5 text-gray-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={traderFilters.startDate}
                  onChange={(e) => setTraderFilters({...traderFilters, startDate: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={traderFilters.endDate}
                  onChange={(e) => setTraderFilters({...traderFilters, endDate: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإجراء البيطري</label>
                <input
                  type="text"
                  placeholder="رقم الإجراء البيطري..."
                  value={traderFilters.procedureNumber}
                  onChange={(e) => setTraderFilters({...traderFilters, procedureNumber: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستورد</label>
                <input
                  type="text"
                  placeholder="اسم المستورد..."
                  value={traderFilters.importerName}
                  onChange={(e) => setTraderFilters({...traderFilters, importerName: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإذن</label>
                <input
                  type="text"
                  placeholder="رقم الإذن..."
                  value={traderFilters.permitNumber}
                  onChange={(e) => setTraderFilters({...traderFilters, permitNumber: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم البيان</label>
                <input
                  type="text"
                  placeholder="رقم البيان..."
                  value={traderFilters.statementNumber}
                  onChange={(e) => setTraderFilters({...traderFilters, statementNumber: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحيوان</label>
                <input
                  type="text"
                  placeholder="نوع الحيوان..."
                  value={traderFilters.animalType}
                  onChange={(e) => setTraderFilters({...traderFilters, animalType: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">مكان الحجر</label>
                <input
                  type="text"
                  placeholder="مكان الحجر..."
                  value={traderFilters.quarantineLocation}
                  onChange={(e) => setTraderFilters({...traderFilters, quarantineLocation: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">السبب</label>
                <input
                  type="text"
                  placeholder="السبب..."
                  value={traderFilters.reason}
                  onChange={(e) => setTraderFilters({...traderFilters, reason: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <input
                  type="text"
                  placeholder="ملاحظات..."
                  value={traderFilters.notes}
                  onChange={(e) => setTraderFilters({...traderFilters, notes: e.target.value})}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => {
                  setTraderFilters({
                    startDate: '',
                    endDate: '',
                    procedureNumber: '',
                    importerName: '',
                    permitNumber: '',
                    statementNumber: '',
                    animalType: '',
                    quarantineLocation: '',
                    reason: '',
                    notes: '',
                  });
                  setShowPreview(false);
                  setPreviewData([]);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                مسح الفلاتر
              </button>

              <button
                onClick={handlePreview}
                className="bg-[#008a40] text-white px-6 py-2 rounded-lg hover:bg-[#007035] flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                معاينة التقرير
              </button>
            </div>
          </div>
        )}

        {previewData.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير Excel
            </button>
          </div>
        )}

        {showPreview && previewData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">معاينة التقرير - {reportTitle}</h3>
              <span className="text-sm text-gray-600">{previewData.length} سجل</span>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full border-collapse border border-gray-200 bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    {Object.keys(previewData[0]).map((column, index) => (
                      <th key={index} className="border border-gray-200 px-4 py-3 text-right font-semibold text-sm whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.keys(previewData[0]).map((column, colIndex) => (
                        <td key={colIndex} className="border border-gray-200 px-4 py-3 text-right text-sm whitespace-nowrap">
                          {row[column] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.length > 10 && (
              <div className="text-center mt-4 text-gray-600">
                عرض أول 10 سجلات من أصل {previewData.length} سجل
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
