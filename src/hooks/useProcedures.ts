import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDatabase';
import { deleteAlertForProcedure, cleanupOrphanedAlerts } from '../lib/vetAlerts';
import toast from 'react-hot-toast';

export interface SavedSample {
  id: string;
  client_name: string;
  reception_date: string;
  internal_procedure_number: string;
  external_procedure_number: string | null;
  external_procedure_date: string | null;
  country_port: string | null;
  sample_origin: string | null;
  civil_record: string | null;
  receiver_name: string;
  quality_check: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Sample {
  id: string;
  saved_sample_id: string;
  sample_number: string;
  department: string;
  requested_test: string;
  sample_type: string;
  animal_type: string;
  sample_count: number;
  notes: string | null;
  created_at: string;
}

export function useProcedures() {
  const [procedures, setProcedures] = useState<(SavedSample & { samples: Sample[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcedures = useCallback(async () => {
    try {
      setLoading(true);
      const proceduresWithSamples = await localDB.getAllSavedSamplesWithSamples();
      setProcedures(proceduresWithSamples);
    } catch (error) {
      console.error('Error fetching procedures:', error);
      toast.error('خطأ في تحميل الإجراءات');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProcedure = async (procedureData: any): Promise<SavedSample> => {
    try {
      const savedSample = await localDB.createSavedSample({
        client_name: procedureData.client_name,
        reception_date: procedureData.reception_date,
        internal_procedure_number: procedureData.procedure_number,
        external_procedure_number: procedureData.external_procedure_number || null,
        external_procedure_date: procedureData.external_procedure_date || null,
        vet_procedure_id: procedureData.vet_procedure_id || null,
        country_port: procedureData.country_port || null,
        sample_origin: procedureData.sample_source || null,
        civil_record: procedureData.civil_record || null,
        receiver_name: procedureData.receiver_name,
        quality_check: {
          temperature: procedureData.temperature,
          preservation_method: procedureData.preservation_method,
          sample_data: procedureData.sample_data,
          sample_count_accuracy: procedureData.sample_count_accuracy,
          notes: procedureData.quality_notes
        },
        created_by: null
      });

      if (procedureData.samples && procedureData.samples.length > 0) {
        for (const sample of procedureData.samples) {
          await localDB.createSample({
            saved_sample_id: savedSample.id,
            sample_number: sample.sample_number || '',
            department: sample.section,
            requested_test: sample.required_test,
            sample_type: sample.sample_type,
            animal_type: sample.animal_type,
            sample_count: sample.sample_count,
            notes: sample.notes || null
          });
        }
      }

      // تحديث عدد العينات في نظام تتبع التقدم للإجراءات من المحجر
      try {
        if (procedureData.external_procedure_number &&
            typeof procedureData.external_procedure_number === 'string' &&
            procedureData.external_procedure_number.endsWith('-Q')) {
          const totalSamples = procedureData.samples?.length || 0;
          // تم الربط في localDatabase.ts - يتم التحديث تلقائياً عند إدخال النتائج
        }
      } catch (progressError) {
        console.error('Error updating progress:', progressError);
        // لا نرمي الخطأ هنا لأن الحفظ نجح
      }

      await fetchProcedures();
      window.dispatchEvent(new Event('procedures-updated'));
      toast.success('تم حفظ الإجراء بنجاح');

      return savedSample;
    } catch (error) {
      console.error('Error creating procedure:', error);
      toast.error('خطأ في حفظ الإجراء');
      throw error;
    }
  };

  const deleteProcedure = async (id: string): Promise<void> => {
    try {
      // العثور على الإجراء للحصول على رقم الإجراء الخارجي
      const procedure = procedures.find(p => p.id === id);
      const externalProcedureNumber = procedure?.external_procedure_number;

      // حذف الإجراء من المختبر
      await localDB.deleteSavedSample(id);

      // تنظيف التنبيهات اليتيمة بعد الحذف
      // هذا سيحذف فقط تنبيهات الحذف، بينما تنبيهات التعديل ستبقى
      await cleanupOrphanedAlerts();

      await fetchProcedures();
      window.dispatchEvent(new Event('procedures-updated'));
      window.dispatchEvent(new Event('test-results-updated'));
      toast.success('تم حذف الإجراء والنتائج المرتبطة بنجاح');
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('خطأ في حذف الإجراء');
    }
  };

  const updateProcedure = async (id: string, procedureData: any): Promise<void> => {
    try {
      await localDB.updateSavedSample(id, {
        client_name: procedureData.client_name,
        reception_date: procedureData.reception_date,
        internal_procedure_number: procedureData.internal_procedure_number,
        external_procedure_number: procedureData.external_procedure_number || null,
        external_procedure_date: procedureData.external_procedure_date || null,
        country_port: procedureData.country_port || null,
        sample_origin: procedureData.sample_origin || null,
        civil_record: procedureData.civil_record || null,
        receiver_name: procedureData.receiver_name,
        quality_check: procedureData.quality_check,
      });

      const oldSamples = (await localDB.getSamples()).filter(s => s.saved_sample_id === id);

      const updatedSampleIds = new Set(
        procedureData.samples
          .filter((s: any) => s.id)
          .map((s: any) => s.id)
      );

      const samplesToDelete = oldSamples.filter(sample => !updatedSampleIds.has(sample.id));
      for (const sample of samplesToDelete) {
        await localDB.deleteSample(sample.id);
      }

      if (procedureData.samples && procedureData.samples.length > 0) {
        const existingSampleNumbers = oldSamples
          .map(s => parseInt(s.sample_number) || 0)
          .filter(n => !isNaN(n));
        let nextSampleNumber = existingSampleNumbers.length > 0
          ? Math.max(...existingSampleNumbers) + 1
          : 1;

        for (const sample of procedureData.samples) {
          if (sample.id && oldSamples.find(s => s.id === sample.id)) {
            await localDB.updateSample(sample.id, {
              sample_number: sample.sample_number,
              department: sample.department,
              requested_test: sample.requested_test,
              sample_type: sample.sample_type,
              animal_type: sample.animal_type,
              sample_count: sample.sample_count,
              notes: sample.notes || null
            });
          } else {
            await localDB.createSample({
              saved_sample_id: id,
              sample_number: sample.sample_number || nextSampleNumber.toString(),
              department: sample.department,
              requested_test: sample.requested_test,
              sample_type: sample.sample_type,
              animal_type: sample.animal_type,
              sample_count: sample.sample_count,
              notes: sample.notes || null
            });
            nextSampleNumber++;
          }
        }
      }

      await fetchProcedures();
      window.dispatchEvent(new Event('procedures-updated'));
      toast.success('تم تحديث الإجراء بنجاح');
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast.error('خطأ في تحديث الإجراء');
      throw error;
    }
  };

  const getNextProcedureNumber = useCallback(async () => {
    try {
      return await localDB.getNextProcedureNumber();
    } catch (error) {
      console.error('Error getting next procedure number:', error);
      const currentYear = new Date().getFullYear();
      return `0001-${currentYear}-L`;
    }
  }, []);

  useEffect(() => {
    fetchProcedures();

    const handleDataUpdate = () => {
      fetchProcedures();
    };

    window.addEventListener('procedures-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('procedures-updated', handleDataUpdate);
    };
  }, [fetchProcedures]);

  return {
    procedures,
    loading,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    getNextProcedureNumber,
    refetch: fetchProcedures,
    refreshProcedures: fetchProcedures
  };
}
