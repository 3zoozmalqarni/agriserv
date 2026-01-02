import { useState, useEffect, useCallback } from 'react';
import { vetDB, type VetProcedure as BaseVetProcedure, type SampleGroup as BaseSampleGroup } from '../lib/vetDatabase';
import { createAlertForUpdate, createAlertForDelete, deleteAlertForProcedure } from '../lib/vetAlerts';
import toast from 'react-hot-toast';

export interface VetProcedure extends BaseVetProcedure {
  shipment_registered?: boolean;
}

export interface SampleGroup extends BaseSampleGroup {
  samples: VetSample[];
}

export interface VetSample {
  id: string;
  sample_number: string;
  required_test: string;
  sample_type: string;
}

export function useVetProcedures() {
  const [procedures, setProcedures] = useState<VetProcedure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcedures = useCallback(async () => {
    try {
      setLoading(true);
      const allProcedures = await vetDB.getAllProcedures();
      setProcedures(allProcedures);
    } catch (error) {
      console.error('Error fetching vet procedures:', error);
      toast.error('خطأ في تحميل إجراءات المحجر');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcedures();

    // الاستماع لتحديثات الإجراءات (مثل تغيير علامة is_new)
    const handleProceduresUpdated = () => {
      fetchProcedures();
    };
    window.addEventListener('vet-procedures-updated', handleProceduresUpdated);

    return () => {
      window.removeEventListener('vet-procedures-updated', handleProceduresUpdated);
    };
  }, [fetchProcedures]);

  const deleteProcedure = async (id: string) => {
    try {
      const procedure = procedures.find(p => p.id === id);
      if (procedure) {
        // حذف الإجراء من قاعدة البيانات (سيحذف الإرساليات تلقائياً)
        await vetDB.deleteProcedure(id);

        // تم الربط في electron/database.js - يتم الحذف تلقائياً

        // حذف جميع التنبيهات المرتبطة بهذا الإجراء (تعديل، حذف، نتائج جاهزة)
        deleteAlertForProcedure(procedure.procedure_number);

        // إنشاء تنبيه للحذف (فقط إذا كان هناك إجراء مرتبط في المختبر)
        await createAlertForDelete(procedure.procedure_number);

        window.dispatchEvent(new Event('vet-data-changed'));
        toast.success('تم حذف الإجراء والإرساليات المرتبطة به');
      }
      await fetchProcedures();
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('خطأ في حذف الإجراء');
    }
  };

  const updateProcedure = async (id: string, data: Partial<VetProcedure>) => {
    try {
      const procedure = procedures.find(p => p.id === id);
      await vetDB.updateProcedure(id, data);

      // إنشاء تنبيه للمختبر عند تعديل الإجراء البيطري (فقط إذا كان هناك إجراء مرتبط في المختبر)
      if (procedure) {
        await createAlertForUpdate(procedure.procedure_number);
      }

      toast.success('تم تحديث الإجراء بنجاح');
      await fetchProcedures();
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast.error('خطأ في تحديث الإجراء');
    }
  };

  const getNextProcedureNumber = useCallback(async () => {
    try {
      return await vetDB.getNextProcedureNumber();
    } catch (error) {
      console.error('Error getting next procedure number:', error);
      const currentYear = new Date().getFullYear();
      return `0001-${currentYear}-Q`;
    }
  }, []);

  return {
    procedures,
    loading,
    deleteProcedure,
    updateProcedure,
    getNextProcedureNumber,
    refreshProcedures: fetchProcedures,
  };
}
