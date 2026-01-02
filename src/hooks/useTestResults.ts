import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDatabase';
import toast from 'react-hot-toast';

export function useTestResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);

      // تنظيف النتائج اليتيمة قبل التحميل
      const deletedCount = await localDB.cleanupOrphanedResults();
      if (deletedCount > 0) {
        console.log(`تم حذف ${deletedCount} نتيجة يتيمة`);
      }

      const resultsWithInfo = await localDB.getTestResultsWithSampleInfo();
      setResults(resultsWithInfo);

      // حساب عدد النتائج المعلقة (pending)
      const pending = resultsWithInfo.filter(
        (result: any) => result.approval_status === 'pending' || !result.approval_status
      ).length;
      setPendingCount(pending);
    } catch (error) {
      console.error('Error fetching test results:', error);
      toast.error('خطأ في تحميل النتائج');
    } finally {
      setLoading(false);
    }
  }, []);

  const addResult = async (resultData: any): Promise<any> => {
    try {
      // جلب external_procedure_number من العينة
      let externalProcedureNumber = null;
      if (resultData.sample_id && window.electronAPI) {
        try {
          const sample = await window.electronAPI.getSampleById(resultData.sample_id);
          externalProcedureNumber = sample?.external_procedure_number || null;
          console.log('[addResult] Sample external_procedure_number:', externalProcedureNumber);
        } catch (error) {
          console.warn('[addResult] Could not fetch sample:', error);
        }
      }

      const data = await localDB.createTestResult({
        sample_id: resultData.sample_id,
        test_date: new Date().toISOString().split('T')[0],
        test_method: resultData.test_method || 'غير محدد',
        test_result: resultData.test_result || 'غير محدد',
        positive_samples: parseInt(resultData.positive_samples) || 0,
        is_vaccination_efficiency_test: resultData.is_vaccination_efficiency_test === true,
        vaccination_efficiency_percentage: resultData.vaccination_efficiency_percentage || null,
        specialists: Array.isArray(resultData.specialists)
          ? resultData.specialists.filter((s: string) => s && s.trim() !== '')
          : [],
        confirmatory_test: resultData.confirmatory_test || null,
        confirmed_positive_samples: resultData.confirmed_positive_samples,
        confirmatory_test_method: resultData.confirmatory_test_method,
        notes: resultData.notes || null,
        approval_status: resultData.approval_status || 'draft',
        external_procedure_number: externalProcedureNumber,
        created_by: null
      });

      // تم الربط في localDatabase.ts - يتم التحديث تلقائياً

      await fetchResults();

      window.dispatchEvent(new Event('results-data-changed'));
      toast.success('تم حفظ النتيجة بنجاح');

      return data;
    } catch (error) {
      console.error('Error adding result:', error);
      toast.error('خطأ في حفظ النتيجة');
      throw error;
    }
  };

  const updateResult = async (id: string, resultData: any, options?: { silent?: boolean }): Promise<void> => {
    try {
      const updateData: any = {};

      if (resultData.test_method !== undefined) updateData.test_method = resultData.test_method || 'غير محدد';
      if (resultData.test_result !== undefined) updateData.test_result = resultData.test_result || 'غير محدد';
      if (resultData.positive_samples !== undefined) updateData.positive_samples = parseInt(resultData.positive_samples) || 0;
      if (resultData.is_vaccination_efficiency_test !== undefined) updateData.is_vaccination_efficiency_test = resultData.is_vaccination_efficiency_test === true;
      if (resultData.vaccination_efficiency_percentage !== undefined) updateData.vaccination_efficiency_percentage = resultData.vaccination_efficiency_percentage || null;
      if (resultData.specialists !== undefined) {
        updateData.specialists = Array.isArray(resultData.specialists)
          ? resultData.specialists.filter((s: string) => s && s.trim() !== '')
          : [];
      }
      if (resultData.confirmatory_test !== undefined) updateData.confirmatory_test = resultData.confirmatory_test || null;
      if (resultData.confirmed_positive_samples !== undefined) updateData.confirmed_positive_samples = resultData.confirmed_positive_samples;
      if (resultData.confirmatory_test_method !== undefined) updateData.confirmatory_test_method = resultData.confirmatory_test_method;
      if (resultData.notes !== undefined) updateData.notes = resultData.notes || null;
      if (resultData.approval_status !== undefined) updateData.approval_status = resultData.approval_status;
      if (resultData.approved_by !== undefined) updateData.approved_by = resultData.approved_by || null;

      await localDB.updateTestResult(id, updateData);

      await fetchResults();
      window.dispatchEvent(new Event('results-data-changed'));

      if (!options?.silent) {
        if (resultData.approval_status !== undefined) {
          if (resultData.approval_status === 'approved') {
            toast.success('تم اعتماد النتيجة بنجاح');
          } else if (resultData.approval_status === 'rejected') {
            toast.success('تم رفض النتيجة');
          } else {
            toast.success('تم تحديث النتيجة بنجاح');
          }
        } else {
          toast.success('تم تحديث النتيجة بنجاح');
        }
      }
    } catch (error) {
      console.error('Error updating result:', error);
      if (!options?.silent) {
        toast.error('خطأ في تحديث النتيجة');
      }
      throw error;
    }
  };

  const deleteResult = async (id: string): Promise<void> => {
    try {
      // الحصول على معلومات النتيجة قبل الحذف
      const result = results.find((r: any) => r.id === id);

      // استخدام external_procedure_number مباشرة من النتيجة
      const procedureNumber = result?.external_procedure_number;

      console.log('[deleteResult] ===== بدء حذف النتيجة =====');
      console.log('[deleteResult] Result ID:', id);
      console.log('[deleteResult] External procedure number:', procedureNumber);

      // حذف النتيجة
      await localDB.deleteTestResult(id);

      await fetchResults();
      window.dispatchEvent(new Event('results-data-changed'));
      toast.success('تم حذف النتيجة بنجاح');
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('خطأ في حذف النتيجة');
      throw error;
    }
  };

  useEffect(() => {
    fetchResults();

    const handleUpdate = () => {
      fetchResults();
    };

    window.addEventListener('procedures-updated', handleUpdate);
    window.addEventListener('test-results-updated', handleUpdate);
    window.addEventListener('results-data-changed', handleUpdate);
    window.addEventListener('results-approved', handleUpdate);

    return () => {
      window.removeEventListener('procedures-updated', handleUpdate);
      window.removeEventListener('test-results-updated', handleUpdate);
      window.removeEventListener('results-data-changed', handleUpdate);
      window.removeEventListener('results-approved', handleUpdate);
    };
  }, [fetchResults]);

  return {
    results,
    loading,
    pendingCount,
    addResult,
    updateResult,
    deleteResult,
    refetch: fetchResults,
    refreshResults: fetchResults
  };
}
