import { useState } from 'react';
import { Download, Filter, Users, TestTube2, Package, BarChart3, X, Eye, Search, Lock } from 'lucide-react';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useInventory } from '../../../hooks/useInventory';
import { useAuth } from '../../../hooks/useAuth';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import { getCommonPrintStyles, generatePrintHeader, generatePrintFooter, createPrintWindow } from '../../../lib/printUtils';
import {
  countryPortOptions,
  receiverNameOptions,
  samplingDoctorOptions,
  requiredTestOptions,
  getSaudiDate
} from '../../../lib/shared-constants';

// Report Types
export type ReportType = 'samples' | 'inventory' | 'statistics';

// Section Labels - matching LabInventory.tsx
export const sectionLabels = {
  'bacteriology': 'البكتيريا',
  'Virology': 'الفيروسات',
  'parasitology': 'الطفيليات',
  'poultry': 'الدواجن',
  'Molecular biology': 'الأحياء الجزيئية',
  'other': 'أخرى'
};

// Inventory Type Labels - matching LabInventory.tsx
export const typeLabels = {
  'diagnostic': 'مشخص',
  'tools': 'أدوات'
};

// Unit Labels - matching LabInventory.tsx
export const unitLabels = {
  'carton': 'كرتون',
  'bag': 'كيس',
  'box': 'علبة'
};

// Sample Origin Options - using the same options as in SampleReception
export const sampleOriginOptions = [
  'جدة',
  'الطائف',
  'الجموم',
  'خليص',
  'تربة',
  'رنية',
  'الخرمة',
  'العاصمة المقدسة',
  'الليث',
  'ميناء جدة الإسلامي',
  'الخمرة',
  'مطار الملك عبدالعزيز',
  'رابغ',
  'الكامل',
  'العرضيات',
  'أضم',
  'القنفذة',
  'أخرى'
];

// Animal Type Options
export const animalTypeOptions = [
  'أغنام',
  'أبقار',
  'ابل',
  'ماعز',
  'خيول',
  'دواجن',
  'ضأن',
  'أخرى'
];

// Test Methods (الطرق المخبرية) - using the same options as in ResultsEntry
export const testMethods = [
  'PCR',
  'iiPCR',
  'ELISA IgM',
  'ELISA',
  'Rose bengal test (RBT)',
  'Bacterial culture (عزل وتصنيف)',
  'Microscopic examination (فحص مجهري)',
  'أخرى'
];

// Specialists (الأخصائيين) - using the same options as in ResultsEntry and SampleReception
export const specialists = [
  'رائد المطيري',
  'زيد شبلي',
  'سعيد الشهري',
  'سليمان أبو سليمان',
  'شاكر العتيبي',
  'صالح التمبكتي',
  'عبدالاله الحميد',
  'عبدالعزيز القرني',
  'عدي المحيميد',
  'علي الغامدي',
  'فاضل الغامدي',
  'فهد الغامدي',
  'فوزي الحربي',
  'ليلى الشهري',
  'ماهر الطويلعي',
  'مصطفى الزيلعي',
  'مصلح الحارثي',
  'هشام المأمون',
  'وائل الحارثي',
  'وليد المالكي',
  'أخرى'
];

// All Required Tests
export const allRequiredTests = requiredTestOptions;

export default function Reports() {
  const auth = useAuth();
  const [activeReportType, setActiveReportType] = useState<ReportType>('samples');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    searchTerm: '',
    section: '',
    animalType: '',
    countryPort: '',
    sampleSource: '',
    testType: '',
    confirmatoryTestType: '',
    requestedTest: '',
    resultType: '', // positive, negative, all
    sampleResult: '', // إيجابي, سلبي, إيجابي بعد التأكيد, كفاءة تحصين, أخرى
    testStatus: '', // tested, not_tested, positive_result, negative_result, vaccination_efficacy_test
    itemType: '', // diagnostic, tools, all
    unit: '', // carton, bag, box
    stockStatus: '', // available, low, out_of_stock
    size: '',
    batchNumber: '',
    serialNumber: '',
    expiryStatus: '', // valid, expiring_soon, expired, no_expiry
    reportType: 'all', // all, with_withdrawals, without_withdrawals, withdrawals_only
    specialist: '',
  });

  const [showCustomAnimalType, setShowCustomAnimalType] = useState(false);
  const [showCustomCountryPort, setShowCustomCountryPort] = useState(false);
  const [showCustomSampleSource, setShowCustomSampleSource] = useState(false);
  const [showCustomTestMethod, setShowCustomTestMethod] = useState(false);
  const [showCustomConfirmatoryTestMethod, setShowCustomConfirmatoryTestMethod] = useState(false);
  const [showCustomSpecialist, setShowCustomSpecialist] = useState(false);
  const [showCustomRequestedTest, setShowCustomRequestedTest] = useState(false);
  const [showCustomEmployee, setShowCustomEmployee] = useState(false);
  const [showCustomSection, setShowCustomSection] = useState(false);
  const [showCustomItemType, setShowCustomItemType] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showCustomSampleResult, setShowCustomSampleResult] = useState(false);

  const { procedures, loading: proceduresLoading } = useProcedures();
  const { results, loading: resultsLoading } = useTestResults();
  const { items, transactions, loading: inventoryLoading } = useInventory();

  // Generate filtered data based on active report type and filters
  const generateFilteredData = () => {
    let data: any[] = [];
    let title = '';

    if (activeReportType === 'samples') {
      title = 'تقرير العينات والنتائج';
      
      // Get all procedures with their samples and results
      const allData = procedures.map(proc => {
        const procSamples = proc.samples || [];
        return procSamples.map(sample => {
          const sampleResult = results.find(r => r.sample_id === sample.id && r.approval_status === 'approved');
          return {
            'رقم الإجراء': proc.internal_procedure_number,
            'اسم العميل': proc.client_name,
            'تاريخ الاستلام': proc.reception_date,
            'بلد المنشأ': proc.country_port || '-',
            'مكان ورود العينة': proc.sample_origin || '-',
            'رقم العينة': sample.sample_number || '-',
            'القسم': sectionLabels[sample.department as keyof typeof sectionLabels] || sample.department,
            'الفحص المطلوب': sample.requested_test,
            'نوع العينة': sample.sample_type,
            'نوع الحيوان': sample.animal_type,
            'عدد العينات': sample.sample_count,
            'حالة الفحص': sampleResult ? 'تم الفحص' : 'لم يفحص بعد',
            'طريقة الاختبار': sampleResult?.test_method || '-',
            'النتيجة': sampleResult ? (
              // منطق تحديد النتيجة بناءً على المعايير الجديدة
              sampleResult.test_result === 'vaccination_efficacy' || sampleResult.test_result === 'كفاءة تحصين' ?
                'كفاءة تحصين' :
              sampleResult.test_result === 'إيجابي بعد التأكيد' ? 'إيجابي بعد التأكيد' :
              sampleResult.test_result === 'سلبي بعد التأكيد' ? 'سلبي بعد التأكيد' :
              sampleResult.confirmatory_test?.test_type && sampleResult.confirmatory_test?.test_type !== '' ?
                (sampleResult.confirmatory_test.positive_samples === 0 ? 'سلبي بعد التأكيد' :
                 sampleResult.confirmatory_test.positive_samples > 0 ? 'إيجابي بعد التأكيد' : 'سلبي بعد التأكيد') :
              sampleResult.positive_samples === 0 ? 'سلبي' :
              sampleResult.positive_samples > 0 ? 'إيجابي' :
              sampleResult.test_result === 'positive' ? 'إيجابي' :
              sampleResult.test_result === 'negative' ? 'سلبي' :
              'سلبي'
            ) : '-',
            'العينات الإيجابية': sampleResult?.positive_samples || 0,
            'الأخصائيين': sampleResult?.specialists?.join(', ') || '-',
            'تاريخ الفحص': sampleResult?.test_date || '-',
            'نوع الفحص التأكيدي': sampleResult?.confirmatory_test?.test_type || '-',
            'عدد العينات الإيجابية بعد التأكيد': sampleResult?.confirmatory_test?.positive_samples || 0,
            'ملاحظات العينة': sample.notes || '-',
            'ملاحظات النتيجة': sampleResult?.notes || '-',
            // إضافة البيانات الخام للفلترة
            _sampleResult: sampleResult
          };
        });
      }).flat();

      // Apply filters
      data = allData.filter(item => {
        const sampleResult = item._sampleResult;
        let matches = true;

        // Date range filter
        if (filters.startDate || filters.endDate) {
          const itemDate = new Date(item['تاريخ الاستلام']);
          const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
          const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');
          matches = matches && itemDate >= start && itemDate <= end;
        }

        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          matches = matches && (
            item['رقم الإجراء'].toLowerCase().includes(searchLower) ||
            item['اسم العميل'].toLowerCase().includes(searchLower) ||
            item['بلد المنشأ'].toLowerCase().includes(searchLower) ||
            item['الفحص المطلوب'].toLowerCase().includes(searchLower) ||
            item['نوع العينة'].toLowerCase().includes(searchLower) ||
            item['نوع الحيوان'].toLowerCase().includes(searchLower)
          );
        }

        // Section filter
        if (filters.section) {
          matches = matches && item['القسم'] === (sectionLabels[filters.section as keyof typeof sectionLabels] || filters.section);
        }

        // Specialist filter
        if (filters.specialist) {
          matches = matches && item['الأخصائيين'].toLowerCase().includes(filters.specialist.toLowerCase());
        }

        // Requested test filter
        if (filters.requestedTest) {
          matches = matches && (item['الفحص المطلوب'] ?? '').toLowerCase().includes(filters.requestedTest.toLowerCase());
        }

        // Animal type filter
        if (filters.animalType) {
          matches = matches && item['نوع الحيوان'].toLowerCase().includes(filters.animalType.toLowerCase());
        }

        // Country/Port filter
        if (filters.countryPort) {
          matches = matches && (item['بلد المنشأ'] ?? '').toLowerCase().includes(filters.countryPort.toLowerCase());
        }

        // Sample source filter
        if (filters.sampleSource) {
          matches = matches && (item['مكان ورود العينة'] ?? '').toLowerCase().includes(filters.sampleSource.toLowerCase());
        }

        // Test method filter
        if (filters.testType) {
          matches = matches && (item['طريقة الاختبار'] ?? '').toLowerCase().includes(filters.testType.toLowerCase());
        }

        // Confirmatory test type filter
        if (filters.confirmatoryTestType) {
          matches = matches && (item['نوع الفحص التأكيدي'] ?? '').toLowerCase().includes(filters.confirmatoryTestType.toLowerCase());
        }

        // Test status filter - based on actual test results
        if (filters.testStatus) {
          if (filters.testStatus === 'tested') {
            matches = matches && sampleResult;
          } else if (filters.testStatus === 'not_tested') {
            matches = matches && !sampleResult;
          } else if (filters.testStatus === 'positive') {
            matches = matches && sampleResult && sampleResult.test_result === 'positive';
          } else if (filters.testStatus === 'negative') {
            matches = matches && sampleResult && sampleResult.test_result === 'negative';
          } else if (filters.testStatus === 'vaccination_efficacy_test') {
            matches = matches && sampleResult && sampleResult.test_result === 'vaccination_efficacy';
          }
        }

        // Sample result filter
        if (filters.sampleResult) {
          if (filters.sampleResult === 'إيجابي') {
            matches = matches && sampleResult &&
              (sampleResult.test_result === 'positive' ||
               (sampleResult.positive_samples > 0 && !sampleResult.confirmatory_test?.test_type &&
                sampleResult.test_result !== 'vaccination_efficacy' && sampleResult.test_result !== 'كفاءة تحصين'));
          } else if (filters.sampleResult === 'سلبي') {
            matches = matches && sampleResult &&
              (sampleResult.test_result === 'negative' ||
               (sampleResult.positive_samples === 0 && !sampleResult.confirmatory_test?.test_type &&
                sampleResult.test_result !== 'vaccination_efficacy' && sampleResult.test_result !== 'كفاءة تحصين'));
          } else if (filters.sampleResult === 'إيجابي بعد التأكيد') {
            matches = matches && sampleResult &&
              (sampleResult.test_result === 'إيجابي بعد التأكيد' ||
               (sampleResult.confirmatory_test?.test_type && sampleResult.confirmatory_test.positive_samples > 0));
          } else if (filters.sampleResult === 'سلبي بعد التأكيد') {
            matches = matches && sampleResult &&
              (sampleResult.test_result === 'سلبي بعد التأكيد' ||
               (sampleResult.confirmatory_test?.test_type && sampleResult.confirmatory_test.positive_samples === 0));
          } else if (filters.sampleResult === 'كفاءة تحصين') {
            matches = matches && sampleResult &&
              (sampleResult.test_result === 'vaccination_efficacy' || sampleResult.test_result === 'كفاءة تحصين');
          } else {
            matches = matches && item['النتيجة'].toLowerCase().includes(filters.sampleResult.toLowerCase());
          }
        }

        return matches;
      });

      // إزالة البيانات الخام قبل العرض
      data = data.map(item => {
        const { _sampleResult, ...cleanItem } = item;
        return cleanItem;
      });
    } else if (activeReportType === 'inventory') {
      title = 'تقرير المخزون';
      
      // Get inventory withdrawals data - each withdrawal as separate row
      data = [];
      
      // Helper function to get item status
      const getItemStatus = (item: any) => {
        if (item.quantity === 0) return 'غير متوفر';
        if (item.quantity <= 5) return 'كمية قليلة';
        return 'متوفر';
      };

      // Helper function to get expiry status
      const getExpiryStatus = (item: any) => {
        if (!item.expiry_date) return 'no_expiry';
        const expiryDate = new Date(item.expiry_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        if (expiryDate < today) return 'expired';
        if (expiryDate <= thirtyDaysFromNow) return 'expiring_soon';
        return 'valid';
      };

      // Helper function to calculate initial quantity
      const getInitialQuantity = (item: any) => {
        const totalWithdrawals = transactions
          .filter(t => t.item_id === item.id && t.type === 'withdrawal')
          .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
        return item.quantity + totalWithdrawals;
      };

      // Generate data based on report type
      if (filters.reportType === 'withdrawals_only') {
        // Show only withdrawals
        transactions.filter(t => t.type === 'withdrawal').forEach(withdrawal => {
          const item = items.find(i => i.id === withdrawal.item_id);
          if (item) {
            const initialQty = getInitialQuantity(item);
            data.push({
              'اسم الصنف': item.name,
              'الكمية الأولية': initialQty,
              'الكمية المصروفة': Math.abs(withdrawal.quantity),
              'الكمية المتوفرة': item.quantity,
              'الأخصائي': withdrawal.specialist_name || 'غير محدد',
              'تاريخ الصرف': withdrawal.transaction_date,
              'النوع': typeLabels[item.type],
              'الوحدة': unitLabels[item.unit],
              'الحجم': item.size || '-',
              'القسم': sectionLabels[item.section],
              'تاريخ الإدخال': item.entry_date,
              'تاريخ الانتهاء': item.expiry_date || '-',
              'الرقم التسلسلي': item.serial_number || '-',
              'رقم التشغيلة': item.batch_number || '-',
              'الحالة': getItemStatus(item)
            });
          }
        });
      } else {
        // Show items with or without withdrawals
        items.forEach(item => {
          const itemWithdrawals = transactions.filter(t => t.item_id === item.id && t.type === 'withdrawal');
          const initialQty = getInitialQuantity(item);

          if (filters.reportType === 'with_withdrawals' && itemWithdrawals.length === 0) {
            return; // Skip items without withdrawals
          }

          if (filters.reportType === 'without_withdrawals' && itemWithdrawals.length > 0) {
            return; // Skip items with withdrawals
          }

          if (itemWithdrawals.length > 0) {
            // Add each withdrawal as separate row
            itemWithdrawals.forEach(withdrawal => {
              data.push({
                'اسم الصنف': item.name,
                'الكمية الأولية': initialQty,
                'الكمية المصروفة': Math.abs(withdrawal.quantity),
                'الكمية المتوفرة': item.quantity,
                'الأخصائي': withdrawal.specialist_name || 'غير محدد',
                'تاريخ الصرف': withdrawal.transaction_date,
                'النوع': typeLabels[item.type],
                'الوحدة': unitLabels[item.unit],
                'الحجم': item.size || '-',
                'القسم': sectionLabels[item.section],
                'تاريخ الإدخال': item.entry_date,
                'تاريخ الانتهاء': item.expiry_date || '-',
                'الرقم التسلسلي': item.serial_number || '-',
                'رقم التشغيلة': item.batch_number || '-',
                'الحالة': getItemStatus(item)
              });
            });
          } else {
            // Add item without withdrawals
            data.push({
              'اسم الصنف': item.name,
              'الكمية الأولية': initialQty,
              'الكمية المصروفة': 0,
              'الكمية المتوفرة': item.quantity,
              'الأخصائي': 'لا يوجد صرف',
              'تاريخ الصرف': '-',
              'النوع': typeLabels[item.type],
              'الوحدة': unitLabels[item.unit],
              'الحجم': item.size || '-',
              'القسم': sectionLabels[item.section],
              'تاريخ الإدخال': item.entry_date,
              'تاريخ الانتهاء': item.expiry_date || '-',
              'الرقم التسلسلي': item.serial_number || '-',
              'رقم التشغيلة': item.batch_number || '-',
              'الحالة': getItemStatus(item)
            });
          }
        });
      }

      // Apply filters
      data = data.filter(item => {
        let matches = true;

        // Date range filter
        if (filters.startDate || filters.endDate) {
          const itemDate = new Date(item['تاريخ الإدخال']);
          const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
          const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');
          matches = matches && itemDate >= start && itemDate <= end;
        }

        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          matches = matches && (
            item['اسم الصنف'].toLowerCase().includes(searchLower) ||
            item['النوع'].toLowerCase().includes(searchLower) ||
            item['القسم'].toLowerCase().includes(searchLower)
          );
        }

        // Section filter
        if (filters.section) {
          matches = matches && item['القسم'] === (sectionLabels[filters.section as keyof typeof sectionLabels] || filters.section);
        }

        // Item type filter
        if (filters.itemType && filters.itemType !== 'all') {
          matches = matches && item['النوع'] === typeLabels[filters.itemType as keyof typeof typeLabels];
        }

        // Unit filter
        if (filters.unit) {
          matches = matches && item['الوحدة'] === unitLabels[filters.unit as keyof typeof unitLabels];
        }

        // Specialist filter
        if (filters.specialist) {
          matches = matches && (item['الأخصائي'] ?? '').toLowerCase().includes(filters.specialist.toLowerCase());
        }

        // Stock status filter
        if (filters.stockStatus) {
          const itemStatus = getItemStatus({ quantity: item['الكمية المتوفرة'] });
          if (filters.stockStatus === 'available' && itemStatus !== 'متوفر') matches = false;
          if (filters.stockStatus === 'low' && itemStatus !== 'كمية قليلة') matches = false;
          if (filters.stockStatus === 'out_of_stock' && itemStatus !== 'غير متوفر') matches = false;
        }

        // Size filter
        if (filters.size) {
          matches = matches && item['الحجم'].toLowerCase().includes(filters.size.toLowerCase());
        }

        // Batch number filter
        if (filters.batchNumber) {
          matches = matches && item['رقم التشغيلة'].toLowerCase().includes(filters.batchNumber.toLowerCase());
        }

        // Serial number filter
        if (filters.serialNumber) {
          matches = matches && item['الرقم التسلسلي'].toLowerCase().includes(filters.serialNumber.toLowerCase());
        }

        // Expiry status filter
        if (filters.expiryStatus) {
          const expiryDate = item['تاريخ الانتهاء'];
          if (filters.expiryStatus === 'no_expiry' && expiryDate !== '-') matches = false;
          if (filters.expiryStatus === 'valid' && expiryDate === '-') matches = false;
          if (filters.expiryStatus === 'expired' || filters.expiryStatus === 'expiring_soon') {
            if (expiryDate === '-') matches = false;
            else {
              const expiry = new Date(expiryDate);
              const today = new Date();
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(today.getDate() + 30);
              
              if (filters.expiryStatus === 'expired' && expiry >= today) matches = false;
              if (filters.expiryStatus === 'expiring_soon' && (expiry < today || expiry > thirtyDaysFromNow)) matches = false;
            }
          }
        }

        return matches;
      });
    } else if (activeReportType === 'employees') {
      title = 'تقرير الموظفين';

      // Get all specialists who have performed tests and count actual samples
      const specialistStats = new Map<string, number>();

      results.forEach(result => {
        if (result.specialists && result.specialists.length > 0) {
          // Get the sample to find sample_count
          const sample = procedures
            .flatMap(p => p.samples || [])
            .find(s => s.id === result.sample_id);

          const sampleCount = sample?.sample_count || 1;

          result.specialists.forEach((specialist: string) => {
            if (!specialistStats.has(specialist)) {
              specialistStats.set(specialist, 0);
            }
            specialistStats.set(specialist, specialistStats.get(specialist)! + sampleCount);
          });
        }
      });

      // Convert to array
      data = Array.from(specialistStats.entries()).map(([name, count]) => ({
        'اسم الموظف': name,
        'عدد العينات': count,
      }));

      // Apply filters
      data = data.filter(item => {
        let matches = true;

        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          matches = matches && item['اسم الموظف'].toLowerCase().includes(searchLower);
        }

        // Date range filter - filter based on test dates
        if (filters.startDate || filters.endDate) {
          const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
          const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');

          // Count samples within date range for this specialist
          const samplesInRange = results
            .filter(result => {
              if (!result.specialists?.includes(item['اسم الموظف'])) return false;
              const testDate = new Date(result.test_date);
              return testDate >= start && testDate <= end;
            })
            .reduce((total, result) => {
              const sample = procedures
                .flatMap(p => p.samples || [])
                .find(s => s.id === result.sample_id);
              return total + (sample?.sample_count || 1);
            }, 0);

          // Update count to reflect filtered date range
          if (samplesInRange === 0) {
            matches = false;
          } else {
            item['عدد العينات'] = samplesInRange;
          }
        }

        return matches;
      });

      // Sort by test count descending
      data.sort((a, b) => b['عدد العينات'] - a['عدد العينات']);
    }

    setPreviewData(data);
    setReportTitle(title);
    return data;
  };

  const handlePreview = () => {
    const data = generateFilteredData();
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
      const worksheet = XLSX.utils.json_to_sheet(previewData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle);

      const fileName = `${reportTitle}_${getSaudiDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('خطأ في تصدير التقرير');
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

    const hasConfirmatoryTests = previewData.some(row =>
      row['نوع الفحص التأكيدي'] &&
      row['نوع الفحص التأكيدي'] !== '-' &&
      row['نوع الفحص التأكيدي'] !== '' &&
      row['نوع الفحص التأكيدي'] !== null
    );

    const filteredColumns = columns.filter(column => {
      if (!hasConfirmatoryTests && (
        column === 'نوع الفحص التأكيدي' ||
        column === 'عدد العينات الإيجابية بعد التأكيد'
      )) {
        return false;
      }
      return true;
    });

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportTitle}</title>
        ${getCommonPrintStyles()}
        <style>
          .filters-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            font-size: 10pt;
          }
          .filters-section > div {
            padding: 8px;
            background: white;
            border: 1px solid #f3f4f6;
            border-radius: 6px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          }
          .filters-section strong {
            color: #047857;
            font-weight: 700;
            margin-left: 6px;
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
                <span class="info-value">${new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">وقت الإنشاء:</span>
                <span class="info-value">${new Date().toLocaleTimeString('en-GB')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">عدد السجلات:</span>
                <span class="info-value">${previewData.length}</span>
              </div>
            </div>
          </div>

          ${filters.startDate || filters.endDate || filters.searchTerm || filters.section ? `
            <div class="section">
              <div class="section-title">الفلاتر المطبقة</div>
              <div class="filters-section">
                ${filters.startDate ? `<div><strong>من تاريخ:</strong> ${filters.startDate}</div>` : ''}
                ${filters.endDate ? `<div><strong>إلى تاريخ:</strong> ${filters.endDate}</div>` : ''}
                ${filters.searchTerm ? `<div><strong>البحث:</strong> ${filters.searchTerm}</div>` : ''}
                ${filters.section ? `<div><strong>القسم:</strong> ${sectionLabels[filters.section as keyof typeof sectionLabels]}</div>` : ''}
                ${filters.requestedTest ? `<div><strong>الفحص المطلوب:</strong> ${filters.requestedTest}</div>` : ''}
                ${filters.testType ? `<div><strong>طريقة الاختبار:</strong> ${filters.testType}</div>` : ''}
                ${filters.testStatus ? `<div><strong>حالة الفحص:</strong> ${
                  filters.testStatus === 'tested' ? 'تم الفحص' :
                  filters.testStatus === 'not_tested' ? 'لم تفحص بعد' : ''
                }</div>` : ''}
              </div>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">بيانات التقرير</div>
            <table>
              <thead>
                <tr>
                  ${filteredColumns.map(column => `<th>${column}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${previewData.map(row => `
                  <tr>
                    ${filteredColumns.map(column => `<td>${row[column] || '-'}</td>`).join('')}
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


  if (!auth || !auth.hasPermission('view_reports')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-4">
            عذراً، التقارير متاحة فقط لـ:
          </p>
          <ul className="text-right list-disc list-inside text-gray-700 space-y-2 mb-6">
            <li>مدير البرنامج</li>
            <li>مدير المختبر</li>
            <li>مشرف القسم</li>
          </ul>
          <p className="text-sm text-gray-500">
            يرجى التواصل مع المسؤول إذا كنت بحاجة إلى الوصول إلى التقارير
          </p>
        </div>
      </div>
    );
  }

  if (proceduresLoading || resultsLoading || inventoryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-600 mx-auto mb-4"></div>
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
            subtitle="عرض وتصدير التقارير الإحصائية والتحليلية"
          />

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => {
              setActiveReportType('samples');
              setShowPreview(false);
              setPreviewData([]);
            }}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
              activeReportType === 'samples'
                ? 'border-secondary-500 bg-secondary-50'
                : 'border-gray-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">تقارير العينات والنتائج</h3>
                <p className="text-sm text-gray-600">الإجراءات والعينات والفحوصات والنتائج</p>
              </div>
              <TestTube2 className="w-8 h-8 text-secondary-600" />
            </div>
          </button>

          <button
            onClick={() => {
              setActiveReportType('inventory');
              setShowPreview(false);
              setPreviewData([]);
            }}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
              activeReportType === 'inventory'
                ? 'border-secondary-500 bg-secondary-50'
                : 'border-gray-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">تقارير المخزون</h3>
                <p className="text-sm text-gray-600">الاصناف والكميات والمصروفات</p>
              </div>
              <Package className="w-8 h-8 text-secondary-600" />
            </div>
          </button>

          <button
            onClick={() => {
              setActiveReportType('employees');
              setShowPreview(false);
              setPreviewData([]);
            }}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-right ${
              activeReportType === 'employees'
                ? 'border-secondary-500 bg-secondary-50'
                : 'border-gray-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">تقارير الموظفين</h3>
                <p className="text-sm text-gray-600">إحصائيات أداء الموظفين والفحوصات</p>
              </div>
              <Users className="w-8 h-8 text-secondary-600" />
            </div>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">فلاتر التقرير</h3>
            <Filter className="w-5 h-5 text-gray-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
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

            {/* Search Term - Hidden for employees report */}
            {activeReportType !== 'employees' && (
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="البحث..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    className="w-full pl-4 pr-10 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  />
                </div>
              </div>
            )}

            {/* Section Filter - Hidden for employees report */}
            {activeReportType !== 'employees' && (
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                {showCustomSection ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اكتب اسم القسم..."
                      value={filters.section}
                      onChange={(e) => setFilters({...filters, section: e.target.value})}
                      className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomSection(false);
                        setFilters({...filters, section: ''});
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={filters.section}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'أخرى') {
                        setShowCustomSection(true);
                        setFilters({...filters, section: ''});
                      } else {
                        setFilters({...filters, section: value});
                      }
                    }}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الأقسام</option>
                    {Object.keys(sectionLabels).map(section => (
                      <option key={section} value={section}>{sectionLabels[section as keyof typeof sectionLabels]}</option>
                    ))}
                    <option value="أخرى">أخرى</option>
                  </select>
                )}
              </div>
            )}

            {/* Conditional Filters based on Report Type */}
            {activeReportType === 'employees' ? (
              <>
                <div className="text-right col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم الموظف</label>
                  {showCustomEmployee ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اسم الموظف..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomEmployee(false);
                          setFilters({...filters, searchTerm: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.searchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomEmployee(true);
                          setFilters({...filters, searchTerm: ''});
                        } else {
                          setFilters({...filters, searchTerm: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الموظفين</option>
                      {specialists.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            ) : activeReportType === 'samples' ? (
              <>
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحيوان</label>
                  {showCustomAnimalType ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="نوع الحيوان..."
                        value={filters.animalType}
                        onChange={(e) => setFilters({...filters, animalType: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">بلد المنشأ</label>
                  {showCustomCountryPort ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="البلد أو الميناء..."
                        value={filters.countryPort}
                        onChange={(e) => setFilters({...filters, countryPort: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomCountryPort(false);
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
                          setShowCustomCountryPort(true);
                          setFilters({...filters, countryPort: ''});
                        } else {
                          setFilters({...filters, countryPort: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع البلدان/الموانئ</option>
                      {countryPortOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">مكان ورود العينة</label>
                  {showCustomSampleSource ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="مكان ورود العينة..."
                        value={filters.sampleSource}
                        onChange={(e) => setFilters({...filters, sampleSource: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSampleSource(false);
                          setFilters({...filters, sampleSource: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.sampleSource}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomSampleSource(true);
                          setFilters({...filters, sampleSource: ''});
                        } else {
                          setFilters({...filters, sampleSource: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الأماكن</option>
                      {sampleOriginOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الاختبار</label>
                  {showCustomTestMethod ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="طريقة الاختبار..."
                        value={filters.testType}
                        onChange={(e) => setFilters({...filters, testType: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomTestMethod(false);
                          setFilters({...filters, testType: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.testType}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomTestMethod(true);
                          setFilters({...filters, testType: ''});
                        } else {
                          setFilters({...filters, testType: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع طرق الاختبار</option>
                      {testMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الاختبار التأكيدي</label>
                  {showCustomConfirmatoryTestMethod ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="طريقة الاختبار التأكيدي..."
                        value={filters.confirmatoryTestType}
                        onChange={(e) => setFilters({...filters, confirmatoryTestType: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomConfirmatoryTestMethod(false);
                          setFilters({...filters, confirmatoryTestType: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.confirmatoryTestType}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomConfirmatoryTestMethod(true);
                          setFilters({...filters, confirmatoryTestType: ''});
                        } else {
                          setFilters({...filters, confirmatoryTestType: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع طرق الاختبار التأكيدي</option>
                      {testMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفحص المطلوب</label>
                  {showCustomRequestedTest ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="الفحص المطلوب..."
                        value={filters.requestedTest}
                        onChange={(e) => setFilters({...filters, requestedTest: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomRequestedTest(false);
                          setFilters({...filters, requestedTest: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.requestedTest}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomRequestedTest(true);
                          setFilters({...filters, requestedTest: ''});
                        } else {
                          setFilters({...filters, requestedTest: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الفحوصات</option>
                      {allRequiredTests.map(test => (
                        <option key={test} value={test}>{test}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالة الفحص</label>
                  <select
                    value={filters.testStatus}
                    onChange={(e) => setFilters({...filters, testStatus: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="tested">تم الفحص</option>
                    <option value="not_tested">لم تفحص بعد</option>
                  </select>
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">نتيجة العينة</label>
                  {showCustomSampleResult ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب النتيجة..."
                        value={filters.sampleResult}
                        onChange={(e) => setFilters({...filters, sampleResult: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSampleResult(false);
                          setFilters({...filters, sampleResult: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.sampleResult}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomSampleResult(true);
                          setFilters({...filters, sampleResult: ''});
                        } else {
                          setFilters({...filters, sampleResult: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع النتائج</option>
                      <option value="إيجابي">إيجابي</option>
                      <option value="سلبي">سلبي</option>
                      <option value="إيجابي بعد التأكيد">إيجابي بعد التأكيد</option>
                      <option value="سلبي بعد التأكيد">سلبي بعد التأكيد</option>
                      <option value="كفاءة تحصين">كفاءة تحصين</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الأخصائي</label>
                  {showCustomSpecialist ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اسم الأخصائي..."
                        value={filters.specialist}
                        onChange={(e) => setFilters({...filters, specialist: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSpecialist(false);
                          setFilters({...filters, specialist: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.specialist}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomSpecialist(true);
                          setFilters({...filters, specialist: ''});
                        } else {
                          setFilters({...filters, specialist: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الأخصائيين</option>
                      {specialists.map(specialist => (
                        <option key={specialist} value={specialist}>{specialist}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الصنف</label>
                  {showCustomItemType ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب نوع الصنف..."
                        value={filters.itemType}
                        onChange={(e) => setFilters({...filters, itemType: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomItemType(false);
                          setFilters({...filters, itemType: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.itemType}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomItemType(true);
                          setFilters({...filters, itemType: ''});
                        } else {
                          setFilters({...filters, itemType: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الأنواع</option>
                      {Object.keys(typeLabels).map(type => (
                        <option key={type} value={type}>{typeLabels[type as keyof typeof typeLabels]}</option>
                      ))}
                      <option value="أخرى">أخرى</option>
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة</label>
                  {showCustomUnit ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب الوحدة..."
                        value={filters.unit}
                        onChange={(e) => setFilters({...filters, unit: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomUnit(false);
                          setFilters({...filters, unit: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.unit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomUnit(true);
                          setFilters({...filters, unit: ''});
                        } else {
                          setFilters({...filters, unit: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الوحدات</option>
                      {Object.keys(unitLabels).map(unit => (
                        <option key={unit} value={unit}>{unitLabels[unit as keyof typeof unitLabels]}</option>
                      ))}
                      <option value="أخرى">أخرى</option>
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الأخصائي</label>
                  {showCustomSpecialist ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اسم الأخصائي..."
                        value={filters.specialist}
                        onChange={(e) => setFilters({...filters, specialist: e.target.value})}
                        className="w-full px-3 h-[50px] border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-secondary-400 text-right bg-secondary-50 pr-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSpecialist(false);
                          setFilters({...filters, specialist: ''});
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={filters.specialist}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'أخرى') {
                          setShowCustomSpecialist(true);
                          setFilters({...filters, specialist: ''});
                        } else {
                          setFilters({...filters, specialist: value});
                        }
                      }}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">جميع الأخصائيين</option>
                      {specialists.map(specialist => (
                        <option key={specialist} value={specialist}>{specialist}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالة المخزون</label>
                  <select
                    value={filters.stockStatus}
                    onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="available">متوفر</option>
                    <option value="low">كمية قليلة</option>
                    <option value="out_of_stock">غير متوفر</option>
                  </select>
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحجم</label>
                  <input
                    type="text"
                    placeholder="الحجم..."
                    value={filters.size}
                    onChange={(e) => setFilters({...filters, size: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم التشغيلة</label>
                  <input
                    type="text"
                    placeholder="رقم التشغيلة..."
                    value={filters.batchNumber}
                    onChange={(e) => setFilters({...filters, batchNumber: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الرقم التسلسلي</label>
                  <input
                    type="text"
                    placeholder="الرقم التسلسلي..."
                    value={filters.serialNumber}
                    onChange={(e) => setFilters({...filters, serialNumber: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالة الصلاحية</label>
                  <select
                    value={filters.expiryStatus}
                    onChange={(e) => setFilters({...filters, expiryStatus: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="valid">صالح</option>
                    <option value="expiring_soon">ينتهي قريباً</option>
                    <option value="expired">منتهي الصلاحية</option>
                    <option value="no_expiry">بدون تاريخ انتهاء</option>
                  </select>
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع التقرير</label>
                  <select
                    value={filters.reportType}
                    onChange={(e) => setFilters({...filters, reportType: e.target.value})}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="all">جميع الأصناف</option>
                    <option value="with_withdrawals">الأصناف التي تم صرفها</option>
                    <option value="without_withdrawals">الأصناف بدون صرف</option>
                    <option value="withdrawals_only">المصروفات فقط</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mt-4">
            <button
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  searchTerm: '',
                  section: '',
                  animalType: '',
                  countryPort: '',
                  sampleSource: '',
                  testType: '',
                  confirmatoryTestType: '',
                  requestedTest: '',
                  resultType: '',
                  itemType: '',
                  unit: '',
                  stockStatus: '',
                  size: '',
                  batchNumber: '',
                  serialNumber: '',
                  expiryStatus: '',
                  reportType: 'all',
                  specialist: '',
                  testStatus: '',
                  sampleResult: ''
                });
                setShowCustomAnimalType(false);
                setShowCustomCountryPort(false);
                setShowCustomSampleSource(false);
                setShowCustomTestMethod(false);
                setShowCustomConfirmatoryTestMethod(false);
                setShowCustomSpecialist(false);
                setShowCustomRequestedTest(false);
                setShowCustomEmployee(false);
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
              className="bg-secondary-600 text-white px-6 py-2 rounded-lg hover:bg-secondary-700 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              معاينة التقرير
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        {previewData.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={() => {
                const data = generateFilteredData();
                if (data.length === 0) {
                  toast.error('لا توجد بيانات تطابق الفلاتر المحددة');
                  return;
                }
                exportToExcel();
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير Excel
            </button>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && previewData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">معاينة التقرير - {reportTitle}</h3>
              <span className="text-sm text-gray-600">{previewData.length} سجل</span>
            </div>

            <div className="overflow-x-auto max-w-full">
              {(() => {
                const hasConfirmatoryTests = previewData.some(row => 
                  row['نوع الفحص التأكيدي'] && 
                  row['نوع الفحص التأكيدي'] !== '-' && 
                  row['نوع الفحص التأكيدي'] !== '' &&
                  row['نوع الفحص التأكيدي'] !== null
                );
                const filteredColumns = Object.keys(previewData[0]).filter(column => {
                  if (!hasConfirmatoryTests && (
                    column === 'نوع الفحص التأكيدي' || 
                    column === 'عدد العينات الإيجابية بعد التأكيد'
                  )) {
                    return false;
                  }
                  return true;
                });
                
                return (
                  <table className="min-w-full border-collapse border border-gray-200 bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        {filteredColumns.map((column, index) => (
                          <th key={index} className="border border-gray-200 px-4 py-3 text-right font-semibold text-sm whitespace-nowrap">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {filteredColumns.map((column, colIndex) => (
                            <td key={colIndex} className="border border-gray-200 px-4 py-3 text-right text-sm whitespace-nowrap">
                              {row[column] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
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