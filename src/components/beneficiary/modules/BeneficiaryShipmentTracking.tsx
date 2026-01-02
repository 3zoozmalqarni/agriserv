import { Package, Search, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, CheckCircle, Clock, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import PageHeader from '../../shared/PageHeader';
import { vetDB } from '../../../lib/vetDatabase';
import { localDB } from '../../../lib/localDatabase';
import type { VetProcedure } from '../../../lib/vetDatabase';
import type { ElectronAPI } from '../../../types/electron';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

type StageStatus = 'pending' | 'in_progress' | 'completed';

type OverallStatus = 'in_progress' | 'awaiting_evaluation' | 'completed';

interface TrackingStages {
  paperReception: StageStatus;
  inspectionSampling: StageStatus;
  labTesting: StageStatus;
  clearanceProcedures: StageStatus;
}

export default function BeneficiaryShipmentTracking() {
  const [procedureNumber, setProcedureNumber] = useState('');
  const [date, setDate] = useState('');
  const [searchResult, setSearchResult] = useState<VetProcedure | null | 'not-found'>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [trackingStages, setTrackingStages] = useState<TrackingStages>({
    paperReception: 'pending',
    inspectionSampling: 'pending',
    labTesting: 'pending',
    clearanceProcedures: 'pending'
  });
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('in_progress');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratings, setRatings] = useState({
    service_satisfaction: 0,
    experience_satisfaction: 0,
    transaction_completion: 0,
    procedures_clarity: 0
  });
  const [hoverRatings, setHoverRatings] = useState({
    service_satisfaction: 0,
    experience_satisfaction: 0,
    transaction_completion: 0,
    procedures_clarity: 0
  });
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0 });
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const loadStagesFromDB = async (procedureNumber: string): Promise<{ stages: TrackingStages | undefined; completed_at: string | null }> => {
    try {
      if (window.electronAPI?.getTrackingStages) {
        const data = await window.electronAPI.getTrackingStages(procedureNumber);
        if (!data) return { stages: undefined, completed_at: null };

        return {
          stages: {
            paperReception: data.paper_reception as StageStatus,
            inspectionSampling: data.inspection_sampling as StageStatus,
            labTesting: data.lab_testing as StageStatus,
            clearanceProcedures: data.clearance_procedures as StageStatus
          },
          completed_at: data.completed_at || null
        };
      } else {
        const { data, error } = await supabase
          .from('shipment_tracking_stages')
          .select('*')
          .eq('procedure_number', procedureNumber)
          .maybeSingle();

        if (error || !data) return { stages: undefined, completed_at: null };

        return {
          stages: {
            paperReception: data.paper_reception as StageStatus,
            inspectionSampling: data.inspection_sampling as StageStatus,
            labTesting: data.lab_testing as StageStatus,
            clearanceProcedures: data.clearance_procedures as StageStatus
          },
          completed_at: data.completed_at || null
        };
      }
    } catch (error) {
      console.error('خطأ في تحميل حالة المراحل:', error);
      return { stages: undefined, completed_at: null };
    }
  };

  const saveStatesToDB = async (procedureNumber: string, stages: TrackingStages, completedAt?: string | null): Promise<void> => {
    try {
      if (window.electronAPI?.saveTrackingStages) {
        await window.electronAPI.saveTrackingStages(procedureNumber, {
          paperReception: stages.paperReception,
          inspectionSampling: stages.inspectionSampling,
          labTesting: stages.labTesting,
          clearanceProcedures: stages.clearanceProcedures,
          completedAt: completedAt || null
        });
      } else {
        const existing = await supabase
          .from('shipment_tracking_stages')
          .select('id')
          .eq('procedure_number', procedureNumber)
          .maybeSingle();

        const now = new Date().toISOString();

        if (existing.data) {
          await supabase
            .from('shipment_tracking_stages')
            .update({
              paper_reception: stages.paperReception,
              inspection_sampling: stages.inspectionSampling,
              lab_testing: stages.labTesting,
              clearance_procedures: stages.clearanceProcedures,
              completed_at: completedAt || null,
              updated_at: now
            })
            .eq('procedure_number', procedureNumber);
        } else {
          await supabase
            .from('shipment_tracking_stages')
            .insert({
              procedure_number: procedureNumber,
              paper_reception: stages.paperReception,
              inspection_sampling: stages.inspectionSampling,
              lab_testing: stages.labTesting,
              clearance_procedures: stages.clearanceProcedures,
              completed_at: completedAt || null,
              created_at: now,
              updated_at: now
            });
        }
      }
    } catch (error) {
      console.error('خطأ في حفظ حالة المراحل:', error);
    }
  };

  const calculateStages = async (procedure: VetProcedure, currentStages?: TrackingStages, currentCompletedAt?: string | null): Promise<{ stages: TrackingStages; completed_at: string | null }> => {
    const savedData = await loadStagesFromDB(procedure.procedure_number);
    const savedStages = currentStages || savedData.stages;
    const savedCompletedAt = currentCompletedAt !== undefined ? currentCompletedAt : savedData.completed_at;

    const stages: TrackingStages = {
      paperReception: savedStages?.paperReception || 'pending',
      inspectionSampling: savedStages?.inspectionSampling || 'pending',
      labTesting: savedStages?.labTesting || 'pending',
      clearanceProcedures: savedStages?.clearanceProcedures || 'pending'
    };

    try {
      // المرحلة 1: استلام الأوراق - دائماً مكتملة
      if (stages.paperReception === 'pending') {
        stages.paperReception = 'completed';
      }

      // المرحلة 2: الكشف وسحب العينات
      const savedSamples = await localDB.getSavedSamples();
      const labProcedure = savedSamples.find(
        s => s.vet_procedure_id === procedure.id ||
             (s.external_procedure_number === procedure.procedure_number && !s.vet_procedure_id)
      );

      if (labProcedure) {
        // إذا كانت المرحلة لم تبدأ بعد، ابدأها كـ "مكتملة"
        if (stages.inspectionSampling === 'pending') {
          stages.inspectionSampling = 'completed';
        }
        // إذا كانت "قيد التنفيذ"، حولها لـ "مكتملة"
        else if (stages.inspectionSampling === 'in_progress') {
          stages.inspectionSampling = 'completed';
        }
        // إذا كانت "مكتملة"، لا تغير شيء

        // المرحلة 3: الفحص المخبري
        const samples = await localDB.getSamples();
        const procedureSamples = samples.filter(
          s => s.saved_sample_id === labProcedure.id
        );

        if (procedureSamples.length > 0) {
          // إذا كانت المرحلة لم تبدأ بعد، ابدأها
          if (stages.labTesting === 'pending') {
            stages.labTesting = 'in_progress';
          }

          const testResults = await localDB.getTestResults();
          const sampleIds = procedureSamples.map(s => s.id);
          const approvedResults = testResults.filter(result =>
            sampleIds.includes(result.sample_id) && result.approval_status === 'approved'
          );

          if (approvedResults.length === procedureSamples.length) {
            // إذا كانت "قيد التنفيذ" أو "pending"، حولها لـ "مكتملة"
            if (stages.labTesting !== 'completed') {
              stages.labTesting = 'completed';
            }

            // المرحلة 4: انهاء إجراءات الفسح
            const animalShipments = await vetDB.getAnimalShipments();
            const hasShipment = animalShipments.some(
              s => s.procedure_number === procedure.procedure_number
            );

            if (hasShipment) {
              // إذا كانت المرحلة لم تكتمل بعد، أكملها
              if (stages.clearanceProcedures !== 'completed') {
                stages.clearanceProcedures = 'completed';
              }
            } else {
              // إذا لم تكن مكتملة، اجعلها قيد التنفيذ
              if (stages.clearanceProcedures === 'pending') {
                stages.clearanceProcedures = 'in_progress';
              }
            }
          }
        }
      } else {
        // إذا لم يتم استلام العينات بعد، المرحلة الثانية تكون قيد التنفيذ
        if (stages.inspectionSampling === 'pending') {
          stages.inspectionSampling = 'in_progress';
        }
      }
    } catch (error) {
      console.error('خطأ في حساب المراحل:', error);
    }

    const allCompleted =
      stages.paperReception === 'completed' &&
      stages.inspectionSampling === 'completed' &&
      stages.labTesting === 'completed' &&
      stages.clearanceProcedures === 'completed';

    let finalCompletedAt = savedCompletedAt;
    if (allCompleted && !savedCompletedAt) {
      finalCompletedAt = new Date().toISOString();
    }

    await saveStatesToDB(procedure.procedure_number, stages, finalCompletedAt);
    return { stages, completed_at: finalCompletedAt };
  };

  const calculateOverallStatus = (stages: TrackingStages, hasRating: boolean): OverallStatus => {
    const allCompleted =
      stages.paperReception === 'completed' &&
      stages.inspectionSampling === 'completed' &&
      stages.labTesting === 'completed' &&
      stages.clearanceProcedures === 'completed';

    if (allCompleted) {
      return hasRating ? 'completed' : 'awaiting_evaluation';
    }

    return 'in_progress';
  };

  const checkExistingRating = async (procedureNumber: string) => {
    try {
      if (window.electronAPI?.getRatingByProcedureNumber) {
        const data = await window.electronAPI.getRatingByProcedureNumber(procedureNumber);
        return !!data;
      } else {
        const { data, error } = await supabase
          .from('shipment_ratings')
          .select('*')
          .eq('procedure_number', procedureNumber)
          .maybeSingle();

        if (error) throw error;
        return !!data;
      }
    } catch (error) {
      console.error('خطأ في التحقق من التقييم:', error);
      return false;
    }
  };

  const handleSubmitRating = async () => {
    if (ratings.service_satisfaction === 0 || ratings.experience_satisfaction === 0 ||
        ratings.transaction_completion === 0 || ratings.procedures_clarity === 0) {
      toast.error('يرجى الإجابة على جميع الأسئلة');
      return;
    }

    if (!searchResult || searchResult === 'not-found') return;

    try {
      if (window.electronAPI?.createShipmentRating) {
        console.log('إرسال التقييم عبر Electron API...');
        const result = await window.electronAPI.createShipmentRating({
          procedure_number: searchResult.procedure_number,
          service_satisfaction: ratings.service_satisfaction,
          experience_satisfaction: ratings.experience_satisfaction,
          transaction_completion: ratings.transaction_completion,
          procedures_clarity: ratings.procedures_clarity,
          comment: ratingComment || null
        });
        console.log('تم حفظ التقييم بنجاح:', result);
      } else {
        console.log('إرسال التقييم عبر Supabase...');
        const { error } = await supabase
          .from('shipment_ratings')
          .insert([{
            procedure_number: searchResult.procedure_number,
            service_satisfaction: ratings.service_satisfaction,
            experience_satisfaction: ratings.experience_satisfaction,
            transaction_completion: ratings.transaction_completion,
            procedures_clarity: ratings.procedures_clarity,
            comment: ratingComment || null
          }]);

        if (error) throw error;
      }

      toast.success('تم حفظ التقييم بنجاح');
      setHasRated(true);
      setShowRatingModal(false);
      setOverallStatus('completed');
    } catch (error) {
      console.error('خطأ في حفظ التقييم:', error);
      toast.error(`فشل في حفظ التقييم: ${error.message || 'خطأ غير معروف'}`);
    }
  };

  useEffect(() => {
    if (!startTime || completedAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setElapsedTime({ hours, minutes });
    }, 60000);

    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setElapsedTime({ hours, minutes });

    return () => clearInterval(interval);
  }, [startTime, completedAt]);

  useEffect(() => {
    if (completedAt && startTime) {
      const completedDate = new Date(completedAt);
      const diff = completedDate.getTime() - startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setElapsedTime({ hours, minutes });
    }
  }, [completedAt, startTime]);

  useEffect(() => {
    const handleShipmentUpdate = async () => {
      if (searchResult && searchResult !== 'not-found') {
        const savedData = await loadStagesFromDB(searchResult.procedure_number);
        const result = await calculateStages(searchResult, savedData.stages, savedData.completed_at);
        setTrackingStages(result.stages);
        setCompletedAt(result.completed_at);
        const newOverallStatus = calculateOverallStatus(result.stages, hasRated);
        setOverallStatus(newOverallStatus);
      }
    };

    window.addEventListener('shipment-data-changed', handleShipmentUpdate);
    return () => {
      window.removeEventListener('shipment-data-changed', handleShipmentUpdate);
    };
  }, []);

  const handleSearch = async () => {
    if (!procedureNumber.trim() || !date) {
      setValidationError('يجب إدخال رقم الإجراء وتاريخ استلام الأوراق');
      return;
    }

    setValidationError('');

    setIsSearching(true);
    setSearchResult(null);
    setIsExpanded(false);

    try {
      const procedures = await vetDB.getAllProcedures();
      const found = procedures.find(p => {
        const matchNumber = p.procedure_number === procedureNumber.trim();
        const matchDate = p.reception_date === date;
        return matchNumber && matchDate;
      });

      if (found) {
        setSearchResult(found);
        const savedData = await loadStagesFromDB(found.procedure_number);
        const result = await calculateStages(found, savedData.stages, savedData.completed_at);
        setTrackingStages(result.stages);
        setCompletedAt(result.completed_at);
        setStartTime(new Date(found.created_at));
        const hasExistingRating = await checkExistingRating(found.procedure_number);
        setHasRated(hasExistingRating);
        const currentOverallStatus = calculateOverallStatus(result.stages, hasExistingRating);
        setOverallStatus(currentOverallStatus);
      } else {
        setSearchResult('not-found');
      }
    } catch (error) {
      console.error('خطأ في البحث:', error);
      setSearchResult('not-found');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Package}
            title="تتبع حالة الإرساليات"
            subtitle="تتبع حالة إرساليات الحيوانات"
          />

          <div className="mb-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md border-2 border-blue-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الإجراء <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="أدخل رقم الإجراء"
                  value={procedureNumber}
                  onChange={(e) => setProcedureNumber(e.target.value)}
                  required
                  className="w-full h-[50px] px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ استلام الأوراق <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-[50px] px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>
            </div>

            {validationError && (
              <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-800 font-medium">{validationError}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleSearch}
                className="bg-[#61bf69] hover:bg-[#50a857] text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                بحث
              </button>
            </div>
          </div>

          {searchResult === 'not-found' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 text-lg font-medium">
                نعتذر هذه الإرسالية لم تقيد في النظام
              </p>
            </div>
          )}

          {searchResult && searchResult !== 'not-found' && (
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
              <div className={`px-6 py-3 ${
                overallStatus === 'completed' ? 'bg-green-100 border-b-2 border-green-300' :
                overallStatus === 'awaiting_evaluation' ? 'bg-blue-100 border-b-2 border-blue-300' :
                'bg-amber-100 border-b-2 border-amber-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {overallStatus === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-700" />
                    ) : overallStatus === 'awaiting_evaluation' ? (
                      <Star className="w-5 h-5 text-blue-700" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-700" />
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <span className={`font-bold text-lg ${
                      overallStatus === 'completed' ? 'text-green-800' :
                      overallStatus === 'awaiting_evaluation' ? 'text-blue-800' :
                      'text-amber-800'
                    }`}>
                      {overallStatus === 'completed' ? 'الإرسالية مكتملة' :
                       overallStatus === 'awaiting_evaluation' ? 'بإنتظار التقييم' :
                       'الإرسالية تحت الإجراء'}
                    </span>
                  </div>
                  <div className="w-5"></div>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-medium ${
                    overallStatus === 'completed' ? 'text-green-700' :
                    overallStatus === 'awaiting_evaluation' ? 'text-blue-700' :
                    'text-amber-700'
                  }`}>
                    {completedAt
                      ? `تم إنجاز الإرسالية خلال: ${elapsedTime.hours.toString().padStart(2, '0')} ساعة ${elapsedTime.minutes.toString().padStart(2, '0')} دقيقة`
                      : `بدأت من: ${elapsedTime.hours.toString().padStart(2, '0')} ساعة ${elapsedTime.minutes.toString().padStart(2, '0')} دقيقة`
                    }
                  </span>
                </div>
              </div>

              {overallStatus === 'awaiting_evaluation' && (
                <div className="bg-yellow-50 border-b-2 border-yellow-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      <p className="text-yellow-800 font-medium">
                        لإكمال إجراءات الإرسالية نرجو تقييم الخدمات
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      تقييم الخدمات
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    {searchResult.client_name}
                  </h3>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-6">
                    <span>تاريخ الإجراء: {searchResult.reception_date}</span>
                    <span>•</span>
                    <span>وقت الاستلام: {new Date(searchResult.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>قادمة من: {searchResult.country_port || '-'}</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-6 h-6 text-gray-500" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 py-8 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                  <div className="grid grid-cols-4 gap-6">
                    <StageCard
                      title="استلام الأوراق"
                      status={trackingStages.paperReception}
                    />
                    <StageCard
                      title="الكشف وسحب العينات"
                      status={trackingStages.inspectionSampling}
                    />
                    <StageCard
                      title="الفحص المخبري"
                      status={trackingStages.labTesting}
                    />
                    <StageCard
                      title="انهاء إجراءات الفسح"
                      status={trackingStages.clearanceProcedures}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!searchResult && !isSearching && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                أدخل رقم الإجراء للبحث
              </p>
            </div>
          )}

          {isSearching && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#61bf69] mx-auto mb-4"></div>
              <p className="text-gray-500 text-lg">جاري البحث...</p>
            </div>
          )}

          {showRatingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  تقييم الخدمات
                </h2>

                <div className="space-y-4 mb-4">
                  <RatingQuestion
                    question="ما مدى رضاك عن الخدمات المقدمة من محجر ميناء جدة الإسلامي ؟"
                    rating={ratings.service_satisfaction}
                    hoverRating={hoverRatings.service_satisfaction}
                    onRate={(value) => setRatings(prev => ({ ...prev, service_satisfaction: value }))}
                    onHover={(value) => setHoverRatings(prev => ({ ...prev, service_satisfaction: value }))}
                  />

                  <RatingQuestion
                    question="ما مدى رضاك عن تجربتك الأخير معنا ؟"
                    rating={ratings.experience_satisfaction}
                    hoverRating={hoverRatings.experience_satisfaction}
                    onRate={(value) => setRatings(prev => ({ ...prev, experience_satisfaction: value }))}
                    onHover={(value) => setHoverRatings(prev => ({ ...prev, experience_satisfaction: value }))}
                  />

                  <RatingQuestion
                    question="هل تم إنجاز معاملتك بالشكل المطلوب ؟"
                    rating={ratings.transaction_completion}
                    hoverRating={hoverRatings.transaction_completion}
                    onRate={(value) => setRatings(prev => ({ ...prev, transaction_completion: value }))}
                    onHover={(value) => setHoverRatings(prev => ({ ...prev, transaction_completion: value }))}
                  />

                  <RatingQuestion
                    question="هل كانت الإجراءات واضحة ومفهومة ؟"
                    rating={ratings.procedures_clarity}
                    hoverRating={hoverRatings.procedures_clarity}
                    onRate={(value) => setRatings(prev => ({ ...prev, procedures_clarity: value }))}
                    onHover={(value) => setHoverRatings(prev => ({ ...prev, procedures_clarity: value }))}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات أو اقتراحات (اختياري)
                  </label>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                    placeholder="شاركنا ملاحظاتك..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent resize-none text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowRatingModal(false);
                      setRatings({
                        service_satisfaction: 0,
                        experience_satisfaction: 0,
                        transaction_completion: 0,
                        procedures_clarity: 0
                      });
                      setHoverRatings({
                        service_satisfaction: 0,
                        experience_satisfaction: 0,
                        transaction_completion: 0,
                        procedures_clarity: 0
                      });
                      setRatingComment('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    className="flex-1 bg-[#61bf69] hover:bg-[#50a857] text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
                  >
                    إرسال التقييم
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RatingQuestion({
  question,
  rating,
  hoverRating,
  onRate,
  onHover
}: {
  question: string;
  rating: number;
  hoverRating: number;
  onRate: (value: number) => void;
  onHover: (value: number) => void;
}) {
  const getRatingText = (value: number) => {
    switch (value) {
      case 1: return 'سيء جداً';
      case 2: return 'سيء';
      case 3: return 'مقبول';
      case 4: return 'جيد';
      case 5: return 'ممتاز';
      default: return '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <p className="text-gray-700 text-sm mb-2 text-right">
        {question}
      </p>
      <div className="flex justify-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className="text-center text-xs text-gray-600">
          {getRatingText(rating)}
        </p>
      )}
    </div>
  );
}

function StageCard({ title, status }: { title: string; status: StageStatus }) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-300';
      case 'in_progress':
        return 'bg-blue-50 border-blue-300';
      case 'pending':
        return 'bg-gray-50 border-gray-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-8 h-8 text-blue-600" />;
      case 'pending':
        return <Clock className="w-8 h-8 text-gray-400" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'pending':
        return 'قيد الانتظار';
      default:
        return 'قيد الانتظار';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'in_progress':
        return 'text-blue-700';
      case 'pending':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`${getStatusColor()} border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg`}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 rounded-full bg-white shadow-sm">
          {getStatusIcon()}
        </div>
        <h3 className="font-bold text-gray-800 text-base leading-tight">
          {title}
        </h3>
        <span className={`${getStatusTextColor()} font-semibold text-sm px-3 py-1 rounded-full bg-white/50`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
