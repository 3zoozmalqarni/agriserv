import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, TestTube2, Save, X, CreditCard as Edit, Trash2, Plus, CheckCircle, AlertCircle, Clock, User, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useAuth } from '../../../hooks/useAuth.tsx';
import PageHeader from '../../shared/PageHeader';
import { vetDB } from '../../../lib/vetDatabase';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';

const resultSchema = z.object({
  test_method: z.string().min(1, 'طريقة الاختبار مطلوبة'),
  custom_test_method: z.string().optional(),
  positive_samples: z.number().min(0, 'عدد العينات الإيجابية يجب أن يكون صفر أو أكثر'),
  is_vaccination_efficiency_test: z.boolean().optional(),
  specialists: z.array(z.string()).min(1, 'يجب اختيار أخصائي واحد على الأقل'),
  custom_specialist: z.string().optional(),
  confirmatory_test_method: z.string().optional(),
  custom_confirmatory_method: z.string().optional(),
  confirmatory_positive_samples: z.number().min(0).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // إذا كانت طريقة الاختبار "أخرى"، يجب ملء الحقل المخصص
  if (data.test_method === 'أخرى' && !data.custom_test_method?.trim()) {
    return false;
  }
  // إذا كانت طريقة الاختبار التأكيدي "أخرى"، يجب ملء الحقل المخصص
  if (data.confirmatory_test_method === 'أخرى' && !data.custom_confirmatory_method?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'يرجى ملء جميع الحقول المخصصة',
  path: ['custom_test_method']
});

type ResultForm = z.infer<typeof resultSchema>;

const testMethods = [
  'PCR',
  'iiPCR',
  'ELISA IgM',
  'ELISA',
  'Rose bengal test (RBT)',
  'Bacterial culture (عزل وتصنيف)',
  'Microscopic examination (فحص مجهري)',
  'أخرى'
];

const specialists = [
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

interface ResultsEntryProps {
  searchData?: any;
}

export default function ResultsEntry({ searchData }: ResultsEntryProps) {
  // Fixed: Changed procedure header from button to div
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);
  const [showCustomSpecialist, setShowCustomSpecialist] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<any>(null);
  const searchProcessedRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleAlertDismissed = () => {
      setRefreshKey(prev => prev + 1);
    };
    const handleAlertDeleted = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('alert-dismissed-lab', handleAlertDismissed);
    window.addEventListener('alert-deleted', handleAlertDeleted);
    return () => {
      window.removeEventListener('alert-dismissed-lab', handleAlertDismissed);
      window.removeEventListener('alert-deleted', handleAlertDeleted);
    };
  }, []);

  // عند وجود بيانات من البحث
  useEffect(() => {
    if (searchData?.type === 'test_result' && searchData.data && !searchProcessedRef.current) {
      searchProcessedRef.current = true;
      if (searchData.data.sample) {
        setSelectedSample(searchData.data.sample);
        setShowResultModal(true);
      }
    }
  }, [searchData]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { procedures, loading: proceduresLoading } = useProcedures();
  const { results, addResult, updateResult, deleteResult } = useTestResults();
  const { hasPermission } = useAuth();

  // للتحقق من البيانات
  useEffect(() => {
    console.log('[LabResultsEntry] Total results:', results.length);
    console.log('[LabResultsEntry] Results by status:', {
      draft: results.filter(r => r.approval_status === 'draft').length,
      pending: results.filter(r => r.approval_status === 'pending').length,
      approved: results.filter(r => r.approval_status === 'approved').length,
      rejected: results.filter(r => r.approval_status === 'rejected').length,
      undefined: results.filter(r => !r.approval_status).length
    });
  }, [results]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ResultForm>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      positive_samples: 0,
      confirmatory_positive_samples: 0,
      is_vaccination_efficiency_test: false,
      specialists: []
    }
  });

  const watchedTestMethod = watch('test_method');
  const watchedConfirmatoryMethod = watch('confirmatory_test_method');
  const watchedPositiveSamples = watch('positive_samples');
  const watchedConfirmatoryPositive = watch('confirmatory_positive_samples');
  const watchedIsVaccinationTest = watch('is_vaccination_efficiency_test');

  // التحقق من صحة عدد العينات الإيجابية
  useEffect(() => {
    if (selectedSample && watchedPositiveSamples > selectedSample.sample_count) {
      setValue('positive_samples', selectedSample.sample_count);
      toast.error('عدد العينات الإيجابية لا يمكن أن يكون أكبر من إجمالي العينات');
    }
  }, [watchedPositiveSamples, selectedSample, setValue]);

  // التحقق من صحة عدد العينات الإيجابية بعد التأكيد
  useEffect(() => {
    if (watchedConfirmatoryPositive && watchedConfirmatoryPositive > watchedPositiveSamples) {
      setValue('confirmatory_positive_samples', watchedPositiveSamples);
      toast.error('عدد العينات الإيجابية بعد التأكيد لا يمكن أن يكون أكبر من العينات الإيجابية');
    }
  }, [watchedConfirmatoryPositive, watchedPositiveSamples, setValue]);

  const toggleProcedure = (procedureId: string) => {
    const newExpanded = new Set(expandedProcedures);
    if (newExpanded.has(procedureId)) {
      newExpanded.delete(procedureId);
    } else {
      newExpanded.add(procedureId);
    }
    setExpandedProcedures(newExpanded);
  };

  const handleSendResults = async (procedure: any) => {
    try {
      const procedureResults = procedure.samples
        ?.map((sample: any) => results.find(r => r.sample_id === sample.id))
        .filter((r: any) => r && (r.approval_status === 'draft' || !r.approval_status || r.approval_status === 'rejected'));

      if (!procedureResults || procedureResults.length === 0) {
        toast.error('لا توجد نتائج جاهزة للإرسال');
        return;
      }

      for (const result of procedureResults) {
        await updateResult(result.id, { approval_status: 'pending' }, { silent: true });
      }

      toast.success(`تم إرسال نتائج الإجراء: ${procedure.internal_procedure_number}`);
    } catch (error) {
      console.error('Error sending results:', error);
      toast.error('حدث خطأ أثناء إرسال النتائج');
    }
  };

  // دالة لاستنتاج نتيجة الاختبار
  const calculateTestResult = (
    positiveSamples: number,
    confirmatoryPositiveSamples: number | undefined,
    hasConfirmatoryTest: boolean,
    isVaccinationTest: boolean
  ): string => {
    // إذا كان اختبار كفاءة تحصين
    if (isVaccinationTest) {
      return 'كفاءة تحصين';
    }

    // إذا كان هناك اختبار تأكيدي
    if (hasConfirmatoryTest) {
      if (confirmatoryPositiveSamples === 0) {
        return 'سلبي بعد التأكيد';
      } else if (confirmatoryPositiveSamples && confirmatoryPositiveSamples > 0) {
        return 'إيجابي بعد التأكيد';
      } else {
        return 'سلبي بعد التأكيد';
      }
    }

    // الاختبار الأساسي بدون تأكيد
    if (positiveSamples === 0) {
      return 'سلبي';
    } else if (positiveSamples > 0) {
      return 'إيجابي';
    } else {
      return 'سلبي';
    }
  };

  const getSampleStatus = (sampleId: string) => {
    const result = results.find(r => r.sample_id === sampleId);
    if (!result) {
      return { status: 'not_tested', label: 'لم تفحص بعد', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }

    // التحقق من حالة الاعتماد أولاً
    if (result.approval_status === 'rejected') {
      return { status: 'rejected', label: 'مرفوضة - يتطلب تعديل', color: 'bg-red-100 text-red-800 border-2 border-red-400', icon: AlertCircle };
    }

    if (result.approval_status === 'pending') {
      return { status: 'pending', label: 'بانتظار الاعتماد', color: 'bg-amber-100 text-amber-800', icon: Clock };
    }

    if (result.approval_status === 'approved') {
      // إذا كانت معتمدة، نعرض نتيجة الاختبار
      if (result.test_result === 'كفاءة تحصين' || result.is_vaccination_efficiency_test || result.test_result === 'vaccination_efficacy' || result.test_result === 'اختبار كفاءة تحصين') {
        return { status: 'vaccination', label: 'كفاءة تحصين (معتمدة)', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
      }
      if (result.test_result === 'إيجابي بعد التأكيد' || result.test_result === 'positive') {
        return { status: 'positive', label: 'إيجابي (معتمدة)', color: 'bg-red-100 text-red-800', icon: AlertCircle };
      }
      return { status: 'negative', label: 'سلبي (معتمدة)', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }

    // إذا كانت مسودة، نعرض نتيجة الاختبار فقط
    // كفاءة تحصين
    if (result.test_result === 'كفاءة تحصين' || result.is_vaccination_efficiency_test || result.test_result === 'vaccination_efficacy' || result.test_result === 'اختبار كفاءة تحصين') {
      return { status: 'vaccination', label: 'كفاءة تحصين', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    }

    // إيجابي بعد التأكيد
    if (result.test_result === 'إيجابي بعد التأكيد') {
      return { status: 'positive_confirmed', label: 'إيجابي بعد التأكيد', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }

    // سلبي بعد التأكيد
    if (result.test_result === 'سلبي بعد التأكيد') {
      return { status: 'negative_confirmed', label: 'سلبي بعد التأكيد', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }

    // إيجابي
    if (result.test_result === 'positive') {
      return { status: 'positive', label: 'إيجابي', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }

    // سلبي (أو negative)
    return { status: 'negative', label: 'سلبي', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const openResultModal = (sample: any, existingResult?: any) => {
    setSelectedSample(sample);
    setSelectedSpecialists([]);
    setShowCustomSpecialist(false);

    if (existingResult) {
      console.log('Loading existing result for editing:', existingResult);

      // تحديد ما إذا كانت طريقة الاختبار مخصصة
      const isCustomMethod = !testMethods.includes(existingResult.test_method);
      setValue('test_method', isCustomMethod ? 'أخرى' : existingResult.test_method || '');
      setValue('custom_test_method', isCustomMethod ? existingResult.test_method : '');

      setValue('positive_samples', existingResult.positive_samples || 0);
      setValue('is_vaccination_efficiency_test', existingResult.is_vaccination_efficiency_test === true);
      setValue('specialists', existingResult.specialists || []);
      setValue('notes', existingResult.notes || '');

      if (existingResult.confirmatory_test_method || (existingResult.confirmatory_test && existingResult.confirmatory_test.test_type)) {
        const methodToUse = existingResult.confirmatory_test_method || existingResult.confirmatory_test.test_type;
        const samplesToUse = existingResult.confirmed_positive_samples ?? (existingResult.confirmatory_test?.positive_samples || 0);

        console.log('Loading confirmatory test data:', { method: methodToUse, samples: samplesToUse });
        const isCustomConfirmatory = !testMethods.includes(methodToUse);
        setValue('confirmatory_test_method', isCustomConfirmatory ? 'أخرى' : methodToUse || '');
        setValue('custom_confirmatory_method', isCustomConfirmatory ? methodToUse : '');
        setValue('confirmatory_positive_samples', samplesToUse);
      } else {
        setValue('confirmatory_test_method', '');
        setValue('custom_confirmatory_method', '');
        setValue('confirmatory_positive_samples', 0);
      }

      setSelectedSpecialists(existingResult.specialists || []);
    } else {
      reset({
        positive_samples: 0,
        confirmatory_positive_samples: 0,
        is_vaccination_efficiency_test: false,
        specialists: [],
        test_method: '',
        custom_test_method: '',
        confirmatory_test_method: '',
        custom_confirmatory_method: '',
        notes: ''
      });
    }

    setShowResultModal(true);
  };

  const handleSpecialistToggle = (specialist: string) => {
    if (specialist === 'أخرى') {
      if (showCustomSpecialist) {
        setShowCustomSpecialist(false);
      } else {
        setShowCustomSpecialist(true);
      }
      return;
    }

    const newSpecialists = selectedSpecialists.includes(specialist)
      ? selectedSpecialists.filter(s => s !== specialist)
      : [...selectedSpecialists, specialist];

    setSelectedSpecialists(newSpecialists);
    setValue('specialists', newSpecialists);
  };

  const addCustomSpecialist = (customName: string) => {
    if (customName.trim() && !selectedSpecialists.includes(customName.trim())) {
      const newSpecialists = [...selectedSpecialists, customName.trim()];
      setSelectedSpecialists(newSpecialists);
      setValue('specialists', newSpecialists);
      setValue('custom_specialist', '');
      setShowCustomSpecialist(false);
    }
  };

  const removeSpecialist = (specialist: string) => {
    const newSpecialists = selectedSpecialists.filter(s => s !== specialist);
    setSelectedSpecialists(newSpecialists);
    setValue('specialists', newSpecialists);
  };

  const onSubmit = async (data: ResultForm) => {
    if (!selectedSample) return;

    setIsSaving(true);
    try {
      // معالجة طريقة الاختبار الرئيسية
      const finalTestMethod = data.test_method === 'أخرى' ? data.custom_test_method : data.test_method;

      // معالجة طريقة الاختبار التأكيدي
      const finalConfirmatoryMethod = data.confirmatory_test_method === 'أخرى'
        ? data.custom_confirmatory_method
        : data.confirmatory_test_method;

      // حساب نتيجة الاختبار تلقائياً بناءً على المنطق الجديد
      let testResult: string;

      // إذا كان اختبار كفاءة تحصين
      if (data.is_vaccination_efficiency_test) {
        testResult = 'كفاءة تحصين';
      }
      // إذا كانت طريقة الاختبار التأكيدي غير فارغة
      else if (finalConfirmatoryMethod) {
        // النتيجة مرتبطة بعدد العينات الإيجابية بعد التأكيد
        if (data.confirmatory_positive_samples === 0) {
          testResult = 'سلبي بعد التأكيد';
        } else if (data.confirmatory_positive_samples && data.confirmatory_positive_samples > 0) {
          testResult = 'إيجابي بعد التأكيد';
        } else {
          testResult = 'سلبي بعد التأكيد';
        }
      }
      // النتيجة مرتبطة بعدد العينات الإيجابية الأساسية
      else {
        if (data.positive_samples === 0) {
          testResult = 'negative';
        } else if (data.positive_samples > 0) {
          testResult = 'positive';
        } else {
          testResult = 'negative';
        }
      }

      const vaccinationEfficiency = data.is_vaccination_efficiency_test && selectedSample.sample_count > 0
        ? ((data.positive_samples / selectedSample.sample_count) * 100).toFixed(2)
        : null;

      const existingResult = results.find(r => r.sample_id === selectedSample.id);
      const procedure = procedures.find(p => p.id === selectedSample.procedure_id);
      const isQuarantineProcedure = procedure && procedure.external_procedure_number?.endsWith('-Q');

      const resultData: any = {
        sample_id: selectedSample.id,
        test_method: finalTestMethod,
        test_result: testResult,
        positive_samples: data.positive_samples,
        is_vaccination_efficiency_test: data.is_vaccination_efficiency_test === true,
        vaccination_efficiency_percentage: vaccinationEfficiency,
        specialists: data.specialists,
        confirmatory_test: finalConfirmatoryMethod ? {
          method: finalConfirmatoryMethod,
          test_type: finalConfirmatoryMethod,
          positive_samples: data.confirmatory_positive_samples || 0,
          positive_count: data.confirmatory_positive_samples || 0
        } : null,
        confirmed_positive_samples: finalConfirmatoryMethod ? (data.confirmatory_positive_samples || 0) : undefined,
        confirmatory_test_method: finalConfirmatoryMethod || undefined,
        notes: data.notes,
        approval_status: 'draft',
        external_procedure_number: procedure?.external_procedure_number || null
      };

      console.log('Saving result data:', resultData);
      console.log('is_vaccination_efficiency_test value:', resultData.is_vaccination_efficiency_test);
      console.log('Confirmatory test data:', resultData.confirmatory_test);
      console.log('External procedure number:', resultData.external_procedure_number);

      if (existingResult) {
        // إذا كانت النتيجة معتمدة أو تم رفضها، أعد حالتها إلى draft عند التعديل
        if (existingResult.approval_status === 'approved' || existingResult.approval_status === 'rejected') {
          resultData.approval_status = 'draft';
        }
        await updateResult(existingResult.id, resultData);

        // إذا كان الإجراء من المحجر، حدّث النتيجة أيضاً في قاعدة بيانات المحجر
        if (isQuarantineProcedure) {
          try {
            console.log('Updating quarantine database for procedure:', procedure.external_procedure_number);

            const quarantineResults = await vetDB.getTestResultsByProcedureNumber(procedure.external_procedure_number);
            const quarantineResult = quarantineResults.find(r => r.sample_number === selectedSample.sample_number);

            console.log('Found quarantine result:', quarantineResult);

            if (quarantineResult) {
              await vetDB.updateTestResult(quarantineResult.id, {
                test_type: finalTestMethod ?? '',
                positive_samples: data.positive_samples,
                result: testResult,
                confirmed_positive_samples: finalConfirmatoryMethod ? (data.confirmatory_positive_samples || 0) : undefined,
                confirmatory_test_method: finalConfirmatoryMethod || undefined
              });
              console.log('Updated quarantine DB successfully');
            } else {
              console.log('No existing result in quarantine DB, creating new one');
              await vetDB.saveTestResult({
                procedure_number: procedure.external_procedure_number ?? '',
                sample_number: selectedSample.sample_number ?? '',
                test_type: finalTestMethod ?? '',
                positive_samples: data.positive_samples,
                result: testResult,
                confirmed_positive_samples: finalConfirmatoryMethod ? (data.confirmatory_positive_samples || 0) : undefined,
                confirmatory_test_method: finalConfirmatoryMethod || undefined
              });
            }
          } catch (error) {
            console.error('Error updating quarantine database:', error);
          }
        }
      } else {
        await addResult(resultData);

        // إذا كان الإجراء من المحجر، احفظ النتيجة أيضاً في قاعدة بيانات المحجر
        if (isQuarantineProcedure) {
          try {
            console.log('Saving to quarantine database:', {
              procedure_number: procedure.external_procedure_number,
              sample_number: selectedSample.sample_number,
              test_type: finalTestMethod,
              positive_samples: data.positive_samples,
              result: testResult
            });

            const savedResult = await vetDB.saveTestResult({
              procedure_number: procedure.external_procedure_number ?? '',
              sample_number: selectedSample.sample_number ?? '',
              test_type: finalTestMethod ?? '',
              positive_samples: data.positive_samples,
              result: testResult,
              confirmed_positive_samples: finalConfirmatoryMethod ? (data.confirmatory_positive_samples || 0) : undefined,
              confirmatory_test_method: finalConfirmatoryMethod || undefined
            });

            console.log('Saved to quarantine DB successfully:', savedResult);
          } catch (error) {
            console.error('Error saving to quarantine database:', error);
          }
        }
      }

      setShowResultModal(false);
      setSelectedSample(null);
      reset();
      setSelectedSpecialists([]);

      // التمرير إلى أعلى الصفحة
      setTimeout(() => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      // عرض modal النجاح
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving result:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResult = (sampleId: string) => {
    const result = results.find(r => r.sample_id === sampleId);
    if (result) {
      setResultToDelete(result);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (resultToDelete) {
      await deleteResult(resultToDelete.id);

      // إذا كان الإجراء من المحجر، احذف النتيجة أيضاً من قاعدة بيانات المحجر
      try {
        const sample = procedures
          .flatMap(p => p.samples || [])
          .find(s => s.id === resultToDelete.sample_id);

        if (sample) {
          const procedure = procedures.find(p => p.id === sample.saved_sample_id);
          if (procedure && procedure.external_procedure_number?.endsWith('-Q')) {
            const quarantineResults = await vetDB.getTestResultsByProcedureNumber(procedure.external_procedure_number);
            const quarantineResult = quarantineResults.find(r => r.sample_number === sample.sample_number);

            if (quarantineResult) {
              await vetDB.deleteTestResult(quarantineResult.id);
            }
          }
        }
      } catch (error) {
        console.error('Error deleting from quarantine database:', error);
      }

      setShowDeleteModal(false);
      setResultToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setResultToDelete(null);
  };

  // الفلترة والصفحات - يجب أن تكون قبل أي عبارات return مشروطة
  const filteredProcedures = procedures.filter((procedure) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      procedure.internal_procedure_number?.toLowerCase().includes(query) ||
      procedure.external_procedure_number?.toLowerCase().includes(query)
    );
  });

  // حساب الصفحات
  const totalPages = Math.ceil(filteredProcedures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProcedures = filteredProcedures.slice(startIndex, endIndex);

  // إعادة تعيين الصفحة إلى 1 عند تغيير البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={TestTube2}
            title="تسجيل النتائج"
            subtitle="إدخال وتسجيل نتائج الفحوصات المخبرية"
          />

          {/* عداد النتائج المسجلة */}
          {(() => {
            const validResults = results.filter(r => {
              // تحقق من أن العينة موجودة في إجراء
              const sampleExists = procedures.some(p =>
                p.samples?.some((s: any) => s.id === r.sample_id)
              );
              return sampleExists && r.approval_status !== 'rejected';
            });

            return validResults.length > 0 ? (
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-3 bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-3 rounded-xl border-2 border-green-200 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-bold text-green-800">
                    عدد النتائج المسجلة: {validResults.length}
                  </span>
                </div>
              </div>
            ) : null;
          })()}

          {/* خانة البحث */}
          <div className="mb-6">
            <SearchInputWithPaste
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="ابحث برقم الإجراء الداخلي أو الخارجي..."
            />
          </div>

          {/* قائمة الإجراءات */}
          <div className="space-y-4">
            {paginatedProcedures.map((procedure) => {
              const isExpanded = expandedProcedures.has(procedure.id);
              const totalSamples = procedure.samples?.reduce((sum: number, sample: any) => sum + (sample.sample_count || 0), 0) || 0;

              // حساب عدد العينات المفحوصة وغير المفحوصة
              const testedSamplesCount = procedure.samples?.filter((sample: any) =>
                results.some(r => r.sample_id === sample.id)
              ).length || 0;

              const notTestedSamplesCount = (procedure.samples?.length || 0) - testedSamplesCount;
              const totalSamplesCount = procedure.samples?.length || 0;
              const completionPercentage = totalSamplesCount > 0 ? Math.round((testedSamplesCount / totalSamplesCount) * 100) : 0;

              return (
                <div key={procedure.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* رأس الإجراء */}
                  <div className="w-full p-3 text-right hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between gap-3">
                      {/* أيقونة التوسيع */}
                      <button
                        onClick={() => toggleProcedure(procedure.id)}
                        className="flex items-center gap-2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-secondary-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-secondary-600" />
                        )}
                      </button>

                      {/* معلومات الإجراء */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-right flex-1">
                            <h3 className="text-base font-bold text-gray-900">
                              {procedure.internal_procedure_number}
                            </h3>
                            {procedure.external_procedure_number && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                رقم الإجراء الخارجي: {procedure.external_procedure_number}
                              </p>
                            )}
                            <p className="text-xs text-gray-600">
                              {procedure.client_name} • {procedure.reception_date} • إجمالي العينات: {totalSamples}
                            </p>
                          </div>


                          {/* نسبة الإنجاز */}
                          <div className="text-left min-w-[180px]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-xl font-bold ${
                                completionPercentage === 100
                                  ? 'text-green-600'
                                  : completionPercentage === 0
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}>
                                {completionPercentage}%
                              </span>
                              <span className="text-xs text-gray-500">نسبة الإنجاز</span>
                            </div>

                            {/* شريط التقدم */}
                            <div className={`w-full rounded-full h-2 mb-1 ${
                              completionPercentage === 0 ? 'bg-red-400' : 'bg-gray-200'
                            }`}>
                              {completionPercentage > 0 && (
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    completionPercentage === 100
                                      ? 'bg-green-400'
                                      : 'bg-yellow-400'
                                  }`}
                                  style={{ width: `${completionPercentage}%` }}
                                ></div>
                              )}
                            </div>

                            {/* إحصائيات العينات وتنبيه */}
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span className="text-gray-600">
                                  تم: <span className="font-semibold text-green-700">{testedSamplesCount}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                <span className="text-gray-600">
                                  لم يفحص: <span className="font-semibold text-gray-700">{notTestedSamplesCount}</span>
                                </span>
                              </div>
                              {notTestedSamplesCount > 0 && (
                                <div className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span className="text-amber-800 font-semibold">متبقي</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* زر إرسال النتائج */}
                          {testedSamplesCount > 0 && (() => {
                            const procedureResults = procedure.samples
                              ?.map((sample: any) => results.find(r => r.sample_id === sample.id))
                              .filter((r: any) => r);

                            const pendingResults = procedureResults?.filter((r: any) => r.approval_status === 'pending') || [];
                            const rejectedResults = procedureResults?.filter((r: any) => r.approval_status === 'rejected') || [];
                            const draftResults = procedureResults?.filter((r: any) => r.approval_status === 'draft' || !r.approval_status || r.approval_status === 'rejected') || [];
                            const hasRejectedResults = rejectedResults.length > 0;

                            // يمكن الإرسال إذا كانت هناك نتائج draft (جديدة أو معدلة)
                            const canSend = draftResults.length > 0;

                            return (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canSend) {
                                      handleSendResults(procedure);
                                    }
                                  }}
                                  disabled={!canSend}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 shadow-md text-sm font-semibold ${
                                    !canSend
                                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-[#61bf69] to-[#50a857] text-white hover:from-[#50a857] hover:to-[#61bf69] hover:shadow-lg'
                                  }`}
                                  title={canSend ? `إرسال ${draftResults.length} نتيجة` : 'لا توجد نتائج جديدة للإرسال'}
                                >
                                  <Send className="w-4 h-4" />
                                  <span>إرسال النتائج {draftResults.length > 0 && `(${draftResults.length})`}</span>
                                </button>
                                {pendingResults.length > 0 && (
                                  <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span className="text-amber-800 text-sm font-semibold">
                                      {pendingResults.length} {pendingResults.length === 1 ? 'عينة' : pendingResults.length === 2 ? 'عينتين' : 'عينات'} بانتظار الاعتماد
                                    </span>
                                  </div>
                                )}
                                {hasRejectedResults && (
                                  <div className="flex items-center gap-2 bg-red-100 px-3 py-1.5 rounded-lg border-2 border-red-400 animate-pulse">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <span className="text-red-800 text-sm font-bold">
                                      {rejectedResults.length} {rejectedResults.length === 1 ? 'نتيجة مرفوضة' : rejectedResults.length === 2 ? 'نتيجتين مرفوضتين' : 'نتائج مرفوضة'} - يتطلب تعديل فوري
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* العينات */}
                  {isExpanded && procedure.samples && procedure.samples.length > 0 && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {procedure.samples.map((sample: any) => {
                          const status = getSampleStatus(sample.id);
                          const StatusIcon = status.icon;
                          const result = results.find(r => r.sample_id === sample.id);
                          
                          const isRejected = result?.approval_status === 'rejected';

                          return (
                            <div key={sample.id} className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200 ${
                              isRejected ? 'border-2 border-red-400 animate-pulse' : 'border border-gray-200'
                            }`}>
                              {/* تنبيه مرفوضة */}
                              {isRejected && (
                                <div className="mb-3 p-2 bg-red-50 border-2 border-red-300 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div className="text-right flex-1">
                                      <p className="text-red-800 font-bold text-sm">نتيجة مرفوضة</p>
                                      <p className="text-red-700 text-xs mt-0.5">يجب تعديل النتيجة وإعادة إرسالها</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* حالة العينة */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  {result && (
                                    <>
                                      <button
                                        onClick={() => openResultModal(sample, result)}
                                        className={`p-1.5 rounded-full transition-colors ${
                                          isRejected
                                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50 animate-bounce'
                                            : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                                        }`}
                                        title={isRejected ? "تعديل النتيجة المرفوضة" : "تعديل"}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      {hasPermission('delete_lab_result') && (
                                        <button
                                          onClick={() => handleDeleteResult(sample.id)}
                                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                          title="حذف"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                  <StatusIcon className="w-3 h-3 ml-1" />
                                  {status.label}
                                </span>
                              </div>

                              {/* معلومات العينة */}
                              <div className="space-y-2 text-sm text-right">
                                <div>
                                  <span className="font-semibold text-gray-700">رقم العينة: </span>
                                  <span className="text-gray-900">{sample.sample_number || 'غير محدد'}</span>
                                </div>
                                {procedure.external_procedure_number && (
                                  <div>
                                    <span className="font-semibold text-gray-700">رقم الإجراء الخارجي: </span>
                                    <span className="text-blue-600 font-medium">{procedure.external_procedure_number}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold text-gray-700">الفحص المطلوب: </span>
                                  <span className="text-gray-900">{sample.requested_test}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">نوع العينة: </span>
                                  <span className="text-gray-900">{sample.sample_type}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">نوع الحيوان: </span>
                                  <span className="text-gray-900">{sample.animal_type || 'غير محدد'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">عدد العينات: </span>
                                  <span className="text-secondary-600 font-bold">{sample.sample_count}</span>
                                </div>

                                {/* معلومات النتيجة */}
                                {result && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="space-y-1">
                                      <div>
                                        <span className="font-semibold text-gray-700">طريقة الاختبار: </span>
                                        <span className="text-gray-900">{result.test_method}</span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-gray-700">العينات الإيجابية: </span>
                                        <span className="text-red-600 font-bold">{result.positive_samples}</span>
                                      </div>
                                      {result.specialists && result.specialists.length > 0 && (
                                        <div>
                                          <span className="font-semibold text-gray-700">الأخصائيون: </span>
                                          <span className="text-gray-900">{result.specialists.join(', ')}</span>
                                        </div>
                                      )}
                                      {result.approved_by && (
                                        <div>
                                          <span className="font-semibold text-gray-700">معتمد النتائج: </span>
                                          <span className="text-blue-600 font-semibold">{result.approved_by}</span>
                                        </div>
                                      )}
                                      {result.is_vaccination_efficiency_test && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                                          <div className="font-semibold text-blue-600">اختبار كفاءة تحصين</div>
                                          <div className="text-blue-700 mt-1 font-bold">
                                            نسبة الكفاءة: {result.vaccination_efficiency_percentage}%
                                          </div>
                                        </div>
                                      )}
                                      {result.confirmatory_test && (result.confirmatory_test.test_type || result.confirmatory_test.method) && (
                                        <div className="mt-2 p-2 bg-primary-50 rounded text-xs">
                                          <div className="font-semibold text-primary-800">الاختبار التأكيدي:</div>
                                          <div className="text-primary-700 mt-1">
                                            <div>الطريقة: {result.confirmatory_test.method || result.confirmatory_test.test_type}</div>
                                            <div>إيجابي بعد التأكيد: {result.confirmatory_test.positive_count || result.confirmatory_test.positive_samples || 0}</div>
                                          </div>
                                        </div>
                                      )}
                                      {result.notes && (
                                        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs border border-yellow-200">
                                          <div className="font-semibold text-yellow-800">ملاحظات:</div>
                                          <div className="text-yellow-900 mt-1">{result.notes}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* زر إضافة نتيجة */}
                              {!result && (
                                <button
                                  onClick={() => openResultModal(sample)}
                                  className="w-full mt-3 bg-secondary-500 text-white py-2 px-4 rounded-lg hover:bg-secondary-600 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  إضافة نتيجة
                                </button>
                              )}
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
          {filteredProcedures.length > 0 && totalPages > 1 && (
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

          {filteredProcedures.length === 0 && !proceduresLoading && (
            <div className="text-center py-12">
              <TestTube2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'لا توجد إجراءات مطابقة لعملية البحث' : 'لا توجد إجراءات لتسجيل النتائج'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* نافذة تسجيل النتيجة */}
      {showResultModal && selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* رأس النافذة */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    setSelectedSample(null);
                    reset();
                    setSelectedSpecialists([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center flex-1">
                  <div className="flex justify-center mb-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#003361] to-[#004d8c] rounded-2xl flex items-center justify-center shadow-xl">
                      <TestTube2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    تسجيل نتيجة العينة
                  </h3>
                </div>
                <div className="w-10"></div>
              </div>

              {/* معلومات العينة */}
              <div className="bg-primary-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-primary-900 mb-2 text-right">معلومات العينة</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-right">
                  <div>
                    <span className="font-semibold">رقم العينة: </span>
                    <span>{selectedSample.sample_number || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="font-semibold">الفحص المطلوب: </span>
                    <span>{selectedSample.requested_test}</span>
                  </div>
                  <div>
                    <span className="font-semibold">نوع العينة: </span>
                    <span>{selectedSample.sample_type}</span>
                  </div>
                  <div>
                    <span className="font-semibold">نوع الحيوان: </span>
                    <span>{selectedSample.animal_type || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="font-semibold">عدد العينات: </span>
                    <span className="text-secondary-600 font-bold">{selectedSample.sample_count}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* طريقة الاختبار */}
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة الاختبار <span className="text-red-500">*</span>
                  </label>
                  {watchedTestMethod === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_test_method')}
                        className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                        placeholder="اكتب طريقة الاختبار..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('test_method', '');
                          setValue('custom_test_method', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('test_method')}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                    >
                      <option value="">اختر طريقة الاختبار</option>
                      {testMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.test_method && (
                    <p className="text-red-500 text-sm mt-1">{errors.test_method.message}</p>
                  )}
                  {errors.custom_test_method && (
                    <p className="text-red-500 text-sm mt-1">{errors.custom_test_method.message}</p>
                  )}
                </div>

                {/* عدد العينات الإيجابية */}
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عدد العينات الإيجابية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedSample.sample_count}
                    {...register('positive_samples', { valueAsNumber: true })}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  />
                  {errors.positive_samples && (
                    <p className="text-red-500 text-sm mt-1">{errors.positive_samples.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    الحد الأقصى: {selectedSample.sample_count}
                  </p>
                </div>

                {/* اختبار كفاءة تحصين */}
                <div className="text-right">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('is_vaccination_efficiency_test')}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-[#61bf69]"
                    />
                    <span className="text-sm font-medium text-gray-700">اختبار كفاءة تحصين</span>
                  </label>
                </div>

                {/* نسبة كفاءة التحصين */}
                {watchedIsVaccinationTest && (
                  <div className="text-right bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      نسبة كفاءة التحصين
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600">%</span>
                      <input
                        type="text"
                        value={selectedSample.sample_count > 0 ? ((watchedPositiveSamples / selectedSample.sample_count) * 100).toFixed(2) : '0.00'}
                        readOnly
                        className="flex-1 px-3 h-[50px] border border-blue-300 rounded-lg bg-white text-right font-bold text-blue-600 text-lg"
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      المعادلة: (عدد العينات الإيجابية ÷ عدد العينات × 100)
                    </p>
                  </div>
                )}

                {/* الاختبار التأكيدي */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 text-right">الاختبار التأكيدي (في حال تم إجراء إختبار تأكيدي)</h4>
                  
                  <div className="space-y-4">
                    {/* طريقة الاختبار التأكيدي */}
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        طريقة الاختبار التأكيدي
                      </label>
                      {watchedConfirmatoryMethod === 'أخرى' ? (
                        <div className="relative">
                          <input
                            {...register('custom_confirmatory_method')}
                            className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                            placeholder="اكتب طريقة الاختبار التأكيدي..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setValue('confirmatory_test_method', '');
                              setValue('custom_confirmatory_method', '');
                            }}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <select
                          {...register('confirmatory_test_method')}
                          className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                        >
                          <option value="">اختر طريقة الاختبار التأكيدي</option>
                          {testMethods.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.custom_confirmatory_method && (
                        <p className="text-red-500 text-sm mt-1">{errors.custom_confirmatory_method.message}</p>
                      )}
                    </div>

                    {/* عدد العينات الإيجابية بعد التأكيد */}
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عدد العينات الإيجابية بعد التأكيد
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={watchedPositiveSamples}
                        {...register('confirmatory_positive_samples', { valueAsNumber: true })}
                        className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        الحد الأقصى: {watchedPositiveSamples}
                      </p>
                    </div>
                  </div>
                </div>

                {/* النتيجة المستنتجة تلقائياً */}
                <div className="text-right p-4 bg-primary-50/60 rounded-lg border border-primary-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">النتيجة المستنتجة تلقائياً:</span>
                      <p className="text-xs text-gray-500 mt-1">بناءً على عدد العينات الإيجابية</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                      (() => {
                        const result = calculateTestResult(
                          watchedPositiveSamples || 0,
                          watchedConfirmatoryPositive,
                          !!watchedConfirmatoryMethod,
                          watchedIsVaccinationTest || false
                        );
                        if (result === 'كفاءة تحصين') return 'bg-blue-100 text-blue-800 border border-blue-300';
                        if (result === 'إيجابي' || result === 'إيجابي بعد التأكيد') return 'bg-red-100 text-red-800 border border-red-300';
                        return 'bg-green-100 text-green-800 border border-green-300';
                      })()
                    }`}>
                      {(() => {
                        const result = calculateTestResult(
                          watchedPositiveSamples || 0,
                          watchedConfirmatoryPositive,
                          !!watchedConfirmatoryMethod,
                          watchedIsVaccinationTest || false
                        );
                        if (result === 'إيجابي') return '✗ إيجابي';
                        if (result === 'سلبي') return '✓ سلبي';
                        return result;
                      })()}
                    </div>
                  </div>
                </div>

                {/* الملاحظات */}
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right resize-y min-h-[80px]"
                    placeholder="أضف أي ملاحظات..."
                  />
                </div>

                {/* الأخصائيين */}
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الأخصائيين <span className="text-red-500">*</span>
                  </label>

                  {/* الأخصائيين المختارين */}
                  {selectedSpecialists.length > 0 && (
                    <div className="mb-2 p-2 bg-gradient-to-r from-secondary-50 to-secondary-100/50 rounded-lg border border-secondary-200">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {selectedSpecialists.map((specialist, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-white border border-secondary-300 text-secondary-800 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={() => removeSpecialist(specialist)}
                              className="text-secondary-400 hover:text-red-600 transition-colors"
                              title="إزالة"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {specialist}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* قائمة منسدلة للأخصائيين */}
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSpecialistToggle(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right appearance-none bg-white"
                      defaultValue=""
                    >
                      <option value="">اختر أخصائي...</option>
                      {specialists.filter(s => s !== 'أخرى' && !selectedSpecialists.includes(s)).map((specialist) => (
                        <option key={specialist} value={specialist}>
                          {specialist}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* زر إضافة أخصائي مخصص */}
                  {!showCustomSpecialist && (
                    <button
                      type="button"
                      onClick={() => setShowCustomSpecialist(true)}
                      className="mt-2 text-xs text-secondary-600 hover:text-secondary-800 underline flex items-center gap-1 mr-auto"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة أخصائي جديد
                    </button>
                  )}

                  {/* حقل الأخصائي المخصص */}
                  {showCustomSpecialist && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const customName = (document.getElementById('custom_specialist') as HTMLInputElement)?.value;
                          if (customName) {
                            addCustomSpecialist(customName);
                          }
                        }}
                        className="bg-secondary-600 text-white px-4 py-2 rounded-lg hover:bg-secondary-700 transition-colors text-sm"
                      >
                        إضافة
                      </button>
                      <input
                        id="custom_specialist"
                        {...register('custom_specialist')}
                        className="flex-1 px-3 h-[40px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right text-sm"
                        placeholder="اسم الأخصائي..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSpecialist(false);
                          setValue('custom_specialist', '');
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {errors.specialists && (
                    <p className="text-red-500 text-xs mt-1">{errors.specialists.message}</p>
                  )}
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-4 justify-center pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResultModal(false);
                      setSelectedSample(null);
                      reset();
                      setSelectedSpecialists([]);
                    }}
                    disabled={isSaving}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-secondary-600 text-white px-6 py-2 rounded-lg hover:bg-secondary-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ النتيجة
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && resultToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-3">
                هل أنت متأكد من حذف نتيجة هذه العينة؟
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                <p className="text-red-800 font-semibold text-sm mb-1">تحذير:</p>
                <p className="text-red-700 text-sm">
                  سيتم حذف النتيجة نهائياً من قاعدة البيانات بما في ذلك النتائج المرتبطة في قاعدة بيانات المحجر إن وجدت.
                </p>
                <p className="text-red-800 font-bold text-sm mt-2">
                  لن تتمكن من استعادة هذه البيانات مستقبلاً
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-8 text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">تم الحفظ بنجاح</h3>
              <p className="text-gray-600 mb-6 text-lg">
                تم حفظ نتيجة العينة بنجاح
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-[#61bf69] text-white py-3 rounded-lg hover:bg-[#50a857] transition-colors font-bold text-lg shadow-md"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}