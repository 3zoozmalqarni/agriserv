import { useState, useEffect, useRef } from 'react';
import { ClipboardList, FileText, Package, BarChart3, Calculator, Printer, CreditCard as Edit, Calendar, Award, ArrowRight, Users, TrendingUp, Activity, CheckCircle, AlertCircle, Sparkles, TestTube2, Ship, Archive, PackageCheck, ScanSearch, Search, Copy, Check, Bell, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useVetProcedures } from '../../../hooks/useVetProcedures';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { vetDB, type VetProcedure } from '../../../lib/vetDatabase';
import { getAllAlerts, dismissAlert, createAlertForResultsCompleted } from '../../../lib/vetAlerts';
import type { VetProcedureAlert } from '../../../types';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';

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

interface VetHomeProps {
  setActiveTab?: (tab: string) => void;
}

export default function VetHome({ setActiveTab }: VetHomeProps) {
  const auth = useAuth();
  const user = auth?.user;
  const { procedures: vetProcedures, loading: proceduresLoading } = useVetProcedures();
  const { procedures: labProcedures } = useProcedures();
  const { results } = useTestResults();

  const [stats, setStats] = useState({
    totalShipments: 0,
    completedShipments: 0,
    partiallyCompletedShipments: 0,
    totalAnimals: 0,
    totalSamples: 0,
    totalAnimalShipments: 0,
    dailyAnimals: 0,
    dailySamples: 0
  });

  const [unlinkedProcedures, setUnlinkedProcedures] = useState<VetProcedure[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resultsCompletedAlerts, setResultsCompletedAlerts] = useState<VetProcedureAlert[]>([]);

  const isElectron = !!(window as any).electron;

  const handleCopyProcedureNumber = (procedureNumber: string, id: string) => {
    navigator.clipboard.writeText(procedureNumber).then(() => {
      setCopiedId(id);
      showToast.warning('تم نسخ رقم الإجراء');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    const loadStats = async () => {
      if (!proceduresLoading) {
        const safeProcedures = Array.isArray(vetProcedures) ? vetProcedures : [];

        // حساب الإجراءات المسجلة خلال آخر 24 ساعة
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const totalShipments = safeProcedures.filter((proc: any) => {
          const procedureDate = new Date(proc.created_at);
          return procedureDate >= twentyFourHoursAgo;
        }).length;

        const allAlerts = getAllAlerts();
        const completedAlerts = allAlerts.filter(
          alert => alert.action_type === 'results_completed' && !alert.dismissed
        );
        setResultsCompletedAlerts(completedAlerts);

        // الحصول على جميع الإرساليات الحيوانية (يتم تحديثها تلقائياً عند حذف إجراء)
        const animalShipments = await vetDB.getAnimalShipments();

        // تصفية إجراءات المحجر فقط (غير السعودية) للتحقق من حالة الإجراء المخبري
        const vetLabProcedures = labProcedures.filter((proc: any) => {
          const countryPort = proc.country_port?.trim().toLowerCase();
          return countryPort !== 'المملكة العربية السعودية'.toLowerCase() &&
                 countryPort !== 'السعودية'.toLowerCase();
        });

        // حساب الإرساليات المكتملة بناءً على حالة العينات في المختبر
        const completedProcedures = vetLabProcedures.filter((proc: any) => {
          const procedureSamples = proc.samples || [];
          if (procedureSamples.length === 0) return false;

          const samplesWithResults = procedureSamples.filter((sample: any) =>
            results.some(r => r.sample_id === sample.id && r.approval_status === 'approved')
          );

          return samplesWithResults.length === procedureSamples.length;
        });

        // تحديد الإجراءات التي تحتاج إلى فسح:
        // - الإجراء المخبري في سجل المختبر يجب أن يكون "مكتمل"
        // - الإجراء البيطري المرتبط موجود في سجل الإجراءات البيطرية
        // - لم يتم إضافة إرسالية حيوانية له بعد
        const unlinked = completedProcedures
          .filter((labProc: any) => {
            // التحقق من وجود رقم الإجراء البيطري
            if (!labProc.external_procedure_number) return false;

            // التحقق من أن الإجراء البيطري موجود في سجل الإجراءات
            const vetProcedureExists = safeProcedures.some(
              vetProc => vetProc.procedure_number === labProc.external_procedure_number
            );
            if (!vetProcedureExists) return false;

            // التحقق من عدم وجود إرسالية مرتبطة بهذا الإجراء
            const hasNoShipment = !animalShipments.some(
              shipment => shipment.procedure_number === labProc.external_procedure_number
            );

            return hasNoShipment;
          })
          .map((labProc: any) => {
            // إرجاع الإجراء البيطري من سجل الإجراءات
            return safeProcedures.find(
              vetProc => vetProc.procedure_number === labProc.external_procedure_number
            );
          })
          .filter(Boolean); // إزالة القيم الفارغة

        setUnlinkedProcedures(unlinked as VetProcedure[]);

        const completedShipments = completedProcedures.length;

        // إدارة تنبيهات النتائج المكتملة
        const existingAlerts = getAllAlerts();
        const resultsCompletedAlerts = existingAlerts.filter(
          alert => alert.action_type === 'results_completed'
        );

        // إنشاء/إعادة تفعيل تنبيهات للإجراءات المكتملة
        for (const proc of completedProcedures) {
          if (proc.external_procedure_number) {
            // التحقق من عدم وجود إرسالية مسجلة لهذا الإجراء
            const hasShipment = animalShipments.some(
              shipment => shipment.procedure_number === proc.external_procedure_number
            );

            // لا تُنشئ تنبيه إذا كان هناك إرسالية مسجلة
            if (!hasShipment) {
              const existingAlert = resultsCompletedAlerts.find(
                alert => alert.vet_procedure_number === proc.external_procedure_number
              );

              if (!existingAlert) {
                // إنشاء تنبيه جديد
                await createAlertForResultsCompleted(proc.external_procedure_number);
              } else if (existingAlert.dismissed) {
                // إعادة تفعيل التنبيه إذا كان مخفياً
                existingAlert.dismissed = false;
                if (isElectron) {
                  try {
                    (window as any).electron.updateVetAlert(proc.external_procedure_number, {
                      dismissed: false
                    });
                  } catch (error) {
                    console.error('Error updating alert:', error);
                  }
                } else {
                  localStorage.setItem('vet_procedure_alerts', JSON.stringify(existingAlerts));
                }
                window.dispatchEvent(new Event('alerts-updated'));
              }
            }
          }
        }

        // إخفاء تنبيهات الإجراءات التي لم تعد مكتملة أو تم تسجيل إرسالية لها
        for (const alert of resultsCompletedAlerts) {
          if (!alert.dismissed) {
            const isStillCompleted = completedProcedures.some(
              proc => proc.external_procedure_number === alert.vet_procedure_number
            );

            const hasShipment = animalShipments.some(
              shipment => shipment.procedure_number === alert.vet_procedure_number
            );

            if (!isStillCompleted || hasShipment) {
              dismissAlert(alert.vet_procedure_number, 'results_completed');
            }
          }
        }

        // حساب الإرساليات المكتملة جزئياً
        const partiallyCompletedShipments = vetLabProcedures.filter((proc: any) => {
          const procedureSamples = proc.samples || [];
          if (procedureSamples.length === 0) return false;

          const samplesWithResults = procedureSamples.filter((sample: any) =>
            results.some(r => r.sample_id === sample.id && r.approval_status === 'approved')
          );

          return samplesWithResults.length > 0 && samplesWithResults.length < procedureSamples.length;
        }).length;

        // حساب إجمالي عدد الإرساليات
        const totalAnimalShipments = animalShipments.length;

        const totalAnimals = animalShipments.reduce((sum: number, shipment: any) => {
          const shipmentTotal = (shipment.animals || []).reduce((animalSum: number, animal: any) => {
            const count = parseInt(animal.animal_count) || 0;
            return animalSum + count;
          }, 0);
          return sum + shipmentTotal;
        }, 0);

        // حساب إجمالي عدد العينات من سجل الإجراءات (sample_count من كل مجموعة)
        const totalSamples = safeProcedures.reduce((sum: number, proc: any) => {
          const samplesCount = (proc.sample_groups || []).reduce((total: number, group: any) => {
            const count = parseInt(group.sample_count) || 0;
            return total + count;
          }, 0);
          return sum + samplesCount;
        }, 0);

        // حساب عدد الحيوانات التي تم الكشف عليها خلال آخر 24 ساعة
        const dailyAnimals = animalShipments.reduce((sum: number, shipment: any) => {
          const shipmentDate = new Date(shipment.created_at);
          if (shipmentDate >= twentyFourHoursAgo) {
            const shipmentTotal = (shipment.animals || []).reduce((animalSum: number, animal: any) => {
              const count = parseInt(animal.animal_count) || 0;
              return animalSum + count;
            }, 0);
            return sum + shipmentTotal;
          }
          return sum;
        }, 0);

        // حساب عدد العينات المسحوبة خلال آخر 24 ساعة
        const dailySamples = safeProcedures.reduce((sum: number, proc: any) => {
          const procedureDate = new Date(proc.created_at);
          if (procedureDate >= twentyFourHoursAgo) {
            const samplesCount = (proc.sample_groups || []).reduce((total: number, group: any) => {
              const count = parseInt(group.sample_count) || 0;
              return total + count;
            }, 0);
            return sum + samplesCount;
          }
          return sum;
        }, 0);

        setStats({
          totalShipments,
          completedShipments,
          partiallyCompletedShipments,
          totalAnimals,
          totalSamples,
          totalAnimalShipments,
          dailyAnimals,
          dailySamples
        });
      }
    };

    loadStats();

    // الاستماع لتغييرات البيانات في القسم البيطري فقط
    const handleDataChanged = () => {
      loadStats();
    };
    const handleAlertsUpdated = () => {
      const allAlerts = getAllAlerts();
      const completedAlerts = allAlerts.filter(
        alert => alert.action_type === 'results_completed' && !alert.dismissed
      );
      setResultsCompletedAlerts(completedAlerts);
    };

    window.addEventListener('procedures-data-changed', handleDataChanged);
    window.addEventListener('shipment-data-changed', handleDataChanged);
    window.addEventListener('results-data-changed', handleDataChanged);
    window.addEventListener('alerts-updated', handleAlertsUpdated);

    return () => {
      window.removeEventListener('procedures-data-changed', handleDataChanged);
      window.removeEventListener('shipment-data-changed', handleDataChanged);
      window.removeEventListener('results-data-changed', handleDataChanged);
      window.removeEventListener('alerts-updated', handleAlertsUpdated);
    };
  }, [vetProcedures, labProcedures, results, proceduresLoading]);

  // تحديد الاختصارات المتاحة بناءً على صلاحيات المستخدم
  const allShortcuts = [];

  // الاختصارات المتاحة لجميع المستخدمين
  if (auth?.hasPermission('view_all')) {
    allShortcuts.push(
      {
        id: 'procedure_records_vet',
        title: 'سجل الإجراءات',
        description: 'عرض وإدارة جميع الإجراءات المسجلة',
        icon: FileText,
        hexColor: '#8a4913'
      },
      {
        id: 'shipment_records_vet',
        title: 'سجل الإرساليات الحيوانية',
        description: 'عرض وإدارة جميع الإرساليات الحيوانية',
        icon: Archive,
        hexColor: '#dc2626'
      },
      {
        id: 'quarantine_records_vet',
        title: 'سجل الحجر البيطري',
        description: 'عرض وإدارة سجلات المستوردين والأذونات',
        icon: AlertTriangle,
        hexColor: '#ea580c'
      },
      {
        id: 'importers_management_vet',
        title: 'بيانات المستوردين',
        description: 'عرض وإدارة بيانات المستوردين',
        icon: Users,
        hexColor: '#16a34a'
      },
      {
        id: 'lab_status_vet',
        title: 'تتبع حالة الفحوصات',
        description: 'متابعة حالة الفحوصات المخبرية للإجراءات',
        icon: ScanSearch,
        hexColor: '#458ac9'
      },
      {
        id: 'lab_results_vet',
        title: 'نتائج المختبر',
        description: 'عرض نتائج الفحوصات والاختبارات',
        icon: TestTube2,
        hexColor: '#ffcc00'
      }
    );
  }

  // اختصارات التسجيل (للمستخدمين الذين لديهم صلاحية الإضافة)
  if (auth?.hasPermission('add_vet_procedures')) {
    allShortcuts.unshift(
      {
        id: 'register_procedure_vet',
        title: 'تسجيل إجراء جديد',
        description: 'تسجيل عينات جديدة وإدخال بياناتها',
        icon: ClipboardList,
        hexColor: '#831f82'
      },
      {
        id: 'register_animal_shipment_vet',
        title: 'تسجيل إرسالية حيوانية',
        description: 'تسجيل إرسالية حيوانية جديدة وبياناتها',
        icon: Ship,
        hexColor: '#2563eb'
      }
    );
  }

  // اختصار التقارير
  if (auth?.hasPermission('view_reports')) {
    allShortcuts.push({
      id: 'reports_vet',
      title: 'التقارير',
      description: 'إنشاء وطباعة التقارير المختلفة',
      icon: BarChart3,
      hexColor: '#008a40'
    });
  }

  // اختصار إدارة المستخدمين
  if (auth?.hasPermission('manage_vet_users')) {
    allShortcuts.push({
      id: 'user_management_vet',
      title: 'إدارة المستخدمين',
      description: 'إضافة وتعديل وإدارة حسابات المستخدمين',
      icon: Users,
      hexColor: '#003361'
    });
  }

  const shortcuts = allShortcuts;

  const statisticsCards = [
    {
      title: 'عدد الإجراءات',
      value: stats.totalShipments,
      icon: ClipboardList,
      hexColor: '#831f82',
      description: 'العدد الإجمالي للإجراءات المسجلة'
    },
    {
      title: 'عدد الإرساليات المنجزة',
      value: stats.totalAnimalShipments,
      icon: Archive,
      hexColor: '#dc2626',
      description: 'مجموع الإرساليات في سجل الإرساليات'
    },
    {
      title: 'الفحوصات المكتملة',
      value: stats.completedShipments,
      icon: CheckCircle,
      hexColor: '#8a4913',
      description: 'الفحوصات التي تم إنجازها'
    },
    {
      title: 'الفحوصات المكتملة جزئياً',
      value: stats.partiallyCompletedShipments,
      icon: AlertCircle,
      hexColor: '#ffcc00',
      description: 'الفحوصات التي تم إنجاز جزء منها'
    },
    {
      title: 'عدد الحيوانات التي تم الكشف عليها',
      value: stats.totalAnimals,
      icon: PackageCheck,
      hexColor: '#2563eb',
      description: 'مجموع إجمالي الحيوانات في سجل الإرساليات'
    },
    {
      title: 'عدد العينات المسحوبة',
      value: stats.totalSamples,
      icon: Activity,
      hexColor: '#61bf69',
      description: 'مجموع عدد العينات في سجل الإجراءات'
    }
  ];

  if (proceduresLoading) {
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
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-[#003361]">
              القسم البيطري بمحجر ميناء جدة الإسلامي
            </h1>
          </div>
          <p className="text-gray-600 text-base mb-2">نظام إدارة الإرساليات الحيوانية</p>
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


        {/* Unlinked Procedures Alert */}
        {unlinkedProcedures.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-r-4 border-amber-500 rounded-lg shadow-lg p-4 max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-amber-500 rounded-lg shadow-md animate-pulse">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span>إجراءات تحتاج إلى فسح</span>
                    <span className="text-sm bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      {unlinkedProcedures.length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {unlinkedProcedures.slice(0, 3).map((proc) => (
                      <div key={proc.id} className="flex items-center gap-2 text-sm text-amber-800">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span className="font-semibold">الإجراء رقم {proc.procedure_number}</span>
                        <button
                          onClick={() => handleCopyProcedureNumber(proc.procedure_number, proc.id)}
                          className="p-1 hover:bg-amber-200 rounded transition-colors group/btn"
                          title="نسخ رقم الإجراء"
                        >
                          {copiedId === proc.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-amber-600 group-hover/btn:text-amber-700" />
                          )}
                        </button>
                        <span className="text-amber-600">لم يتم إجراء الفسح له بعد</span>
                      </div>
                    ))}
                    {unlinkedProcedures.length > 3 && (
                      <div className="text-xs text-amber-700 mr-3.5 font-semibold">
                        و {unlinkedProcedures.length - 3} إجراءات أخرى...
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab?.('register_animal_shipment_vet')}
                  className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-bold flex items-center gap-2 group"
                >
                  <Ship className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>تسجيل إرسالية</span>
                </button>
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
                  onClick={() => setActiveTab?.(shortcut.id)}
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
                      <AnimatedCounter value={stats.totalShipments} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-primary-100 text-sm">إرسالية</div>
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
                  عدد الإجراءات المسجلة خلال 24 ساعة
                </p>
              </div>
            </div>

            <div className="relative group overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <PackageCheck className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-white mb-1">
                      <AnimatedCounter value={stats.dailyAnimals} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-secondary-100 text-sm">حيوان</div>
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
                  الحيوانات المفحوصة اليوم
                </h3>
                <p className="text-secondary-100 text-sm text-right">
                  عدد الحيوانات التي تم الكشف عليها خلال 24 ساعة
                </p>
              </div>
            </div>

            <div className="relative group overflow-hidden bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <TestTube2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-white mb-1">
                      <AnimatedCounter value={stats.dailySamples} duration={2000} color="#ffffff" />
                    </div>
                    <div className="text-accent-100 text-sm">عينة</div>
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
                  العينات المسحوبة اليوم
                </h3>
                <p className="text-accent-100 text-sm text-right">
                  عدد العينات المسحوبة خلال 24 ساعة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
