import { useState, useEffect, useRef } from 'react';
import {
  TestTube2,
  ClipboardList,
  FileText,
  Package,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  Activity,
  Award,
  ArrowRight,
  Calculator,
  Sparkles,
  Stethoscope,
  Printer,
  Copy,
  Check,
  FileCheck,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useInventory } from '../../../hooks/useInventory';
import { useAuth } from '../../../hooks/useAuth';
// import { useTransactionProgress } from '../../../hooks/useTransactionProgress';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';
import { localDB } from '../../../lib/localDatabase';
import { getUpdatedAlertsCount, getDeletedAlertsCount, getNewAlertsCount } from '../../../lib/vetAlerts';

// مكون العداد المتحرك
function AnimatedCounter({ value, duration = 2000, color }: { value: number; duration?: number; color?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const endValue = value;

          const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * endValue));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(endValue);
            }
          };

          animate();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <div ref={elementRef} className="text-5xl font-extrabold" style={{ fontFamily: 'SST Arabic', color: color }}>
      {count.toLocaleString('ar-SA')}
    </div>
  );
}

// مكون الدائرة التقدمية
function CircularProgress({ percentage, size = 120, strokeWidth = 8, color = '#10b981' }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<SVGSVGElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const duration = 1500;

          const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            setProgress(easeOutCubic * percentage);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setProgress(percentage);
            }
          };

          animate();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [percentage, hasAnimated]);

  return (
    <svg
      ref={elementRef}
      width={size}
      height={size}
      className="transform -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-gray-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-2xl font-bold transform rotate-90"
        style={{ transformOrigin: 'center' }}
        fill={color}
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

// مكون الرسم البياني الصغير
function MiniBarChart({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const [visible, setVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const maxValue = Math.max(...data, 1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={elementRef} className="flex items-end gap-1 h-12">
      {data.map((value, index) => {
        const height = (value / maxValue) * 100;
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all duration-500 ease-out"
            style={{
              backgroundColor: color,
              height: visible ? `${height}%` : '0%',
              transitionDelay: `${index * 50}ms`,
              opacity: visible ? 0.7 + (value / maxValue) * 0.3 : 0
            }}
          />
        );
      })}
    </div>
  );
}

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export default function Home({ setActiveTab }: HomeProps) {
  const auth = useAuth();
  const { procedures, loading: proceduresLoading } = useProcedures();
  const { results, loading: resultsLoading } = useTestResults();
  const { items, loading: inventoryLoading } = useInventory();
  // TODO: إضافة نظام التتبع الجديد
  // const { getStatistics, syncFromDatabases } = useTransactionProgress();

  const [stats, setStats] = useState({
    totalSamples: 0,
    positiveSamples: 0,
    confirmatoryPositiveSamples: 0,
    totalProcedures: 0,
    lowStockItems: 0,
    completedTests: 0,
    completedProcedures: 0,
    todaySamples: 0,
    todayPositiveSamples: 0,
    todayProcedures: 0
  });

  const [, ] = useState({
    total: 0,
    completed: 0,
    in_review: 0,
    incomplete: 0,
    averagePercentage: 0
  });

  const [incompleteLabProcedures, setIncompleteLabProcedures] = useState<any[]>([]);
  const [hasUnenteredResults, setHasUnenteredResults] = useState(false);
  const [hasPendingApprovals, setHasPendingApprovals] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatedAlertsCount, setUpdatedAlertsCount] = useState(0);
  const [deletedAlertsCount, setDeletedAlertsCount] = useState(0);
  const [newAlertsCount, setNewAlertsCount] = useState(0);

  const handleCopyProcedureNumber = (procedureNumber: string, id: string) => {
    navigator.clipboard.writeText(procedureNumber).then(() => {
      setCopiedId(id);
      showToast.primary('تم نسخ رقم الإجراء');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    const loadData = async () => {
      // TODO: مزامنة وحساب الإحصائيات من نظام التتبع الجديد
      // await syncFromDatabases();
      // const stats = await getStatistics();
      // setProgressStats({
      //   total: stats.total,
      //   completed: stats.completed,
      //   in_review: stats.in_review,
      //   incomplete: stats.incomplete,
      //   averagePercentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      // });
    };
    loadData();
  }, []); // TODO: إضافة الاعتماديات عند إضافة نظام التتبع

  useEffect(() => {
    const updateAlertsCount = () => {
      setUpdatedAlertsCount(getUpdatedAlertsCount());
      setDeletedAlertsCount(getDeletedAlertsCount());
      setNewAlertsCount(getNewAlertsCount());
    };

    updateAlertsCount();
    window.addEventListener('alerts-updated', updateAlertsCount);

    return () => {
      window.removeEventListener('alerts-updated', updateAlertsCount);
    };
  }, []);

  // تحميل الإجراءات المخبرية غير المكتملة
  useEffect(() => {
    const loadIncompleteLabProcedures = async () => {
      try {
        const allSavedSamples = await localDB.getAllSavedSamplesWithSamples();
        const allResults = await localDB.getTestResults();

        // تصفية النتائج المعتمدة فقط
        const approvedResults = allResults.filter(r => r.approval_status === 'approved');

        // تحديد الإجراءات المخبرية التي لم تُسجل وتُعتمد نتائجها
        const incomplete = allSavedSamples.filter(savedSample => {
          if (!savedSample.samples || savedSample.samples.length === 0) return false;

          const sampleIds = savedSample.samples.map(sample => sample.id);
          const procedureResults = approvedResults.filter(result =>
            sampleIds.includes(result.sample_id)
          );

          return procedureResults.length < savedSample.samples.length;
        });

        setIncompleteLabProcedures(incomplete);

        // تحديد: هل توجد عينات بدون نتائج مسجلة؟
        let hasUnentered = false;
        for (const savedSample of allSavedSamples) {
          if (savedSample.samples && savedSample.samples.length > 0) {
            const sampleIds = savedSample.samples.map((sample: any) => sample.id);
            const hasResultsForAllSamples = sampleIds.every((sampleId: string) =>
              allResults.some(result => result.sample_id === sampleId)
            );
            if (!hasResultsForAllSamples) {
              hasUnentered = true;
              break;
            }
          }
        }
        setHasUnenteredResults(hasUnentered);

        // تحديد: هل توجد نتائج منتظرة للاعتماد؟
        const pendingResults = allResults.filter(r => r.approval_status === 'pending');
        setHasPendingApprovals(pendingResults.length > 0);
      } catch (error) {
        console.error('Error loading incomplete lab procedures:', error);
      }
    };

    loadIncompleteLabProcedures();

    // الاستماع لتغييرات النتائج لإعادة تحميل الإجراءات غير المكتملة
    const handleResultsChanged = () => {
      loadIncompleteLabProcedures();
    };

    window.addEventListener('results-data-changed', handleResultsChanged);
    window.addEventListener('results-approved', handleResultsChanged);
    window.addEventListener('test-results-updated', handleResultsChanged);

    return () => {
      window.removeEventListener('results-data-changed', handleResultsChanged);
      window.removeEventListener('results-approved', handleResultsChanged);
      window.removeEventListener('test-results-updated', handleResultsChanged);
    };
  }, [resultsLoading]);

  useEffect(() => {
    if (!proceduresLoading && !resultsLoading && !inventoryLoading) {
      // التأكد من أن البيانات arrays صحيحة
      const safeProcedures = Array.isArray(procedures) ? procedures : [];
      const safeResults = Array.isArray(results) ? results.filter(r => r.approval_status === 'approved') : [];
      const safeItems = Array.isArray(items) ? items : [];

      // حساب إجمالي العينات
      const totalSamples = safeProcedures.reduce((sum, proc) => {
        return sum + (proc.samples?.reduce((sampleSum: number, sample: any) =>
          sampleSum + (sample.sample_count || 0), 0) || 0);
      }, 0);

      // حساب العينات الإيجابية (استثناء العينات من اختبارات كفاءة التحصين)
      // الطريقة الصحيحة:
      // - إذا لم يكن هناك فحص تأكيدي: نأخذ positive_samples
      // - إذا كان هناك فحص تأكيدي: نأخذ فقط confirmatory_test.positive_samples
      let positiveSamples = 0;
      let confirmatoryPositiveSamples = 0;

      safeResults.forEach((result) => {
        // تجاهل اختبارات كفاءة التحصين
        if (result.is_vaccination_efficiency_test || result.test_result === 'كفاءة تحصين') {
          return;
        }

        // إذا كان هناك فحص تأكيدي: نأخذ فقط نتيجة الفحص التأكيدي
        if (result.confirmatory_test) {
          const confirmatoryPositive = parseInt(result.confirmatory_test.positive_samples) || 0;
          positiveSamples += confirmatoryPositive;
          confirmatoryPositiveSamples += confirmatoryPositive;
        }
        // إذا لم يكن هناك فحص تأكيدي: نأخذ النتيجة الأولية
        else {
          const positiveCount = parseInt(result.positive_samples) || 0;
          if (positiveCount > 0) {
            positiveSamples += positiveCount;
          }
        }
      });

      // حساب الأصناف قليلة المخزون
      const lowStockItems = safeItems.filter(item => item.quantity > 0 && item.quantity <= 5).length;

      // حساب الإجراءات المكتملة
      const completedProcedures = safeProcedures.filter(proc => {
        if (!proc.samples || proc.samples.length === 0) return false;
        const sampleIds = proc.samples.map((sample: any) => sample.id);
        const procedureResults = safeResults.filter((result: any) =>
          sampleIds.includes(result.sample_id)
        );
        return procedureResults.length === proc.samples.length;
      }).length;

      // حساب عدد العينات والإجراءات المستلمة خلال 24 ساعة
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let todaySamples = 0;
      let todayProcedures = 0;

      safeProcedures.forEach(proc => {
        const receptionDate = new Date(proc.reception_date);
        if (receptionDate >= twentyFourHoursAgo && receptionDate <= now) {
          todayProcedures++;
          todaySamples += proc.samples?.reduce((sampleSum: number, sample: any) =>
            sampleSum + (sample.sample_count || 0), 0) || 0;
        }
      });

      // حساب عدد العينات الإيجابية خلال 24 ساعة
      let todayPositiveSamples = 0;
      safeResults.forEach((result) => {
        // تجاهل اختبارات كفاءة التحصين
        if (result.is_vaccination_efficiency_test || result.test_result === 'كفاءة تحصين') {
          return;
        }

        // التحقق من أن النتيجة خلال آخر 24 ساعة
        const testDate = new Date(result.test_date);
        if (testDate >= twentyFourHoursAgo && testDate <= now) {
          // إذا كان هناك فحص تأكيدي: نأخذ فقط نتيجة الفحص التأكيدي
          if (result.confirmatory_test) {
            const confirmatoryPositive = parseInt(result.confirmatory_test.positive_samples) || 0;
            todayPositiveSamples += confirmatoryPositive;
          }
          // إذا لم يكن هناك فحص تأكيدي: نأخذ النتيجة الأولية
          else {
            const positiveCount = parseInt(result.positive_samples) || 0;
            todayPositiveSamples += positiveCount;
          }
        }
      });

      setStats({
        totalSamples,
        positiveSamples,
        confirmatoryPositiveSamples,
        totalProcedures: safeProcedures.length,
        lowStockItems,
        completedTests: safeResults.length,
        completedProcedures,
        todaySamples,
        todayPositiveSamples,
        todayProcedures
      });
    }
  }, [procedures, results, items, proceduresLoading, resultsLoading, inventoryLoading]);

  const allShortcuts = [];

  // الاختصارات المتاحة لجميع المستخدمين
  if (auth?.hasPermission('view_all')) {
    allShortcuts.push(
      {
        id: 'reception_lab',
        title: 'استقبال العينات',
        description: 'تسجيل عينات جديدة وإدخال بياناتها',
        icon: TestTube2,
        hexColor: '#831f82'
      },
      {
        id: 'register_procedure_lab',
        title: 'سجل الإجراءات',
        description: 'عرض وإدارة جميع الإجراءات المسجلة',
        icon: ClipboardList,
        hexColor: '#8a4913'
      },
      {
        id: 'veterinary_procedures_lab',
        title: 'إجراءات القسم البيطري',
        description: 'تسجيل وإدارة إجراءات القسم البيطري',
        icon: Stethoscope,
        hexColor: '#f1be8a'
      },
      {
        id: 'results_entry_lab',
        title: 'تسجيل النتائج',
        description: 'إدخال نتائج الفحوصات والاختبارات',
        icon: FileText,
        hexColor: '#ffcc00'
      },
      {
        id: 'print_results_lab',
        title: 'طباعة النتائج',
        description: 'طباعة نتائج الفحوصات والتقارير',
        icon: Printer,
        hexColor: '#f18700'
      },
      {
        id: 'dilution_calculator_lab',
        title: 'حاسبة التخفيفات',
        description: 'حساب تخفيفات المواد والمحاليل المخبرية',
        icon: Calculator,
        hexColor: '#458ac9'
      }
    );
  }

  // اختصار اعتماد النتائج (للمستخدمين الذين لديهم صلاحية اعتماد النتائج)
  if (auth?.hasPermission('approve_results')) {
    allShortcuts.push({
      id: 'results_approval_lab',
      title: 'اعتماد النتائج',
      description: 'مراجعة واعتماد نتائج الفحوصات',
      icon: CheckCircle,
      hexColor: '#22c55e'
    });
  }

  // اختصار المخزون (للمستخدمين الذين لديهم صلاحية الوصول للمخزون)
  if (auth?.hasPermission('withdraw_inventory_item') || auth?.hasPermission('add_inventory_item')) {
    allShortcuts.push({
      id: 'inventory_lab',
      title: 'المخزون',
      description: 'إدارة المواد والأدوات المخبرية',
      icon: Package,
      hexColor: '#61bf69'
    });
  }

  // اختصار التقارير
  if (auth?.hasPermission('view_reports')) {
    allShortcuts.push({
      id: 'reports_lab',
      title: 'التقارير',
      description: 'إنشاء وطباعة التقارير المختلفة',
      icon: BarChart3,
      hexColor: '#008a40'
    });
  }

  // اختصار إدارة المستخدمين
  if (auth?.hasPermission('manage_lab_users')) {
    allShortcuts.push({
      id: 'user_management_lab',
      title: 'إدارة المستخدمين',
      description: 'إضافة وتعديل وإدارة حسابات المستخدمين',
      icon: Users,
      hexColor: '#003361'
    });
  }

  const shortcuts = allShortcuts;

  const statisticsCards = [
    {
      title: 'إجمالي العينات',
      value: stats.totalSamples,
      icon: TestTube2,
      hexColor: '#831f82',
      description: 'العدد الإجمالي للعينات المستلمة'
    },
    {
      title: 'العينات الإيجابية',
      value: stats.positiveSamples,
      icon: AlertCircle,
      hexColor: '#8a4913',
      description: 'العينات التي أظهرت نتائج إيجابية'
    },
    {
      title: 'العينات الإيجابية التأكيدية',
      value: stats.confirmatoryPositiveSamples,
      icon: CheckCircle,
      hexColor: '#f1be8a',
      description: 'العينات الإيجابية في الاختبارات التأكيدية'
    },
    {
      title: 'إجمالي الإجراءات',
      value: stats.totalProcedures,
      icon: ClipboardList,
      hexColor: '#ffcc00',
      description: 'العدد الإجمالي للإجراءات المسجلة'
    },
    {
      title: 'الفحوصات المكتملة',
      value: stats.completedTests,
      icon: Activity,
      hexColor: '#f18700',
      description: 'عدد الفحوصات التي تم إنجازها'
    },
    {
      title: 'أصناف قليلة المخزون',
      value: stats.lowStockItems,
      icon: Package,
      hexColor: '#458ac9',
      description: 'الأصناف التي تحتاج إعادة تموين'
    }
  ];

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
    <div className="min-h-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-[#003361]">
              قسم المختبر بمحجر ميناء جدة الإسلامي
            </h1>
          </div>
          <p className="text-gray-600 text-base mb-2">نظام إدارة المختبرات</p>
          <div className="mb-3">
            <span className="text-sm font-bold" style={{ color: '#61bf69' }}>
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#61bf69' }}>
            مرحباً بك {auth?.user?.name || 'مستخدم النظام'}
          </p>
        </div>

        {/* Vet Alerts Section */}
        {(newAlertsCount > 0 || updatedAlertsCount > 0 || deletedAlertsCount > 0) && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {newAlertsCount > 0 && (
                <button
                  onClick={() => setActiveTab('veterinary_procedures_lab')}
                  className="relative group overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-r-4 border-green-500 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 p-6 transform hover:scale-105"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-green-500 rounded-lg shadow-md animate-pulse">
                        <Bell className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-xl font-bold text-green-900 mb-1 flex items-center justify-end gap-2">
                        <span className="text-base bg-green-500 text-white px-3 py-1 rounded-full">
                          {newAlertsCount}
                        </span>
                        <span>إجراء بيطري جديد</span>
                      </h3>
                      <p className="text-sm text-green-700 leading-relaxed">
                        تم استلام إجراءات جديدة من القسم البيطري
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </button>
              )}

              {updatedAlertsCount > 0 && (
                <button
                  onClick={() => setActiveTab('veterinary_procedures_lab')}
                  className="relative group overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50 border-r-4 border-yellow-500 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 p-6 transform hover:scale-105"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-yellow-500 rounded-lg shadow-md animate-pulse">
                        <Bell className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-xl font-bold text-yellow-900 mb-1 flex items-center justify-end gap-2">
                        <span className="text-base bg-yellow-500 text-white px-3 py-1 rounded-full">
                          {updatedAlertsCount}
                        </span>
                        <span>إجراء بيطري معدل</span>
                      </h3>
                      <p className="text-sm text-yellow-700 leading-relaxed">
                        تم تعديل إجراءات من القسم البيطري
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </button>
              )}

              {deletedAlertsCount > 0 && (
                <button
                  onClick={() => setActiveTab('veterinary_procedures_lab')}
                  className="relative group overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 border-r-4 border-red-500 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 p-6 transform hover:scale-105"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-red-500 rounded-lg shadow-md animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-xl font-bold text-red-900 mb-1 flex items-center justify-end gap-2">
                        <span className="text-base bg-red-500 text-white px-3 py-1 rounded-full">
                          {deletedAlertsCount}
                        </span>
                        <span>إجراء بيطري محذوف</span>
                      </h3>
                      <p className="text-sm text-red-700 leading-relaxed">
                        تم حذف إجراءات من القسم البيطري
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Incomplete Lab Procedures Alert */}
        {incompleteLabProcedures.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-r-4 border-blue-500 rounded-lg shadow-lg p-4 max-w-6xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-500 rounded-lg shadow-md animate-pulse">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-base bg-blue-500 text-white px-3 py-1 rounded-full">
                      {incompleteLabProcedures.length}
                    </span>
                    <span>إجراءات تحتاج إلى تسجيل النتائج</span>
                  </h3>
                  <div className="space-y-2">
                    {incompleteLabProcedures.slice(0, 3).map((savedSample) => {
                      const labProcedureNumber = savedSample.internal_procedure_number;
                      return (
                        <div key={savedSample.id} className="flex items-center gap-2 text-sm text-blue-800">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <span className="font-semibold">الإجراء رقم {labProcedureNumber}</span>
                          <button
                            onClick={() => handleCopyProcedureNumber(labProcedureNumber, savedSample.id)}
                            className="p-1 hover:bg-blue-200 rounded transition-colors group/btn"
                            title="نسخ رقم الإجراء"
                          >
                            {copiedId === savedSample.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-blue-600 group-hover/btn:text-blue-700" />
                            )}
                          </button>
                          <span className="text-blue-600">لم يتم تسجيل واعتماد النتائج بعد</span>
                        </div>
                      );
                    })}
                    {incompleteLabProcedures.length > 3 && (
                      <div className="text-xs text-blue-700 mr-3.5 font-semibold">
                        و {incompleteLabProcedures.length - 3} إجراءات أخرى...
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  {hasUnenteredResults && (
                    <button
                      onClick={() => setActiveTab('results_entry_lab')}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-bold flex items-center gap-2 group"
                    >
                      <TestTube2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>تسجيل النتائج</span>
                    </button>
                  )}
                  {hasPendingApprovals && (
                    <button
                      onClick={() => {
                        if (!auth.hasPermission('approve_results')) {
                          toast.error('ليس لديك الصلاحية لاعتماد النتائج');
                          return;
                        }
                        setActiveTab('results_approval_lab');
                      }}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-bold flex items-center gap-2 group"
                    >
                      <FileCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>اعتماد النتائج</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-lg" style={{ background: '#458ac9' }}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#458ac9' }}>الاختصارات السريعة</h2>
            <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(to left, #458ac9, transparent)' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.id}
                  onClick={() => setActiveTab(shortcut.id)}
                  className="relative group overflow-hidden border-2 border-white/50 rounded-xl p-2.5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1"
                  style={{
                    background: `linear-gradient(to bottom right, ${shortcut.hexColor}20, white)`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2">
                        <ArrowRight className="w-5 h-5 text-gray-700" />
                        <span className="text-xs font-bold text-gray-700">انتقل</span>
                      </div>
                      <div className="p-2.5 rounded-xl shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" style={{ backgroundColor: shortcut.hexColor }}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl font-bold mb-0" style={{ color: '#003361' }}>
                        {shortcut.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-tight">
                        {shortcut.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-lg" style={{ background: '#458ac9' }}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#458ac9' }}>الإحصائيات العامة</h2>
            <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(to left, #458ac9, transparent)' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statisticsCards.map((card, index) => {
              const Icon = card.icon;
              const sampleData = Array.from({ length: 8 }, () => Math.floor(Math.random() * 100));

              return (
                <div
                  key={index}
                  className="relative group overflow-hidden border-2 border-white/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
                  style={{
                    background: `linear-gradient(to bottom right, ${card.hexColor}20, white)`,
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>

                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" style={{ backgroundColor: card.hexColor }}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="mb-1">
                          <AnimatedCounter value={card.value} duration={2000} color={card.hexColor} />
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <MiniBarChart
                        data={sampleData}
                        color={card.hexColor}
                      />
                    </div>

                    <h3 className="text-base font-bold text-gray-900 text-right mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-600 text-right leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Summary Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-lg" style={{ background: '#458ac9' }}>
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#458ac9' }}>ملخص النشاط اليومي</h2>
            <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(to left, rgba(69, 138, 201, 0.3), transparent)' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative group overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <ClipboardList className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-white mb-1">
                      <AnimatedCounter value={stats.todayProcedures} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-primary-100 text-sm">إجراء</div>
                  </div>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-white/10 backdrop-blur-sm rounded-full border-4 border-white/40 shadow-2xl group-hover:border-white/60 transition-all duration-500">
                      <CheckCircle className="w-14 h-14 text-white drop-shadow-2xl" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-right mb-2">
                  إجراء مسجل
                </h3>
                <p className="text-primary-100 text-sm text-right">
                  الإجراءات المسجلة خلال 24 ساعة
                </p>
              </div>
            </div>

            <div className="relative group overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-white mb-1">
                      <AnimatedCounter value={stats.todaySamples} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-secondary-100 text-sm">عينة</div>
                  </div>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-white/10 backdrop-blur-sm rounded-full border-4 border-white/40 shadow-2xl group-hover:border-white/60 transition-all duration-500">
                      <CheckCircle className="w-14 h-14 text-white drop-shadow-2xl" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-right mb-2">
                  عدد العينات
                </h3>
                <p className="text-secondary-100 text-sm text-right">
                  العينات المستلمة خلال 24 ساعة
                </p>
              </div>
            </div>

            <div className="relative group overflow-hidden bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-white mb-1">
                      <AnimatedCounter value={stats.todayPositiveSamples} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-accent-100 text-sm">عينة إيجابية</div>
                  </div>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-white/10 backdrop-blur-sm rounded-full border-4 border-white/40 shadow-2xl group-hover:border-white/60 transition-all duration-500">
                      <CheckCircle className="w-14 h-14 text-white drop-shadow-2xl" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-right mb-2">
                  عدد العينات الإيجابية
                </h3>
                <p className="text-accent-100 text-sm text-right">
                  العينات الإيجابية خلال 24 ساعة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}