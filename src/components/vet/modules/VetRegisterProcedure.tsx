import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';
import { vetDB } from '../../../lib/vetDatabase';
import { useVetProcedures } from '../../../hooks/useVetProcedures';
import { createAlertForNew } from '../../../lib/vetAlerts';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import { getSaudiDate } from '../../../lib/shared-constants';

const sampleReceptionSchema = z.object({
  // Basic Data
  client_name: z.string().min(1, 'اسم العميل/الباخرة مطلوب'),
  reception_date: z.string().min(1, 'تاريخ الإجراء مطلوب'),
  procedure_number: z.string().min(1, 'رقم الإجراء مطلوب'),
  country_port: z.string().min(1, 'بلد المنشأ مطلوب'),
  custom_country_port: z.string().optional(),
  receiver_name: z.string().min(1, 'اسم معد الإجراء مطلوب'),
  custom_receiver_name: z.string().optional(),

  // Sample Groups
  sample_groups: z.array(z.object({
    animal_type: z.string().min(1, 'نوع الحيوان مطلوب'),
    custom_animal_type: z.string().optional(),
    animal_gender: z.string().min(1, 'جنس الحيوان مطلوب'),
    custom_animal_gender: z.string().optional(),
    sample_count: z.number({
      required_error: 'عدد العينات مطلوب',
      invalid_type_error: 'يجب إدخال رقم صحيح',
    }).min(1, 'يجب أن يكون عدد العينات 1 على الأقل'),
    samples: z.array(z.object({
      sample_number: z.string().optional(),
      required_test: z.string().min(1, 'الفحص المطلوب مطلوب'),
      custom_test: z.string().optional(),
      sample_type: z.string().min(1, 'نوع العينة مطلوب'),
      custom_sample_type: z.string().optional(),
    })).min(1, 'يجب إضافة عينة واحدة على الأقل'),
  })).min(1, 'يجب إضافة مجموعة واحدة على الأقل'),

  // Sampling Doctors
  sampling_doctors: z.array(z.string()).min(1, 'يجب اختيار طبيب واحد على الأقل'),
  custom_sampling_doctor: z.string().optional(),
});

type SampleReceptionForm = z.infer<typeof sampleReceptionSchema>;

const requiredTestOptions = [
  'الحمى المالطية (البروسيلا)',
  'الحمى القلاعية (FMD)',
  'حمى الوادى المتصدع (RVF)',
  'كفاءة التحصين ضد مرض حمى الوادي المتصدع (RVF)',
  'جدري الأغنام (sheep pox)',
  'جدرى الجمال',
  'طاعون المجترات الصغيرة (PPR)',
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
  'خناق الخيل (ٍStrangles)',
  'التهاب رئوي (مانهيميا)',
  'اللسان الأزرق (BTV)',
  'الإسهال البقري الفيروسي (BVD)',
  'هربس الأبقار (pi3)',
  'الحمى النزلية الخبيثة في الأبقار (MCF)',
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
  'نضير الانفلونزا النوع -3',
  'متلازمة الشرق الاوسط التنفسية',
  'حمى الثلاث ايام في الابقار',
  'حمى النزف الوبائية ( EHDV)',
  'التهاب الجلد العقدى في الابقر(LSDV)',
  'التهاب شرايين الخيل',
  'مرض انيميا الخيل المعدى',
  'الثايليريا',
  'البابيزيا',
  'الهيام (تريبانوسوما)',
  'أنابلازما',
  'كوكسيديا (Coccidia)',
  'طفيليات الدم (Blood Parasites)',
  'طفيليات داخلية (Interal Parasites)',
  'التكسوبلازما (Toxoplasmosis)',
  'ترايكوموناس',
  'الذباب',
  'يرقات',
  'قراد',
  'أنفلونزا الطيور (AIV)',
  'مرض النيوكاسل (ND)',
  'التهاب القصبة المعدي (IBV)',
  'مرض الجدرى في الطيور (Fowl pox)',
  'ماركس (marek\'s disease)',
  'فيروس الريو (Reo virus)',
  'ليكوزس الدجاج (Avian Leukosis)',
  'جاليد هربس فيرس – 1 (ILT)',
  'مرض الجمبورو (IBDV)',
  'مرض الادينو Avian Adeno virus',
  'انفلونزا الطيور',
  'أخرى'
];

const countryPortOptions = [
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


const receiverNameOptions = [
  'سعود عيضة الثبيتي',
  'ماجد علي الفار',
  'سعود عبدالعزيز العمري',
  'عبدالله هاشم المعيرفي',
  'مرتضى عبدالله الجرفي',
  'اكرم المالي',
  'عبدالمجيد السواط',
  'طارق مطلق الغامدي',
  'كاظم أبو داوود',
  'الطيب عثمان',
  'أخرى'
];

const samplingDoctorOptions = [
  'سعود عيضة الثبيتي',
  'ماجد علي الفار',
  'سعود عبدالعزيز العمري',
  'عبدالله هاشم المعيرفي',
  'مرتضى عبدالله الجرفي',
  'اكرم المالي',
  'عبدالمجيد السواط',
  'طارق مطلق الغامدي',
  'كاظم أبو داوود',
  'الطيب عثمان',
  'أخرى'
];

export default function VetSampleReception() {
  const [nextProcedureNumber, setNextProcedureNumber] = useState('0001-2025-Q');
  const { getNextProcedureNumber } = useVetProcedures();
  const [showCustomCountryPort, setShowCustomCountryPort] = useState(false);
  const [showCustomReceiverName, setShowCustomReceiverName] = useState(false);
  const [selectedSamplingDoctors, setSelectedSamplingDoctors] = useState<string[]>([]);
  const [showCustomSamplingDoctor, setShowCustomSamplingDoctor] = useState(false);
  const [expandedSampleGroups, setExpandedSampleGroups] = useState<{[key: number]: boolean}>({});
  const [expandedIndividualSamples, setExpandedIndividualSamples] = useState<{[key: string]: boolean}>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SampleReceptionForm>({
    resolver: zodResolver(sampleReceptionSchema),
    defaultValues: {
      procedure_number: nextProcedureNumber,
      reception_date: getSaudiDate(),
      sample_groups: [{
        samples: [{ sample_number: '1' }]
      }],
      sampling_doctors: [],
    },
  });

  useEffect(() => {
    const loadNextNumber = async () => {
      try {
        const number = await getNextProcedureNumber();
        setNextProcedureNumber(number);
        setValue('procedure_number', number);
      } catch (error) {
        console.error('Error loading next procedure number:', error);
      }
    };
    loadNextNumber();
  }, [getNextProcedureNumber, setValue]);

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control,
    name: 'sample_groups',
  });

  const watchedCountryPort = watch('country_port');
  const watchedReceiverName = watch('receiver_name');
  const watchedSampleGroups = watch('sample_groups');

  // Toggle functions
  const toggleSampleGroup = (groupIndex: number) => {
    setExpandedSampleGroups(prev => ({
      ...prev,
      [groupIndex]: !prev[groupIndex]
    }));
  };

  const toggleIndividualSample = (groupIndex: number, sampleIndex: number) => {
    const key = `${groupIndex}-${sampleIndex}`;
    setExpandedIndividualSamples(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // دالة للتحقق من صحة بيانات المجموعة
  const isGroupValid = (groupIndex: number): boolean => {
    const group = watchedSampleGroups?.[groupIndex];
    if (!group) return false;

    const hasValidAnimalData = !!(
      group.animal_type &&
      group.animal_type.trim() &&
      group.animal_gender &&
      group.animal_gender.trim() &&
      group.sample_count !== undefined &&
      group.sample_count !== ''
    );

    const hasValidSamples = group.samples && group.samples.length > 0 && group.samples.every((sample: any) =>
      sample.required_test &&
      sample.required_test.trim() &&
      sample.sample_type &&
      sample.sample_type.trim()
    );

    return hasValidAnimalData && hasValidSamples;
  };

  // دالة للتحقق من صحة البيانات الأساسية
  const isBasicDataValid = (): boolean => {
    return !!(
      watch('procedure_number') &&
      watch('reception_date') &&
      watch('client_name') &&
      watch('country_port') &&
      watch('receiver_name')
    );
  };

  // دالة للتحقق من صحة بيانات مجموعات العينات
  const areGroupsValid = (): boolean => {
    const groups = watchedSampleGroups || [];
    if (groups.length === 0) return false;
    return groups.every((_, index) => isGroupValid(index));
  };

  // مراقبة تغيير البلد/الميناء
  useEffect(() => {
    if (watchedCountryPort === 'أخرى') {
      setShowCustomCountryPort(true);
    } else {
      setShowCustomCountryPort(false);
      setValue('custom_country_port', '');
    }
  }, [watchedCountryPort, setValue]);

  // مراقبة تغيير اسم معد الإجراء
  useEffect(() => {
    if (watchedReceiverName === 'أخرى') {
      setShowCustomReceiverName(true);
    } else {
      setShowCustomReceiverName(false);
      setValue('custom_receiver_name', '');
    }
  }, [watchedReceiverName, setValue]);

  // دوال إدارة الأطباء
  const handleSamplingDoctorToggle = (doctor: string) => {
    setSelectedSamplingDoctors(prev => {
      const newDoctors = prev.includes(doctor)
        ? prev.filter(d => d !== doctor)
        : [...prev, doctor];
      setValue('sampling_doctors', newDoctors);
      return newDoctors;
    });
  };

  const removeSamplingDoctor = (doctor: string) => {
    setSelectedSamplingDoctors(prev => {
      const newDoctors = prev.filter(d => d !== doctor);
      setValue('sampling_doctors', newDoctors);
      return newDoctors;
    });
  };

  const addCustomSamplingDoctor = (doctorName: string) => {
    if (doctorName && !selectedSamplingDoctors.includes(doctorName)) {
      setSelectedSamplingDoctors(prev => {
        const newDoctors = [...prev, doctorName];
        setValue('sampling_doctors', newDoctors);
        return newDoctors;
      });
      setValue('custom_sampling_doctor', '');
      setShowCustomSamplingDoctor(false);
    }
  };

  const onSubmit = async (data: SampleReceptionForm) => {
    try {
      const procedureData = {
        procedure_number: data.procedure_number,
        client_name: data.client_name,
        reception_date: data.reception_date,
        country_port: data.country_port === 'أخرى' ? data.custom_country_port : data.country_port,
        receiver_name: data.receiver_name === 'أخرى' ? data.custom_receiver_name : data.receiver_name,
        sampling_doctors: data.sampling_doctors.map(doctor =>
          doctor === 'أخرى' ? data.custom_sampling_doctor : doctor
        ).filter(Boolean),
        sample_groups: data.sample_groups.map(group => ({
          animal_type: group.animal_type === 'أخرى' ? group.custom_animal_type : group.animal_type,
          animal_gender: group.animal_gender === 'أخرى' ? group.custom_animal_gender : group.animal_gender,
          sample_count: group.sample_count,
          samples: group.samples.map(sample => ({
            sample_number: sample.sample_number || '',
            required_test: sample.required_test === 'أخرى' ? sample.custom_test : sample.required_test,
            sample_type: sample.sample_type === 'أخرى' ? sample.custom_sample_type : sample.sample_type,
          })),
        })),
      };

      await vetDB.saveProcedure(procedureData);

      // إنشاء تنبيه للمختبر عن إجراء بيطري جديد
      await createAlertForNew(data.procedure_number);

      const newProcedureNumber = await getNextProcedureNumber();
      setNextProcedureNumber(newProcedureNumber);

      reset({
        procedure_number: newProcedureNumber,
        reception_date: getSaudiDate(),
        sample_groups: [{
          samples: [{ sample_number: '1' }]
        }],
        client_name: '',
        country_port: '',
        custom_country_port: '',
        receiver_name: '',
        custom_receiver_name: '',
        sampling_doctors: [],
      });

      setShowCustomCountryPort(false);
      setShowCustomReceiverName(false);
      setExpandedSampleGroups({});
      setExpandedIndividualSamples({});
      setSelectedSamplingDoctors([]);

      // التمرير إلى أعلى الصفحة بعد إعادة تعيين النموذج
      setTimeout(() => {
        // البحث عن العنصر الذي يحتوي على scroll
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // احتياطي: التمرير على window أيضاً
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      // عرض modal النجاح
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving procedure:', error);
      toast.error('خطأ في حفظ الإجراء');
    }
  };

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={FileText}
            title="تسجيل إجراء جديد"
            subtitle="تسجيل إجراء بيطري جديد في نظام المحجر"
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Data */}
            <div className={`border-2 rounded-xl p-6 shadow-lg transition-all ${
              !isBasicDataValid() ? 'bg-red-50/80 border-red-300' : 'bg-primary-50/80 border-primary-200'
            }`}>
              <h3 className="text-xl font-bold mb-6 text-right flex items-center justify-start gap-3" style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                <span className={!isBasicDataValid() ? 'text-red-700' : 'text-primary-800'} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>البيانات الأساسية</span>
                {!isBasicDataValid() && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقول إلزامية مفقودة
                  </span>
                )}
                <div className={`w-3 h-3 rounded-full ${!isBasicDataValid() ? 'bg-red-500' : 'bg-primary-500'}`}></div>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الإجراء البيطري*
                  </label>
                  <div className="relative">
                    <input
                      {...register('procedure_number')}
                      readOnly
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg text-right font-mono text-lg font-bold shadow-inner"
                      style={{ borderColor: 'rgba(97, 191, 105, 0.3)', background: 'rgba(97, 191, 105, 0.05)', color: '#61bf69' }}
                      value={nextProcedureNumber}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ background: 'rgba(97, 191, 105, 0.2)', color: '#61bf69' }}>
                        تلقائي
                      </span>
                    </div>
                  </div>
                  {errors.procedure_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.procedure_number.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الإجراء البيطري*
                  </label>
                  <input
                    type="date"
                    {...register('reception_date')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
                  />
                  {errors.reception_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.reception_date.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم العميل/الباخرة <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('client_name')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                  />
                  {errors.client_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.client_name.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    بلد المنشأ <span className="text-red-500">*</span>
                  </label>
                  {watchedCountryPort === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_country_port')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                        style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                        placeholder="اكتب اسم البلد أو الميناء..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('country_port', '');
                          setValue('custom_country_port', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('country_port')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">اختر بلد المنشأ</option>
                      {countryPortOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.country_port && (
                    <p className="text-red-500 text-sm mt-1">{errors.country_port.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم معد الإجراء البيطري*
                  </label>
                  {watchedReceiverName === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_receiver_name')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                        style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                        placeholder="اكتب اسم معد الإجراء البيطري..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('receiver_name', '');
                          setValue('custom_receiver_name', '');
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('receiver_name')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">اختر اسم معد الإجراء البيطري</option>
                      {receiverNameOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.receiver_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.receiver_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sample Groups */}
            <div className="bg-accent-50/80 border-2 border-accent-200 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-right text-accent-800 flex items-center gap-3 mb-6" style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                <span style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>العينات</span>
                <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
              </h3>

              <div className="space-y-4">
                {groupFields.map((groupField, groupIndex) => {
                  const isGroupExpanded = expandedSampleGroups[groupIndex];
                  const group = watchedSampleGroups?.[groupIndex];

                  return (
                    <SampleGroupComponent
                      key={groupField.id}
                      groupIndex={groupIndex}
                      isGroupExpanded={isGroupExpanded}
                      group={group}
                      toggleSampleGroup={toggleSampleGroup}
                      register={register}
                      control={control}
                      setValue={setValue}
                      errors={errors}
                      removeGroup={removeGroup}
                      groupFieldsLength={groupFields.length}
                      toggleIndividualSample={toggleIndividualSample}
                      expandedIndividualSamples={expandedIndividualSamples}
                      requiredTestOptions={requiredTestOptions}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => appendGroup({ samples: [{ sample_number: '1' }] })}
                className="mt-4 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-md transform hover:scale-105 transition-all duration-200"
                style={{ background: '#61bf69' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#52a65a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#61bf69'}
              >
                <Plus className="w-5 h-5" />
                إضافة نوع حيوان آخر
              </button>
            </div>

            {/* Sampling Doctors */}
            <div className={`border-2 rounded-xl p-6 shadow-lg transition-all ${
              selectedSamplingDoctors.length === 0 ? 'bg-red-50 border-red-300' : 'bg-secondary-50/80 border-secondary-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedSamplingDoctors.length === 0 ? 'bg-red-500' : 'bg-secondary-500'}`}></div>
                  <h3 className={`text-xl font-bold text-right ${selectedSamplingDoctors.length === 0 ? 'text-red-700' : 'text-secondary-800'}`} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                    الأطباء القائمين بالكشف و سحب العينات
                  </h3>
                </div>
                {selectedSamplingDoctors.length === 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقل إلزامي مفقود
                  </span>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأطباء <span className="text-red-500">*</span>
                </label>

                {selectedSamplingDoctors.length > 0 && (
                  <div className="mb-2 p-2 bg-gradient-to-r from-secondary-50 to-secondary-100/50 rounded-lg border border-secondary-200">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {selectedSamplingDoctors.map((doctor, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-white border border-secondary-300 text-secondary-800 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => removeSamplingDoctor(doctor)}
                            className="text-secondary-400 hover:text-red-600 transition-colors"
                            title="إزالة"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {doctor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'أخرى') {
                        setShowCustomSamplingDoctor(true);
                        e.target.value = '';
                      } else if (e.target.value) {
                        handleSamplingDoctorToggle(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right appearance-none bg-white"
                    defaultValue=""
                  >
                    <option value="">اختر طبيب...</option>
                    {samplingDoctorOptions.filter(d => !selectedSamplingDoctors.includes(d)).map((doctor) => (
                      <option key={doctor} value={doctor}>
                        {doctor}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {showCustomSamplingDoctor && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const customName = (document.getElementById('custom_sampling_doctor') as HTMLInputElement)?.value;
                        if (customName) {
                          addCustomSamplingDoctor(customName);
                        }
                      }}
                      className="bg-secondary-600 text-white px-4 py-2 rounded-lg hover:bg-secondary-700 transition-colors text-sm"
                    >
                      إضافة
                    </button>
                    <input
                      id="custom_sampling_doctor"
                      {...register('custom_sampling_doctor')}
                      className="flex-1 px-3 h-[40px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right text-sm"
                      placeholder="اكتب اسم الطبيب..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomSamplingDoctor(false);
                        setValue('custom_sampling_doctor', '');
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {errors.sampling_doctors && (
                  <p className="text-red-500 text-xs mt-1">{errors.sampling_doctors.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-8">
              <button
                type="submit"
                className="text-white px-12 py-4 rounded-2xl flex items-center gap-3 shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-bold"
                style={{ background: '#61bf69' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#52a65a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#61bf69'}
              >
                <Save className="w-6 h-6" />
                حفظ البيانات
              </button>
            </div>
          </form>
        </div>
      </div>

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
                تم حفظ الإجراء بنجاح
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

function SampleGroupComponent({
  groupIndex,
  isGroupExpanded,
  group,
  toggleSampleGroup,
  register,
  control,
  setValue,
  errors,
  removeGroup,
  groupFieldsLength,
  toggleIndividualSample,
  expandedIndividualSamples,
  requiredTestOptions,
}: any) {
  const { fields: sampleFields, append: appendSample, remove: removeSample } = useFieldArray({
    control,
    name: `sample_groups.${groupIndex}.samples`,
  });

  const watchedAnimalType = group?.animal_type;
  const watchedAnimalGender = group?.animal_gender;
  const watchedSamples = group?.samples || [];

  // التحقق من صحة المجموعة
  const isValid = !!(
    group?.animal_type &&
    group.animal_type.trim() &&
    group?.animal_gender &&
    group.animal_gender.trim() &&
    group?.sample_count !== undefined &&
    group.sample_count !== '' &&
    group?.samples &&
    group.samples.length > 0 &&
    group.samples.every((sample: any) =>
      sample.required_test &&
      sample.required_test.trim() &&
      sample.sample_type &&
      sample.sample_type.trim()
    )
  );

  return (
    <div className={`bg-white/80 backdrop-blur-sm border-2 rounded-xl shadow-md overflow-hidden transition-all ${
      !isValid ? 'border-red-400 shadow-red-200' : ''
    }`} style={isValid ? { borderColor: 'rgba(97, 191, 105, 0.2)' } : {}}>
      {/* شريط العنوان القابل للطي للمجموعة */}
      <div
        onClick={() => toggleSampleGroup(groupIndex)}
        className={`px-4 h-[50px] flex items-center justify-between cursor-pointer hover:bg-opacity-90 transition-all duration-200 ${
          !isValid ? 'bg-red-50' : ''
        }`}
        style={isValid ? { background: 'rgba(97, 191, 105, 0.15)' } : {}}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: !isValid ? '#dc2626' : '#61bf69' }}>
            {isGroupExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
          <span className="font-bold text-lg" style={{ color: !isValid ? '#dc2626' : '#61bf69' }}>
            {group?.animal_type && group.animal_type !== 'أخرى'
              ? group.animal_type
              : group?.custom_animal_type
                ? group.custom_animal_type
                : `نوع الحيوان ${groupIndex + 1}`}
          </span>
          {!isValid && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" />
              حقول إلزامية مفقودة
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {groupFieldsLength > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeGroup(groupIndex);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              حذف الحيوان
            </button>
          )}
        </div>
      </div>

      {/* محتوى المجموعة */}
      {isGroupExpanded && (
        <div className="p-6 space-y-4">
          {/* بيانات الحيوان */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b-2 border-gray-200">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الحيوان <span className="text-red-500">*</span>
              </label>
              {watchedAnimalType === 'أخرى' ? (
                <div className="relative">
                  <input
                    {...register(`sample_groups.${groupIndex}.custom_animal_type`)}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                    style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                    placeholder="اكتب نوع الحيوان..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`sample_groups.${groupIndex}.animal_type`, '');
                      setValue(`sample_groups.${groupIndex}.custom_animal_type`, '');
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  {...register(`sample_groups.${groupIndex}.animal_type`)}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
                >
                  <option value="">اختر نوع الحيوان</option>
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
              {errors.sample_groups?.[groupIndex]?.animal_type && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.animal_type?.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                جنس الحيوان <span className="text-red-500">*</span>
              </label>
              {watchedAnimalGender === 'أخرى' ? (
                <div className="relative">
                  <input
                    {...register(`sample_groups.${groupIndex}.custom_animal_gender`)}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 backdrop-blur-sm pr-12"
                    style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                    placeholder="اكتب جنس الحيوان..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`sample_groups.${groupIndex}.animal_gender`, '');
                      setValue(`sample_groups.${groupIndex}.custom_animal_gender`, '');
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  {...register(`sample_groups.${groupIndex}.animal_gender`)}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
                >
                  <option value="">اختر جنس الحيوان</option>
                  <option value="ذكور">ذكور</option>
                  <option value="إناث">إناث</option>
                  <option value="أخرى">أخرى</option>
                </select>
              )}
              {errors.sample_groups?.[groupIndex]?.animal_gender && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.animal_gender?.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد العينات <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                {...register(`sample_groups.${groupIndex}.sample_count`, { valueAsNumber: true })}
                className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white/70"
              />
              {errors.sample_groups?.[groupIndex]?.sample_count && (
                <p className="text-red-500 text-sm mt-1">{errors.sample_groups[groupIndex]?.sample_count?.message}</p>
              )}
            </div>
          </div>

          {/* العينات الفردية */}
          <div className="space-y-2">
            {sampleFields.map((sampleField, sampleIndex) => {
              const key = `${groupIndex}-${sampleIndex}`;
              const isSampleExpanded = expandedIndividualSamples[key];
              const sample = watchedSamples[sampleIndex];

              return (
                <div key={sampleField.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden">
                  {/* شريط العينة الفردية */}
                  <div
                    onClick={() => toggleIndividualSample(groupIndex, sampleIndex)}
                    className="px-4 h-[50px] flex items-center justify-between cursor-pointer bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600">
                        {isSampleExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-semibold text-sm text-gray-700">
                        الفحص {sampleIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sampleFields.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSample(sampleIndex);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          appendSample({ sample_number: (sampleFields.length + 1).toString() });
                        }}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-all duration-200"
                        style={{ background: '#61bf69' }}
                      >
                        <Plus className="w-3 h-3" />
                        إضافة فحص آخر
                      </button>
                    </div>
                  </div>

                  {/* محتوى العينة الفردية */}
                  {isSampleExpanded && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            رقم العينة
                          </label>
                          <input
                            {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_number`)}
                            placeholder={(sampleIndex + 1).toString()}
                            className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                          />
                        </div>

                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الفحص المطلوب <span className="text-red-500">*</span>
                          </label>
                          {sample?.required_test === 'أخرى' ? (
                            <div className="relative">
                              <input
                                {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_test`)}
                                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-10"
                                style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                                placeholder="اكتب الفحص المطلوب..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.required_test`, '');
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_test`, '');
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <select
                              {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.required_test`)}
                              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white"
                            >
                              <option value="">اختر الفحص المطلوب</option>
                              {requiredTestOptions.map((test: string) => (
                                <option key={test} value={test}>
                                  {test}
                                </option>
                              ))}
                            </select>
                          )}
                          {errors.sample_groups?.[groupIndex]?.samples?.[sampleIndex]?.required_test && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.sample_groups[groupIndex]?.samples[sampleIndex]?.required_test?.message}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            نوع العينة <span className="text-red-500">*</span>
                          </label>
                          {sample?.sample_type === 'أخرى' ? (
                            <div className="relative">
                              <input
                                {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_sample_type`)}
                                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-10"
                                style={{ borderColor: 'rgba(97, 191, 105, 0.4)', background: 'rgba(97, 191, 105, 0.05)' }}
                                placeholder="اكتب نوع العينة..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_type`, '');
                                  setValue(`sample_groups.${groupIndex}.samples.${sampleIndex}.custom_sample_type`, '');
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <select
                              {...register(`sample_groups.${groupIndex}.samples.${sampleIndex}.sample_type`)}
                              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-white"
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
                          {errors.sample_groups?.[groupIndex]?.samples?.[sampleIndex]?.sample_type && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.sample_groups[groupIndex]?.samples[sampleIndex]?.sample_type?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
