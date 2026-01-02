import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, X, TestTube2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProcedures, type Sample } from '../../../hooks/useProcedures';

const editProcedureSchema = z.object({
  client_name: z.string().min(1, 'اسم العميل/الباخرة مطلوب'),
  reception_date: z.string().min(1, 'تاريخ الإجراء المخبري مطلوب'),
  procedure_number: z.string().min(1, 'رقم الإجراء المخبري مطلوب'),
  civil_record: z.string().optional(),
  external_procedure_number: z.string().min(1, 'رقم الإجراء الخارجي مطلوب'),
  external_procedure_date: z.string().optional(),
  country_port: z.string().min(1, 'بلد المنشأ مطلوب'),
  custom_country_port: z.string().optional(),
  sample_source: z.string().min(1, 'مكان ورود العينة مطلوب'),
  custom_sample_origin: z.string().optional(),
  receiver_name: z.string().min(1, 'اسم مستلم العينة مطلوب'),
  custom_receiver_name: z.string().optional(),

  samples: z.array(z.object({
    id: z.string().optional(),
    sample_number: z.string().optional(),
    section: z.string().min(1, 'القسم مطلوب'),
    section_other: z.string().optional(),
    required_test: z.string().min(1, 'الفحص المطلوب مطلوب'),
    required_test_other: z.string().optional(),
    sample_type: z.string().min(1, 'نوع العينة مطلوب'),
    sample_type_other: z.string().optional(),
    animal_type: z.string().min(1, 'نوع الحيوان مطلوب'),
    animal_type_other: z.string().optional(),
    sample_count: z.number().min(1, 'عدد العينات مطلوب'),
    notes: z.string().optional(),
  })).min(1, 'يجب إضافة عينة واحدة على الأقل'),

  temperature: z.enum(['appropriate', 'inappropriate']),
  preservation_method: z.enum(['appropriate', 'inappropriate']),
  sample_data: z.enum(['correct', 'incorrect']),
  sample_count_accuracy: z.enum(['correct', 'incorrect']),
  quality_notes: z.string().optional(),
});

type EditProcedureForm = z.infer<typeof editProcedureSchema>;

const sections = [
  { value: 'bacteriology', label: 'البكتيريا' },
  { value: 'Virology', label: 'الفيروسات' },
  { value: 'parasitology', label: 'الطفيليات' },
  { value: 'poultry', label: 'الدواجن' },
  { value: 'Molecular biology', label: 'الأحياء الجزيئية' },
  { value: 'other', label: 'أخرى' },
];

const testsBySection: Record<string, string[]> = {
  bacteriology: [
    'الحمى المالطية (البروسيلا)',
    'التسمم الدموي (HS) باستريلا',
    'التسمم المعوي (ET) كلستريديم',
    'السالمونيلا',
    'أي كولاي (E.coli)',
    'نظير السل (جونز)',
    'الحمى المجهولة (Q fever)',
    'التهاب الضرع',
    'الكلاميديا',
    'ليستريا',
    'مرض مورل',
    'السل الكاذب',
    'الكامبيلوباكتر',
    'الليبتوسبيرا',
    'الإلتهاب الرئوي البلوري في الماعز (أبو رمح ) (ccpp)',
    'رعام الخيل (Glanders)',
    'خناق الخيل (Strangles)',
    'التهاب رئوي (مانهيميا)',
    'أخرى'
  ],
  Virology: [
    'طاعون المجترات الصغيرة (PPR)',
    'الحمى القلاعية (FMD)',
    'اللسان الأزرق (BTV)',
    'الإسهال البقري الفيروسي (BVD)',
    'هربس الأبقار (pi3)',
    'الحمى النزلية الخبيثة في الأبقار (MCF)',
    'جدري الأغنام (sheep pox)',
    'أي عينة سائل منوي',
    'سرطان الأبقار (Bovine Leukosis)',
    'أنفلونزا الخيول',
    'فيروس كورونا و الروتا',
    'التهاب الأنف البقري المعدي (IBR)',
    'هربس الخيول',
    'حمى غرب النيل',
    'التهاب الدماغ الخيلي',
    'التهاب الفم البثري (Orf)',
    'مرض السعار',
    'طاعون الخيل الافريقى',
    'حمى الوادى المتصدع (RVF)',
    'نضير الانفلونزا النوع -3',
    'جدرى الجمال',
    'متلازمة الشرق الاوسط التنفسية',
    'حمى الثلاث ايام في الابقار',
    'حمى النزف الوبائية ( EHDV)',
    'التهاب الجلد العقدى في الابقر(LSDV)',
    'التهاب شرايين الخيل',
    'مرض انيميا الخيل المعدى',
    'كفاءة التحصين ضد مرض حمى الوادي المتصدع (RVF)',
    'أخرى'
  ],
  parasitology: [
    'بروتوزوا الدم (Blood Protozoa)',
    'الطفيليات الداخلية (Internal Parasites)',
    'الطفيليات الخارجية (External Parasites)',
    'أخرى'
  ],
  poultry: [
    'نيوكاسل',
    'التهاب الشعب المعدي (IB)',
    'مرض الجدرى في الطيور (Fowl pox)',
    'ماركس (marek\'s disease)',
    'فيروس الريو (Reo virus)',
    'ليكوزس الدجاج (Avian Leukosis)',
    'جاليد هربس فيرس – 1 (ILT)',
    'مرض الجمبورو (IBDV)',
    'مرض الادينو Avian Adeno virus',
    'انفلونزا الطيور',
    'السالمونيلا',
    'أخرى'
  ],
  'Molecular biology': [
    'أنفلونزا الخيول',
    'أي عينة سائل منوي',
    'أي كولاي (E.coli)',
    'الإسهال البقري الفيروسي (BVD)',
    'الإلتهاب الرئوي البلوري في الماعز (أبو رمح ) (ccpp)',
    'التسمم الدموي (HS) باستريلا',
    'التسمم المعوي (ET) كلستريديم',
    'التهاب الأنف البقري المعدي (IBR)',
    'التهاب الجلد العقدى في الابقر(LSDV)',
    'التهاب الدماغ الخيلي',
    'التهاب الشعب المعدي (IB)',
    'التهاب الضرع',
    'التهاب الفم البثري (Orf)',
    'التهاب رئوي (مانهيميا)',
    'التهاب شرايين الخيل',
    'الحمى القلاعية (FMD)',
    'الحمى المالطية (البروسيلا)',
    'الحمى المجهولة (Q fever)',
    'الحمى النزلية الخبيثة في الأبقار (MCF)',
    'الطفيليات الخارجية (External Parasites)',
    'الطفيليات الداخلية (Internal Parasites)',
    'الكامبيلوباكتر',
    'الكلاميديا',
    'الليبتوسبيرا',
    'اللسان الأزرق (BTV)',
    'السالمونيلا',
    'السل الكاذب',
    'انفلونزا الطيور',
    'بروتوزوا الدم (Blood Protozoa)',
    'جاليد هربس فيرس – 1 (ILT)',
    'جدري الأغنام (sheep pox)',
    'جدرى الجمال',
    'حمى الثلاث ايام في الابقار',
    'حمى الوادى المتصدع (RVF)',
    'حمى النزف الوبائية ( EHDV)',
    'حمى غرب النيل',
    'خناق الخيل (Strangles)',
    'رعام الخيل (Glanders)',
    'سرطان الأبقار (Bovine Leukosis)',
    'طاعون الخيل الافريقى',
    'طاعون المجترات الصغيرة (PPR)',
    'فيروس الريو (Reo virus)',
    'فيروس كورونا و الروتا',
    'كفاءة التحصين ضد مرض حمى الوادي المتصدع (RVF)',
    'ليستريا',
    'ليكوزس الدجاج (Avian Leukosis)',
    'ماركس (marek\'s disease)',
    'متلازمة الشرق الاوسط التنفسية',
    'مرض الادينو Avian Adeno virus',
    'مرض الجدرى في الطيور (Fowl pox)',
    'مرض الجمبورو (IBDV)',
    'مرض السعار',
    'مرض انيميا الخيل المعدى',
    'مرض مورل',
    'نضير الانفلونزا النوع -3',
    'نظير السل (جونز)',
    'نيوكاسل',
    'هربس الأبقار (pi3)',
    'هربس الخيول',
    'أخرى'
  ],
  other: []
};

const countryPortOptions = [
  'المملكة العربية السعودية',
  'جيبوتي - جيبوتي',
  'السودان - سواكن',
  'الصومال - بربره',
  'الصومال - بوصاصو',
  'رومانيا - ميديا',
  'رومانيا - بريلاء',
  'جورجيا - باتومي',
  'جورجيا - بوتي',
  'اسبانيا - كارتاجينا',
  'اسبانيا - تارجوانا',
  'اسبانيا - كوراليجو',
  'تركيا - افياب',
  'تركيا - اسكندرون',
  'أوكرانيا - نيكوليف',
  'أوكرانيا - اوشاكوف',
  'كولمبيا - كارتاخينا',
  'البرازيل - فيلادي كواندا',
  'الهند - جواهرلال',
  'الصين - داليان',
  'الاوروغواي - مونتفيديو',
  'تايلندا - لايم تشايانج',
  'مولدوفيا - جورجيوليستس',
  'قبرص',
  'استراليا',
  'سوريا',
  'الخمرة',
  'أخرى'
];

const sampleOriginOptions = [
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

const receiverNameOptions = [
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

interface EditProcedureProps {
  procedure: SavedSample & { samples: Sample[] };
  onClose: () => void;
}

type SavedSample = import('../../../hooks/useProcedures').SavedSample;

export default function EditProcedure({ procedure, onClose }: EditProcedureProps) {
  const { updateProcedure } = useProcedures();
  const [showCustomCountryPort, setShowCustomCountryPort] = useState(false);
  const [showCustomSampleOrigin, setShowCustomSampleOrigin] = useState(false);
  const [showCustomReceiverName, setShowCustomReceiverName] = useState(false);
  const [showCustomSections, setShowCustomSections] = useState<{[key: number]: boolean}>({});
  const [showCustomTests, setShowCustomTests] = useState<{[key: number]: boolean}>({});
  const [expandedSamples, setExpandedSamples] = useState<{[key: number]: boolean}>({});

  // جعل جميع العينات مطوية افتراضياً
  useEffect(() => {
    const allCollapsed: {[key: number]: boolean} = {};
    procedure.samples.forEach((_, index) => {
      allCollapsed[index] = false;
    });
    setExpandedSamples(allCollapsed);

    // Initialize custom field states based on procedure data
    setShowCustomCountryPort(procedure.country_port === 'أخرى');
    setShowCustomSampleOrigin(procedure.sample_origin === 'أخرى');
    setShowCustomReceiverName(procedure.receiver_name === 'أخرى');
  }, [procedure]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditProcedureForm>({
    resolver: zodResolver(editProcedureSchema),
    defaultValues: {
      client_name: procedure.client_name,
      reception_date: procedure.reception_date,
      procedure_number: procedure.internal_procedure_number,
      civil_record: procedure.civil_record || '',
      external_procedure_number: procedure.external_procedure_number || undefined,
      external_procedure_date: procedure.external_procedure_date || undefined,
      country_port: procedure.country_port || undefined,
      sample_source: procedure.sample_origin,
      receiver_name: procedure.receiver_name,
      samples: procedure.samples.map((s: Sample) => ({
        id: s.id,
        sample_number: s.sample_number,
        section: s.department,
        required_test: s.requested_test,
        sample_type: s.sample_type,
        animal_type: s.animal_type,
        sample_count: s.sample_count,
        notes: s.notes || '',
      })),
      temperature: procedure.quality_check?.temperature || 'appropriate',
      preservation_method: procedure.quality_check?.preservation_method || 'appropriate',
      sample_data: procedure.quality_check?.sample_data || 'correct',
      sample_count_accuracy: procedure.quality_check?.sample_count_accuracy || 'correct',
      quality_notes: procedure.quality_check?.notes || '',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'samples'
  });

  const watchedSamples = watch('samples');

  // تحديث أرقام العينات تلقائياً
  useEffect(() => {
    if (watchedSamples) {
      watchedSamples.forEach((sample: any, index: number) => {
        const currentValue = sample?.sample_number;
        const autoNumber = (index + 1).toString();
        // إذا كان الحقل فارغاً أو يساوي الرقم التلقائي السابق، قم بتحديثه
        if (!currentValue || /^\d+$/.test(currentValue)) {
          setValue(`samples.${index}.sample_number`, autoNumber);
        }
      });
    }
  }, [watchedSamples?.length, setValue]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'country_port') {
        setShowCustomCountryPort(value.country_port === 'أخرى');
      }
      if (name === 'sample_source') {
        setShowCustomSampleOrigin(value.sample_source === 'أخرى');
      }
      if (name === 'receiver_name') {
        setShowCustomReceiverName(value.receiver_name === 'أخرى');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const watchedValues = watch();

  // مراقبة تغيير خيارات الجودة وحذف الملاحظات إذا أصبحت كل الخيارات مناسبة
  useEffect(() => {
    const allAppropriate =
      watchedValues.temperature === 'appropriate' &&
      watchedValues.preservation_method === 'appropriate' &&
      watchedValues.sample_data === 'correct' &&
      watchedValues.sample_count_accuracy === 'correct';

    if (allAppropriate) {
      setValue('quality_notes', '');
    }
  }, [
    watchedValues.temperature,
    watchedValues.preservation_method,
    watchedValues.sample_data,
    watchedValues.sample_count_accuracy,
    setValue
  ]);

  fields.forEach((_, index) => {
    const section = watch(`samples.${index}.section`);
    if (section === 'other' && !showCustomSections[index]) {
      setShowCustomSections(prev => ({ ...prev, [index]: true }));
    } else if (section !== 'other' && showCustomSections[index]) {
      setShowCustomSections(prev => ({ ...prev, [index]: false }));
    }

    const test = watch(`samples.${index}.required_test`);
    if (test === 'أخرى' && !showCustomTests[index]) {
      setShowCustomTests(prev => ({ ...prev, [index]: true }));
    } else if (test !== 'أخرى' && showCustomTests[index]) {
      setShowCustomTests(prev => ({ ...prev, [index]: false }));
    }
  });

  const needsQualityNotes =
    watchedValues.temperature === 'inappropriate' ||
    watchedValues.preservation_method === 'inappropriate' ||
    watchedValues.sample_data === 'incorrect' ||
    watchedValues.sample_count_accuracy === 'incorrect';

  const onSubmit = async (data: EditProcedureForm) => {
    try {
      const updatedProcedureData = {
        client_name: data.client_name,
        reception_date: data.reception_date,
        internal_procedure_number: data.procedure_number,
        civil_record: data.civil_record || null,
        external_procedure_number: data.external_procedure_number,
        external_procedure_date: data.external_procedure_date || null,
        country_port: data.country_port === 'أخرى' ? data.custom_country_port! : data.country_port,
        sample_origin: data.sample_source === 'أخرى' ? data.custom_sample_origin! : data.sample_source,
        receiver_name: data.receiver_name === 'أخرى' ? data.custom_receiver_name! : data.receiver_name,
        samples: data.samples.map((sample, index) => ({
          id: sample.id,
          sample_number: sample.sample_number || `${data.procedure_number}-${index + 1}`,
          department: sample.section === 'other' && sample.section_other ? sample.section_other : sample.section,
          requested_test: sample.required_test,
          sample_type: sample.sample_type === 'أخرى' && sample.sample_type_other ? sample.sample_type_other : sample.sample_type,
          animal_type: sample.animal_type === 'أخرى' && sample.animal_type_other ? sample.animal_type_other : sample.animal_type,
          sample_count: sample.sample_count,
          notes: sample.notes || null,
        })),
        quality_check: {
          temperature: data.temperature,
          preservation_method: data.preservation_method,
          sample_data: data.sample_data,
          sample_count_accuracy: data.sample_count_accuracy,
          notes: data.quality_notes || null,
        },
      };

      await updateProcedure(procedure.id, updatedProcedureData);
      onClose();
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast.error('فشل في تحديث الإجراء');
    }
  };

  const toggleSampleExpansion = (index: number) => {
    setExpandedSamples(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // دالة للتحقق من صحة بيانات العينة
  const isSampleValid = (index: number): boolean => {
    const sample = watchedSamples?.[index];
    if (!sample) return false;

    return !!(
      sample.section &&
      sample.section.trim() &&
      sample.required_test &&
      sample.required_test.trim() &&
      sample.sample_type &&
      sample.sample_type.trim() &&
      sample.animal_type &&
      sample.animal_type.trim() &&
      sample.sample_count !== undefined &&
      typeof sample.sample_count === 'number'
    );
  };

  // دالة للتحقق من صحة البيانات الأساسية
  const isBasicDataValid = (): boolean => {
    return !!(
      watch('client_name') &&
      watch('reception_date') &&
      watch('external_procedure_number') &&
      watch('country_port') &&
      watch('sample_source') &&
      watch('receiver_name')
    );
  };

  // دالة للتحقق من صحة بيانات العينات
  const areSamplesValid = (): boolean => {
    const samples = watchedSamples || [];
    if (samples.length === 0) return false;
    return samples.every((_, index) => isSampleValid(index));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#003361] to-[#004080] text-white p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center flex-1">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl flex items-center justify-center shadow-lg">
                <TestTube2 className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <span>تعديل الإجراء: {procedure.internal_procedure_number}</span>
              <TestTube2 className="w-5 h-5" />
            </h2>
          </div>
          <div className="w-8"></div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`border-2 rounded-xl p-4 transition-all ${
              !isBasicDataValid() ? 'bg-red-50/80 border-red-300' : 'bg-[#003361]/5 border-[#003361]/20'
            }`}>
              <h3 className="text-lg font-bold mb-4 text-right flex items-center justify-start gap-2">
                <span className={!isBasicDataValid() ? 'text-red-700' : 'text-[#003361]'}>البيانات الأساسية</span>
                {!isBasicDataValid() && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقول إلزامية مفقودة
                  </span>
                )}
                <div className={`w-2.5 h-2.5 rounded-full ${!isBasicDataValid() ? 'bg-red-500' : 'bg-[#003361]'}`}></div>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم العميل/الباخرة <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('client_name')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                  {errors.client_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.client_name.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الإجراء المخبري <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('reception_date')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                  {errors.reception_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.reception_date.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الإجراء المخبري <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('procedure_number')}
                      readOnly
                      className="w-full px-4 h-[50px] border-2 border-gray-300 rounded-xl bg-gray-100 text-right font-mono text-lg font-bold text-gray-700 shadow-inner cursor-not-allowed"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        غير قابل للتعديل
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الإجراء الخارجي <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('external_procedure_number')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                  {errors.external_procedure_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.external_procedure_number.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الإجراء الخارجي
                  </label>
                  <input
                    type="date"
                    {...register('external_procedure_date')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    السجل المدني
                  </label>
                  <input
                    {...register('civil_record')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    بلد المنشأ <span className="text-red-500">*</span>
                  </label>
                  {watch('country_port') === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_country_port')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="أدخل بلد المنشأ"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('country_port', '');
                          setValue('custom_country_port', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('country_port')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                    >
                      <option value="">اختر...</option>
                      {countryPortOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  {errors.country_port && (
                    <p className="text-red-500 text-sm mt-1">{errors.country_port.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مكان ورود العينة <span className="text-red-500">*</span>
                  </label>
                  {watch('sample_source') === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_sample_origin')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="أدخل مكان ورود العينة"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('sample_source', '');
                          setValue('custom_sample_origin', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('sample_source')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                    >
                      <option value="">اختر...</option>
                      {sampleOriginOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  {errors.sample_source && (
                    <p className="text-red-500 text-sm mt-1">{errors.sample_source.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم مستلم العينة <span className="text-red-500">*</span>
                  </label>
                  {watch('receiver_name') === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_receiver_name')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="أدخل اسم مستلم العينة"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('receiver_name', '');
                          setValue('custom_receiver_name', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('receiver_name')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                    >
                      <option value="">اختر...</option>
                      {receiverNameOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  {errors.receiver_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.receiver_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`border-2 rounded-xl p-4 transition-all ${
              !areSamplesValid() ? 'bg-red-50/80 border-red-300' : 'bg-[#00a651]/5 border-[#00a651]/20'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-right flex items-center gap-2">
                  <TestTube2 className={`w-5 h-5 ${!areSamplesValid() ? 'text-red-700' : 'text-[#00a651]'}`} />
                  <span className={!areSamplesValid() ? 'text-red-700' : 'text-[#00a651]'}>العينات</span>
                  {!areSamplesValid() && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-4 h-4" />
                      حقول إلزامية مفقودة
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => append({
                    sample_number: (fields.length + 1).toString(),
                    section: '',
                    section_other: '',
                    required_test: '',
                    required_test_other: '',
                    sample_type: '',
                    sample_type_other: '',
                    animal_type: '',
                    animal_type_other: '',
                    sample_count: 1,
                    notes: ''
                  })}
                  className="bg-[#00a651] hover:bg-[#008f44] text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="font-medium text-sm">إضافة عينة</span>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const sampleNumber = watchedSamples?.[index]?.sample_number || (index + 1).toString();
                  const isValid = isSampleValid(index);

                  return (
                  <div key={field.id} className={`bg-white border-2 rounded-xl overflow-hidden transition-all ${
                    !isValid ? 'border-red-400 shadow-red-200 shadow-lg' : 'border-gray-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => toggleSampleExpansion(index)}
                      className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        !isValid ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${!isValid ? 'text-red-700' : 'text-[#003361]'}`}>
                          عينة رقم {sampleNumber}
                        </span>
                        {!isValid && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                            <AlertCircle className="w-4 h-4" />
                            حقول إلزامية مفقودة
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          {watch(`samples.${index}.required_test`) || 'عينة جديدة'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {expandedSamples[index] ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </button>

                    {expandedSamples[index] && (
                      <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              رقم العينة
                              <span className="text-xs text-gray-500 mr-2">(تلقائي - قابل للتعديل)</span>
                            </label>
                            <div className="relative">
                              <input
                                {...register(`samples.${index}.sample_number`)}
                                placeholder={(index + 1).toString()}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-[#00a651]/5 font-semibold text-[#00a651]"
                              />
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <span className="bg-[#00a651]/20 text-[#00a651] px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                                  #
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              القسم <span className="text-red-500">*</span>
                            </label>
                            {watch(`samples.${index}.section`) === 'other' ? (
                              <div className="relative">
                                <input
                                  {...register(`samples.${index}.section_other`)}
                                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                                  placeholder="حدد القسم..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValue(`samples.${index}.section`, '');
                                    setValue(`samples.${index}.section_other`, '');
                                  }}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <select
                                {...register(`samples.${index}.section`)}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                              >
                                <option value="">اختر القسم</option>
                                {sections.map((section) => (
                                  <option key={section.value} value={section.value}>
                                    {section.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            {errors.samples?.[index]?.section && (
                              <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.section?.message}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              الفحص المطلوب <span className="text-red-500">*</span>
                            </label>
                            {watch(`samples.${index}.section`) === 'other' ||
                              (watch(`samples.${index}.section`) && !testsBySection[watch(`samples.${index}.section`)]) ? (
                              <input
                                {...register(`samples.${index}.required_test`)}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                                placeholder="حدد الفحص المطلوب..."
                              />
                            ) : (
                              <select
                                {...register(`samples.${index}.required_test`)}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                                disabled={!watch(`samples.${index}.section`)}
                              >
                                <option value="">اختر الفحص</option>
                                {watch(`samples.${index}.section`) &&
                                  testsBySection[watch(`samples.${index}.section`)]?.map((test) => (
                                    <option key={test} value={test}>
                                      {test}
                                    </option>
                                  ))}
                              </select>
                            )}
                            {errors.samples?.[index]?.required_test && (
                              <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.required_test?.message}</p>
                            )}
                          </div>

                          {watch(`samples.${index}.required_test`) === 'أخرى' && (
                            <div className="text-right">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                الفحص المطلوب (مخصص) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  {...register(`samples.${index}.required_test_other`)}
                                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                                  placeholder="حدد الفحص المطلوب..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValue(`samples.${index}.required_test`, '');
                                    setValue(`samples.${index}.required_test_other`, '');
                                  }}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نوع العينة <span className="text-red-500">*</span>
                            </label>
                            {watch(`samples.${index}.sample_type`) === 'أخرى' ? (
                              <div className="relative">
                                <input
                                  {...register(`samples.${index}.sample_type_other`)}
                                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                                  placeholder="حدد نوع العينة..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValue(`samples.${index}.sample_type`, '');
                                    setValue(`samples.${index}.sample_type_other`, '');
                                  }}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <select
                                {...register(`samples.${index}.sample_type`)}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                              >
                                <option value="">اختر نوع العينة</option>
                                <option value="مصل">مصل</option>
                                <option value="دم كامل">دم كامل</option>
                                <option value="أحشاء">أحشاء</option>
                                <option value="مسحات">مسحات</option>
                                <option value="كحتات">كحتات</option>
                                <option value="صيصان">صيصان</option>
                                <option value="بيض">بيض</option>
                                <option value="روث">روث</option>
                                <option value="حليب">حليب</option>
                                <option value="أعضاء">أعضاء</option>
                                <option value="أخرى">أخرى</option>
                              </select>
                            )}
                            {errors.samples?.[index]?.sample_type && (
                              <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.sample_type?.message}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نوع الحيوان <span className="text-red-500">*</span>
                            </label>
                            {watch(`samples.${index}.animal_type`) === 'أخرى' ? (
                              <div className="relative">
                                <input
                                  {...register(`samples.${index}.animal_type_other`)}
                                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                                  placeholder="حدد نوع الحيوان..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValue(`samples.${index}.animal_type`, '');
                                    setValue(`samples.${index}.animal_type_other`, '');
                                  }}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <select
                                {...register(`samples.${index}.animal_type`)}
                                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                              >
                                <option value="">اختر نوع الحيوان</option>
                                <option value="ضأن">ضأن</option>
                                <option value="ماعز">ماعز</option>
                                <option value="أبقار">أبقار</option>
                                <option value="ابل">ابل</option>
                                <option value="خيل">خيل</option>
                                <option value="دواجن">دواجن</option>
                                <option value="أغنام">أغنام</option>
                                <option value="بيض">بيض</option>
                                <option value="أخرى">أخرى</option>
                              </select>
                            )}
                            {errors.samples?.[index]?.animal_type && (
                              <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.animal_type?.message}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              عدد العينات <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              {...register(`samples.${index}.sample_count`, { valueAsNumber: true })}
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                              min="1"
                            />
                            {errors.samples?.[index]?.sample_count && (
                              <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.sample_count?.message}</p>
                            )}
                          </div>

                          <div className="text-right md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ملاحظات
                            </label>
                            <textarea
                              {...register(`samples.${index}.notes`)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 min-h-[100px]"
                              placeholder="أي ملاحظات إضافية..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-teal-50/80 border-2 border-teal-200 rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-right text-teal-900 flex items-center gap-2 mb-4">
                <span>فحص جودة العينات</span>
                <div className="w-2.5 h-2.5 bg-teal-500 rounded-full"></div>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* درجة الحرارة */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-teal-100">
                  <label className="text-sm font-semibold text-gray-800 block text-right mb-2">درجة الحرارة *</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-red-50/80 border border-red-300 rounded-lg py-2 hover:bg-red-100 transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('temperature')} value="inappropriate" className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-gray-700">✗ غير مناسب</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-green-50/80 border border-green-300 rounded-lg py-2 hover:bg-green-100 transition-all has-[:checked]:border-green-500 has-[:checked]:bg-green-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('temperature')} value="appropriate" className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">✓ مناسب</span>
                    </label>
                  </div>
                </div>

                {/* طريقة الحفظ */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-teal-100">
                  <label className="text-sm font-semibold text-gray-800 block text-right mb-2">طريقة الحفظ *</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-red-50/80 border border-red-300 rounded-lg py-2 hover:bg-red-100 transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('preservation_method')} value="inappropriate" className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-gray-700">✗ غير مناسب</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-green-50/80 border border-green-300 rounded-lg py-2 hover:bg-green-100 transition-all has-[:checked]:border-green-500 has-[:checked]:bg-green-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('preservation_method')} value="appropriate" className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">✓ مناسب</span>
                    </label>
                  </div>
                </div>

                {/* البيانات على العينات */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-teal-100">
                  <label className="text-sm font-semibold text-gray-800 block text-right mb-2">البيانات على العينات *</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-red-50/80 border border-red-300 rounded-lg py-2 hover:bg-red-100 transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('sample_data')} value="incorrect" className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-gray-700">✗ غير صحيحة</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-green-50/80 border border-green-300 rounded-lg py-2 hover:bg-green-100 transition-all has-[:checked]:border-green-500 has-[:checked]:bg-green-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('sample_data')} value="correct" className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">✓ صحيحة</span>
                    </label>
                  </div>
                </div>

                {/* عدد العينات */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-teal-100">
                  <label className="text-sm font-semibold text-gray-800 block text-right mb-2">عدد العينات *</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-red-50/80 border border-red-300 rounded-lg py-2 hover:bg-red-100 transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('sample_count_accuracy')} value="incorrect" className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-gray-700">✗ غير صحيحة</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-green-50/80 border border-green-300 rounded-lg py-2 hover:bg-green-100 transition-all has-[:checked]:border-green-500 has-[:checked]:bg-green-100/90 has-[:checked]:shadow-sm">
                      <input type="radio" {...register('sample_count_accuracy')} value="correct" className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">✓ صحيحة</span>
                    </label>
                  </div>
                </div>
              </div>

              {needsQualityNotes && (
                <div className="mt-3 text-right">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">ملاحظات الجودة *</label>
                  <textarea
                    {...register('quality_notes')}
                    rows={2}
                    className="w-full px-3 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 text-right resize-y min-h-[80px] transition-all duration-200 bg-red-50/50 text-sm"
                    placeholder="يرجى توضيح سبب عدم مناسبة العينة..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl transition-all duration-200 font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-gradient-to-l from-[#003361] to-[#004080] hover:from-[#004080] hover:to-[#003361] text-white px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}