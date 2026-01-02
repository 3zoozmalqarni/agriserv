import { Activity, ChevronDown, ChevronUp, Search, CheckCircle2, Circle, Clock, Timer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import PageHeader from '../../shared/PageHeader';
import { vetDatabase, type VetProcedure, type StageStatus } from '../../../lib/vetDatabase';

export default function VetTransactionTracking() {
  const [procedures, setProcedures] = useState<VetProcedure[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProcedures();

    const handleUpdate = () => loadProcedures();
    window.addEventListener('procedures-data-changed', handleUpdate);

    return () => {
      window.removeEventListener('procedures-data-changed', handleUpdate);
    };
  }, []);

  const loadProcedures = async () => {
    const data = await vetDatabase.getAllProcedures();
    // فلترة الإجراءات التي لها stage_status فقط
    const validProcedures = data.filter(p => p.stage_status);
    setProcedures(validProcedures);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredProcedures = procedures.filter(procedure => {
    const term = searchTerm.toLowerCase();
    return (
      procedure.client_name?.toLowerCase().includes(term) ||
      procedure.procedure_number?.toLowerCase().includes(term) ||
      procedure.sample_groups?.some(group => group.animal_type?.toLowerCase().includes(term))
    );
  });

  const getStageIcon = (status: StageStatus = 'pending') => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-7 h-7 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-7 h-7 text-blue-600 animate-pulse" />;
      default:
        return <Circle className="w-7 h-7 text-gray-400" />;
    }
  };

  const getStageStyle = (status: StageStatus = 'pending') => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-green-100 to-green-50 shadow-lg shadow-green-100 border-2 border-green-200';
      case 'in_progress':
        return 'bg-gradient-to-br from-blue-100 to-blue-50 shadow-lg shadow-blue-100 border-2 border-blue-300';
      default:
        return 'bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-gray-200';
    }
  };

  const getStageTextStyle = (status: StageStatus = 'pending') => {
    switch (status) {
      case 'completed':
        return 'text-green-900 font-medium';
      case 'in_progress':
        return 'text-blue-900 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectorStyle = (status: StageStatus = 'pending') => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-l from-green-400 to-green-300 h-1';
      case 'in_progress':
        return 'bg-gradient-to-l from-blue-400 to-blue-300 h-1';
      default:
        return 'bg-gray-300 h-0.5';
    }
  };

  const calculateCurrentDuration = (startTime?: string): number => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  };

  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes < 1) return '-';

    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (mins > 0) parts.push(`${mins} دقيقة`);

    return parts.join(' و ') || '-';
  };

  const getStageDuration = (procedure: VetProcedure, stageName: 'inspection_sampling' | 'testing' | 'clearance_procedures'): number => {
    const stageTimings = procedure.stage_timings?.[stageName];
    const stageStatus = procedure.stage_status?.[stageName];

    // إذا لم يكن هناك start_time، المرحلة لم تبدأ بعد
    if (!stageTimings?.start_time) {
      return 0;
    }

    // إذا كانت المرحلة مكتملة، نعرض الوقت المحفوظ (لا يتغير بعد الاكتمال)
    if (stageStatus === 'completed') {
      // إذا كان هناك end_time محفوظ، نحسب الفرق
      if (stageTimings.end_time) {
        const duration = calculateDuration(stageTimings.start_time, stageTimings.end_time);
        // حتى لو كانت المدة أقل من دقيقة، نعرض دقيقة واحدة على الأقل
        return duration > 0 ? duration : 1;
      }
      // إذا لم يكن هناك end_time، لا نعرض شيء (بيانات غير مكتملة)
      return 0;
    }

    // إذا كانت المرحلة قيد الإجراء، نعرض الوقت الحالي (يتحدث مباشرة)
    if (stageStatus === 'in_progress') {
      return calculateCurrentDuration(stageTimings.start_time);
    }

    // حالات أخرى: لا نعرض شيء
    return 0;
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const getOverallStatus = (procedure: VetProcedure): StageStatus => {
    const stages = procedure.stage_status;
    if (!stages) return 'pending';

    // إذا كانت جميع المراحل مكتملة
    if (
      stages.transaction_received === 'completed' &&
      stages.inspection_sampling === 'completed' &&
      stages.samples_delivered === 'completed' &&
      stages.testing === 'completed' &&
      stages.clearance_procedures === 'completed'
    ) {
      return 'completed';
    }

    // إذا كانت أي مرحلة قيد الإجراء
    if (
      stages.transaction_received === 'in_progress' ||
      stages.inspection_sampling === 'in_progress' ||
      stages.samples_delivered === 'in_progress' ||
      stages.testing === 'in_progress' ||
      stages.clearance_procedures === 'in_progress'
    ) {
      return 'in_progress';
    }

    // خلاف ذلك، المعاملة قيد الإجراء (لأن هناك مراحل معلقة)
    return 'in_progress';
  };

  const getOverallStatusText = (status: StageStatus): string => {
    switch (status) {
      case 'completed':
        return 'مكتملة';
      case 'in_progress':
        return 'قيد الإجراء';
      default:
        return 'قيد الإجراء';
    }
  };

  const getOverallStatusBadgeStyle = (status: StageStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-400 hover:shadow-lg hover:shadow-green-200';
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-400 hover:shadow-lg hover:shadow-blue-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Activity}
            title="تتبع المعاملات"
            subtitle="متابعة سير إنجاز معاملات المحجر - القسم البيطري"
          />

          <div className="mt-8 mb-6">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم الإجراء أو اسم العميل أو نوع الحيوان..."
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredProcedures.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {procedures.length === 0 ? 'لا توجد معاملات لعرضها' : 'لا توجد نتائج للبحث'}
                </p>
              </div>
            ) : (
              filteredProcedures.map((procedure) => {
                const overallStatus = getOverallStatus(procedure);
                return (
                <div
                  key={procedure.id}
                  className="group relative border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]"
                >
                  <button
                    onClick={() => toggleExpand(procedure.id)}
                    className="w-full px-8 py-5 flex items-center justify-between hover:bg-gradient-to-l hover:from-gray-50 hover:to-white transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 text-right flex-1">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-bold text-gray-900">
                            {procedure.client_name}
                          </span>
                          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 shadow-md transition-all duration-300 ${getOverallStatusBadgeStyle(overallStatus)}`}>
                            {getOverallStatusText(overallStatus)}
                          </span>
                        </div>
                        <div className="flex gap-6 text-sm text-gray-600 font-medium">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            رقم الإجراء: <span className="font-semibold text-gray-900">{procedure.procedure_number}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            تاريخ المعاملة: <span className="font-semibold text-gray-900">{format(new Date(procedure.reception_date), 'dd/MM/yyyy', { locale: ar })}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            وقت الاستلام: <span className="font-semibold text-gray-900">{format(new Date(procedure.created_at), 'hh:mm a', { locale: ar })}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mr-4">
                      {expandedId === procedure.id ? (
                        <ChevronUp className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      )}
                    </div>
                  </button>

                  {expandedId === procedure.id && (
                    <div className="px-8 py-8 bg-gradient-to-b from-gray-50 to-white border-t-2 border-gray-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl ${getStageStyle(procedure.stage_status?.transaction_received || 'completed')} flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                            {getStageIcon(procedure.stage_status?.transaction_received || 'completed')}
                          </div>
                          <span className={`text-sm font-bold ${getStageTextStyle(procedure.stage_status?.transaction_received || 'completed')} text-center whitespace-nowrap`}>استلام المعاملة</span>
                        </div>

                        <div className={`${getConnectorStyle(procedure.stage_status?.transaction_received || 'completed')} flex-1 rounded-full mt-8`} />

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl ${getStageStyle(procedure.stage_status?.inspection_sampling || 'in_progress')} flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                            {getStageIcon(procedure.stage_status?.inspection_sampling || 'in_progress')}
                          </div>
                          <span className={`text-sm font-bold ${getStageTextStyle(procedure.stage_status?.inspection_sampling || 'in_progress')} text-center whitespace-nowrap`}>الكشف وسحب العينات</span>
                          {(() => {
                            const duration = getStageDuration(procedure, 'inspection_sampling');
                            return duration > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-semibold whitespace-nowrap">
                                <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{formatDuration(duration)}</span>
                              </div>
                            ) : (
                              <div className="h-6"></div>
                            );
                          })()}
                        </div>

                        <div className={`${getConnectorStyle(procedure.stage_status?.inspection_sampling || 'in_progress')} flex-1 rounded-full mt-8`} />

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl ${getStageStyle(procedure.stage_status?.samples_delivered || 'pending')} flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                            {getStageIcon(procedure.stage_status?.samples_delivered || 'pending')}
                          </div>
                          <span className={`text-sm font-bold ${getStageTextStyle(procedure.stage_status?.samples_delivered || 'pending')} text-center whitespace-nowrap`}>تسليم العينات</span>
                          <div className="h-6"></div>
                        </div>

                        <div className={`${getConnectorStyle(procedure.stage_status?.samples_delivered || 'pending')} flex-1 rounded-full mt-8`} />

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl ${getStageStyle(procedure.stage_status?.testing || 'pending')} flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                            {getStageIcon(procedure.stage_status?.testing || 'pending')}
                          </div>
                          <span className={`text-sm font-bold ${getStageTextStyle(procedure.stage_status?.testing || 'pending')} text-center whitespace-nowrap`}>الفحص</span>
                          {(() => {
                            const duration = getStageDuration(procedure, 'testing');
                            return duration > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-semibold whitespace-nowrap">
                                <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{formatDuration(duration)}</span>
                              </div>
                            ) : (
                              <div className="h-6"></div>
                            );
                          })()}
                        </div>

                        <div className={`${getConnectorStyle(procedure.stage_status?.testing || 'pending')} flex-1 rounded-full mt-8`} />

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl ${getStageStyle(procedure.stage_status?.clearance_procedures || 'pending')} flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                            {getStageIcon(procedure.stage_status?.clearance_procedures || 'pending')}
                          </div>
                          <span className={`text-sm font-bold ${getStageTextStyle(procedure.stage_status?.clearance_procedures || 'pending')} text-center whitespace-nowrap`}>إجراءات الفسح</span>
                          {(() => {
                            const duration = getStageDuration(procedure, 'clearance_procedures');
                            return duration > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-semibold whitespace-nowrap">
                                <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{formatDuration(duration)}</span>
                              </div>
                            ) : (
                              <div className="h-6"></div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
