import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useAuth } from '../../../hooks/useAuth.tsx';
import PageHeader from '../../shared/PageHeader';

export default function ResultsApproval() {
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures } = useProcedures();
  const { results, updateResult } = useTestResults();
  const { user } = useAuth();

  const toggleProcedure = (procedureId: string) => {
    const newExpanded = new Set(expandedProcedures);
    if (newExpanded.has(procedureId)) {
      newExpanded.delete(procedureId);
    } else {
      newExpanded.add(procedureId);
    }
    setExpandedProcedures(newExpanded);
  };

  const handleApprove = async (procedure: any) => {
    try {
      const procedureResults = procedure.samples
        ?.map((sample: any) => results.find(r => r.sample_id === sample.id))
        .filter((r: any) => r && r.approval_status === 'pending');

      if (!procedureResults || procedureResults.length === 0) {
        toast.error('لا توجد نتائج معلقة للاعتماد');
        return;
      }

      for (const result of procedureResults) {
        await updateResult(result.id, {
          approval_status: 'approved',
          approved_by: user?.name || null
        }, { silent: true });
      }

      toast.success('تم اعتماد النتائج بنجاح');

      // إطلاق حدث لإعلام القسم البيطري بالتحديث
      window.dispatchEvent(new CustomEvent('results-approved'));
      window.dispatchEvent(new CustomEvent('procedures-data-changed'));
    } catch (error) {
      console.error('Error approving results:', error);
      toast.error('حدث خطأ أثناء اعتماد النتائج');
    }
  };

  const handleReject = async (procedure: any) => {
    try {
      const procedureResults = procedure.samples
        ?.map((sample: any) => results.find(r => r.sample_id === sample.id))
        .filter((r: any) => r && r.approval_status === 'pending');

      if (!procedureResults || procedureResults.length === 0) {
        toast.error('لا توجد نتائج معلقة للرفض');
        return;
      }

      for (const result of procedureResults) {
        await updateResult(result.id, { approval_status: 'rejected' }, { silent: true });
      }

      toast.success('تم رفض النتائج');
    } catch (error) {
      console.error('Error rejecting results:', error);
      toast.error('حدث خطأ أثناء رفض النتائج');
    }
  };

  const handleApproveSingle = async (resultId: string, sampleNumber: string) => {
    try {
      await updateResult(resultId, {
        approval_status: 'approved',
        approved_by: user?.name || null
      });

      toast.success(`تم اعتماد نتيجة العينة ${sampleNumber}`);

      window.dispatchEvent(new CustomEvent('results-approved'));
      window.dispatchEvent(new CustomEvent('procedures-data-changed'));
    } catch (error) {
      console.error('Error approving result:', error);
      toast.error('حدث خطأ أثناء اعتماد النتيجة');
    }
  };

  const handleRejectSingle = async (resultId: string, sampleNumber: string) => {
    try {
      await updateResult(resultId, { approval_status: 'rejected' });

      toast.success(`تم رفض نتيجة العينة ${sampleNumber}`);
    } catch (error) {
      console.error('Error rejecting result:', error);
      toast.error('حدث خطأ أثناء رفض النتيجة');
    }
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

  const filteredProcedures = procedures
    .map(procedure => {
      const procedureResults = procedure.samples
        ?.map((sample: any) => results.find(r => r.sample_id === sample.id))
        .filter((r: any) => r && r.approval_status === 'pending');

      return {
        ...procedure,
        pendingResults: procedureResults || []
      };
    })
    .filter(p => p.pendingResults.length > 0);

  // حساب الصفحات
  const totalPages = Math.ceil(filteredProcedures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProcedures = filteredProcedures.slice(startIndex, endIndex);

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={CheckCircle}
            title="اعتماد النتائج"
            subtitle="مراجعة واعتماد نتائج الفحوصات المخبرية"
          />

          {filteredProcedures.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد نتائج معلقة</h3>
              <p className="text-gray-500">جميع النتائج تم اعتمادها أو لا توجد نتائج بانتظار الاعتماد</p>
            </div>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedProcedures.map(procedure => {
                const isExpanded = expandedProcedures.has(procedure.id);
                const pendingCount = procedure.pendingResults.length;

                return (
                  <div key={procedure.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
                <div className="w-full p-4 text-right">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => toggleProcedure(procedure.id)}
                      className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-secondary-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-secondary-600" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-right">
                          <h3 className="text-lg font-bold text-gray-900">
                            {procedure.internal_procedure_number}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {procedure.client_name} • {procedure.reception_date}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-amber-50 px-4 py-2 rounded-xl border-2 border-amber-200 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-amber-600" />
                              <span className="text-amber-800 font-bold text-lg">
                                {pendingCount}
                              </span>
                              <span className="text-amber-700 text-sm font-semibold">
                                {pendingCount === 1 ? 'عينة' : pendingCount === 2 ? 'عينتين' : 'عينات'} معلقة
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleApprove(procedure)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#61bf69] to-[#50a857] text-white rounded-xl hover:from-[#50a857] hover:to-[#61bf69] transition-all text-sm font-bold shadow-md hover:shadow-lg"
                          >
                            <CheckCircle className="w-5 h-5" />
                            اعتماد
                          </button>

                          <button
                            onClick={() => handleReject(procedure)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-bold shadow-md hover:shadow-lg"
                          >
                            <XCircle className="w-5 h-5" />
                            رفض
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t-2 border-gray-200 p-6 bg-slate-50/50">
                    <div className="space-y-3">
                      {procedure.pendingResults.map((result: any) => {
                        const sample = procedure.samples?.find((s: any) => s.id === result.sample_id);
                        const isVaccinationEfficacy = result.test_result === 'كفاءة تحصين' ||
                                                      result.test_result === 'vaccination_efficacy' ||
                                                      result.test_result === 'اختبار كفاءة تحصين' ||
                                                      result.is_vaccination_efficiency_test;
                        const isConfirmatoryResult = result.test_result === 'إيجابي بعد التأكيد' ||
                                                     result.test_result === 'سلبي بعد التأكيد';

                        return (
                          <div key={result.id} className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleApproveSingle(result.id, sample?.sample_number || '')}
                                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#61bf69] to-[#50a857] text-white rounded-lg hover:from-[#50a857] hover:to-[#61bf69] transition-all text-sm font-bold shadow-md hover:shadow-lg"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  اعتماد
                                </button>
                                <button
                                  onClick={() => handleRejectSingle(result.id, sample?.sample_number || '')}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-bold shadow-md hover:shadow-lg"
                                >
                                  <XCircle className="w-4 h-4" />
                                  رفض
                                </button>
                                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm ${
                                  result.test_result === 'positive' || result.test_result === 'إيجابي بعد التأكيد' ? 'bg-red-100 text-red-800 border-2 border-red-200' :
                                  result.test_result === 'negative' || result.test_result === 'سلبي بعد التأكيد' ? 'bg-green-100 text-green-800 border-2 border-green-200' :
                                  'bg-blue-100 text-blue-800 border-2 border-blue-200'
                                }`}>
                                  {getResultLabel(result.test_result)}
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-[#003361]">
                                {sample?.sample_number || 'عينة غير معروفة'}
                              </h4>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-right text-sm">
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-semibold block mb-1">القسم</span>
                                <span className="text-gray-900 font-bold">{sample?.department}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-semibold block mb-1">نوع الحيوان</span>
                                <span className="text-gray-900 font-bold">{sample?.animal_type || 'غير محدد'}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-semibold block mb-1">الفحص</span>
                                <span className="text-gray-900 font-bold">{sample?.requested_test}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-semibold block mb-1">الطريقة</span>
                                <span className="text-gray-900 font-bold">{result.test_method}</span>
                              </div>

                              {isVaccinationEfficacy && result.vaccination_efficiency_percentage && (
                                <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                                  <span className="text-blue-700 font-semibold block mb-1">نسبة كفاءة التحصين</span>
                                  <span className="text-blue-900 font-bold text-lg">{result.vaccination_efficiency_percentage}%</span>
                                </div>
                              )}

                              {!isVaccinationEfficacy && (
                                <div className="bg-red-50 p-3 rounded-lg border-2 border-red-100">
                                  <span className="text-red-700 font-semibold block mb-1">العينات الإيجابية</span>
                                  <span className="text-red-600 font-bold text-lg">{result.positive_samples}</span>
                                </div>
                              )}

                              {isConfirmatoryResult && result.confirmatory_test && (
                                <>
                                  <div className="bg-amber-50 p-3 rounded-lg border-2 border-amber-200">
                                    <span className="text-amber-700 font-semibold block mb-1">عدد العينات الإيجابية بعد التأكيد</span>
                                    <span className="text-amber-900 font-bold text-lg">{result.confirmatory_test.positive_count || result.confirmatory_test.positive_samples || 0}</span>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-gray-600 font-semibold block mb-1">طريقة الاختبار التأكيدي</span>
                                    <span className="text-gray-900 font-bold">{result.confirmatory_test.method || result.confirmatory_test.test_type || 'غير محدد'}</span>
                                  </div>
                                </>
                              )}

                              <div className={`${isConfirmatoryResult ? 'col-span-4' : 'col-span-3'} bg-slate-50 p-3 rounded-lg`}>
                                <span className="text-gray-600 font-semibold block mb-1">الأخصائيين</span>
                                <span className="text-gray-900 font-bold">{result.specialists?.join('، ')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
            </div>

            {/* أزرار التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  عرض {startIndex + 1} - {Math.min(endIndex, filteredProcedures.length)} من أصل {filteredProcedures.length} إجراء
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
