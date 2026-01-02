import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, FileText, TestTube2, CreditCard as Edit, Eye, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight, Upload, Clipboard, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import { useEffect } from 'react';
import PageHeader, { ContentCard } from '../../shared/PageHeader';
import { deleteAlertForProcedure } from '../../../lib/vetAlerts';
import { vetDatabase } from '../../../lib/vetDatabase';
import { getSaudiDate } from '../../../lib/shared-constants';

const sampleReceptionSchema = z.object({
  // Basic Data
  client_name: z.string().min(1, 'اسم العميل/الباخرة مطلوب'),
  reception_date: z.string().min(1, 'تاريخ الإجراء المخبري مطلوب'),
  procedure_number: z.string().min(1, 'رقم الإجراء المخبري مطلوب'),
  civil_record: z.string().optional(),
  external_procedure_number: z.string().min(1, 'رقم الإجراء الخارجي مطلوب'),
  external_procedure_date: z.string().optional(),
  vet_procedure_id: z.string().optional(),
  country_port: z.string().min(1, 'بلد المنشأ مطلوب'),
  custom_country_port: z.string().optional(),
  sample_source: z.string().min(1, 'مكان ورود العينة مطلوب'),
  custom_sample_origin: z.string().optional(),
  receiver_name: z.string().min(1, 'اسم مستلم العينة مطلوب'),
  custom_receiver_name: z.string().optional(),

  // Samples
  samples: z.array(z.object({
    sample_number: z.string().optional(),
    section: z.string().min(1, 'القسم مطلوب'),
    required_test: z.string().min(1, 'الفحص المطلوب مطلوب'),
    sample_type: z.string().min(1, 'نوع العينة مطلوب'),
    custom_sample_type: z.string().optional(),
    animal_type: z.string().min(1, 'نوع الحيوان مطلوب'),
    custom_animal_type: z.string().optional(),
    sample_count: z.number({
      invalid_type_error: 'يجب إدخال رقم صحيح',
      message: 'عدد العينات مطلوب'
    }).min(1, 'يجب أن يكون عدد العينات 1 على الأقل'),
    notes: z.string().optional(),
  })).min(1, 'يجب إضافة عينة واحدة على الأقل'),

  // Quality Check
  temperature: z.enum(['appropriate', 'inappropriate']),
  preservation_method: z.enum(['appropriate', 'inappropriate']),
  sample_data: z.enum(['correct', 'incorrect']),
  sample_count_accuracy: z.enum(['correct', 'incorrect']),
  quality_notes: z.string().optional(),
});

type SampleReceptionForm = z.infer<typeof sampleReceptionSchema>;

const sections = [
  { value: 'bacteriology', label: 'البكتيريا' },
  { value: 'Virology', label: 'الفيروسات' },
  { value: 'parasitology', label: 'الطفيليات' },
  { value: 'poultry', label: 'الدواجن' },
  { value: 'Molecular biology', label: 'الأحياء الجزيئية' },
  { value: 'other', label: 'أخرى' },
];

const testsBySection = {
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
    'أخرى'
  ],
  poultry: [
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
    'السالمونيلا',
    'أخرى'
  ],
  'Molecular biology': [
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
    'حمى الوادى المتصدع',
    'نضير الانفلونزا النوع -3',
    'جدرى الجمال',
    'متلازمة الشرق الاوسط التنفسية',
    'حمى الثلاث ايام في الابقار',
    'حمى النزف الوبائية ( EHDV)',
    'التهاب الجلد العقدى في الابقر(LSDV)',
    'التهاب شرايين الخيل',
    'مرض انيميا الخيل المعدى',
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
    'السالمونيلا',
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

interface SampleReceptionProps {
  searchData?: any;
}

export default function SampleReception({ searchData }: SampleReceptionProps) {
  const [nextProcedureNumber, setNextProcedureNumber] = useState('0001-2025-L');
  const [showCustomCountryPort, setShowCustomCountryPort] = useState(false);
  const [showCustomSampleOrigin, setShowCustomSampleOrigin] = useState(false);
  const [showCustomReceiverName, setShowCustomReceiverName] = useState(false);
  const [showCustomSections, setShowCustomSections] = useState<{[key: number]: boolean}>({});
  const [showCustomTests, setShowCustomTests] = useState<{[key: number]: boolean}>({});
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [expandedSamples, setExpandedSamples] = useState<{[key: number]: boolean}>({});
  const [veterinaryProcedureNumber, setVeterinaryProcedureNumber] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { createProcedure, deleteProcedure, getNextProcedureNumber } = useProcedures();
  const { results, addResult, updateResult, deleteResult } = useTestResults();

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
      samples: [{
        sample_number: '1',
        section: '',
        required_test: '',
        sample_type: '',
        animal_type: '',
        sample_count: 1,
        notes: ''
      }],
      temperature: 'appropriate',
      preservation_method: 'appropriate',
      sample_data: 'correct',
      sample_count_accuracy: 'correct',
      client_name: '',
      civil_record: '',
      external_procedure_number: '',
      external_procedure_date: '',
      vet_procedure_id: '',
      country_port: '',
      custom_country_port: '',
      sample_source: '',
      custom_sample_origin: '',
      receiver_name: '',
      custom_receiver_name: '',
      quality_notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'samples',
  });

  const watchedValues = watch();
  const watchedCountryPort = watch('country_port');
  const watchedSampleOrigin = watch('sample_source');
  const watchedReceiverName = watch('receiver_name');
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

  // دالة لتبديل حالة الطي/التوسيع للإجراء
  const toggleProcedure = (procedureId: string) => {
    const newExpanded = new Set(expandedProcedures);
    if (newExpanded.has(procedureId)) {
      newExpanded.delete(procedureId);
    } else {
      newExpanded.add(procedureId);
    }
    setExpandedProcedures(newExpanded);
  };

  // دالة لتبديل حالة الطي/التوسيع للعينة
  const toggleSample = (index: number) => {
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
      sample.sample_count !== ''
    );
  };

  // دالة للتحقق من صحة البيانات الأساسية
  const isBasicDataValid = (): boolean => {
    return !!(
      watch('reception_date') &&
      watch('client_name') &&
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

  // دالة للحصول على حالة العينة
  const getSampleStatus = (sampleId: string) => {
    const result = results.find(r => r.sample_id === sampleId);
    if (!result) {
      return { status: 'not_tested', label: 'لم تفحص بعد', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
    
    if (result.test_result === 'positive') {
      return { status: 'positive', label: 'إيجابي', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    } else if (result.test_result === 'vaccination_efficacy') {
      return { status: 'vaccination', label: 'كفاءة تحصين', color: 'bg-primary-100 text-primary-800', icon: CheckCircle };
    } else {
      return { status: 'negative', label: 'سلبي', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  // دالة لفتح نافذة النتيجة
  const openResultModal = (sample: any, existingResult?: any) => {
    setSelectedSample({ ...sample, existingResult });
    setShowResultModal(true);
  };

  // دالة اللصق من الحافظة
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setVeterinaryProcedureNumber(text.trim());
        toast.success('تم اللصق بنجاح');
      } else {
        toast.error('الحافظة فارغة');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('فشل اللصق من الحافظة. الرجاء استخدام Ctrl+V أو Command+V للصق', {
        duration: 4000
      });
    }
  };

  // دالة استيراد البيانات من المحجر
  const handleImportFromQuarantine = async () => {
    if (!veterinaryProcedureNumber.trim()) {
      toast.error('الرجاء إدخال رقم الإجراء البيطري');
      return;
    }

    try {
      // التحقق من أن هذا الإجراء لم يتم تسجيله مسبقاً في المختبر
      const labData = localStorage.getItem('agriserv_lab_db');
      if (labData) {
        const labDatabase = JSON.parse(labData);
        const labProcedures = labDatabase.saved_samples || [];

        const existingProcedure = labProcedures.find((p: any) => {
          const externalProcNumber = p.external_procedure_number?.trim();
          const searchNumber = veterinaryProcedureNumber.trim();
          return externalProcNumber && externalProcNumber === searchNumber;
        });

        if (existingProcedure) {
          toast.error('تم تسجيل هذا الإجراء سابقاً في المختبر');
          return;
        }
      }

      // محاولة الحصول على البيانات من Electron API أولاً
      let procedures: any[] = [];

      if (window.electronAPI && window.electronAPI.getQuarantineProcedures) {
        try {
          procedures = await window.electronAPI.getQuarantineProcedures();
        } catch (error) {
          console.error('Error fetching from Electron API:', error);
        }
      }

      // إذا فشل Electron API، حاول localStorage
      if (!procedures || procedures.length === 0) {
        const storageData = localStorage.getItem('agriserv_vet_db');

        if (!storageData) {
          toast.error('لا توجد إجراءات في قاعدة بيانات القسم البيطري');
          return;
        }

        const quarantineData = JSON.parse(storageData);
        procedures = quarantineData.procedures || [];
      }

      if (procedures.length === 0) {
        toast.error('لا توجد إجراءات في قاعدة بيانات القسم البيطري');
        return;
      }

      const procedure = procedures.find((p: any) => p.procedure_number === veterinaryProcedureNumber.trim());

      if (!procedure) {
        toast.error('لم يتم العثور على إجراء بهذا الرقم');
        return;
      }

      if (!procedure.sample_groups || !Array.isArray(procedure.sample_groups) || procedure.sample_groups.length === 0) {
        toast.error('لا توجد عينات في الإجراء البيطري المحدد');
        return;
      }

      setValue('client_name', procedure.client_name || '');
      setValue('external_procedure_number', procedure.procedure_number || '');
      setValue('external_procedure_date', procedure.reception_date || '');
      setValue('vet_procedure_id', procedure.id || '');
      setValue('sample_source', 'ميناء جدة الإسلامي');

      // معالجة بلد المنشأ - التحقق إذا كانت القيمة في القائمة أو مخصصة
      const countryPortOptions = [
        'جيبوتي - جيبوتي', 'السودان - سواكن', 'الصومال - بربره', 'الصومال - بوصاصو',
        'رومانيا - ميديا', 'رومانيا - بريلاء', 'جورجيا - باتومي', 'جورجيا - بوتي',
        'اسبانيا - كارتاجينا', 'اسبانيا - تارجوانا', 'اسبانيا - كوراليجو',
        'تركيا - افياب', 'تركيا - اسكندرون', 'أوكرانيا - نيكوليف', 'أوكرانيا - اوشاكوف',
        'كولمبيا - كارتاخينا', 'البرازيل - فيلادي كواندا', 'الهند - جواهرلال',
        'الصين - داليان', 'الاوروغواي - مونتفيديو', 'تايلندا - لايم تشايانج',
        'مولدوفيا - جورجيوليستس', 'قبرص', 'استراليا', 'سوريا'
      ];

      const countryPort = procedure.country_port || '';
      if (countryPortOptions.includes(countryPort)) {
        setValue('country_port', countryPort);
      } else {
        setValue('country_port', 'أخرى');
        setValue('custom_country_port', countryPort);
        setShowCustomCountryPort(true);
      }

      const animalTypeOptions = ['ضأن', 'ماعز', 'أبقار', 'ابل', 'خيل', 'دواجن', 'أغنام', 'بيض'];
      const sampleTypeOptions = ['مصل', 'دم كامل', 'أحشاء', 'مسحات', 'كحتات', 'صيصان', 'بيض', 'روث', 'حليب', 'أعضاء'];

      const importedSamples: any[] = [];

      for (let i = 0; i < procedure.sample_groups.length; i++) {
        const group = procedure.sample_groups[i];
        if (!group?.samples || !Array.isArray(group.samples)) continue;

        const sampleCount = parseInt(String(group.sample_count || 1));
        const rawAnimalType = String(group.animal_type || '');

        for (let j = 0; j < group.samples.length; j++) {
          const sample = group.samples[j];
          if (!sample?.required_test) continue;

          let section = 'other';
          const testName = String(sample.required_test || '').trim();

          if (testName) {
            if (testsBySection?.bacteriology?.includes(testName)) {
              section = 'bacteriology';
            } else if (testsBySection?.Virology?.includes(testName)) {
              section = 'Virology';
            } else if (testsBySection?.parasitology?.includes(testName)) {
              section = 'parasitology';
            } else if (testsBySection?.poultry?.includes(testName)) {
              section = 'poultry';
            }
          }

          const rawSampleType = String(sample.sample_type || '');

          // معالجة نوع الحيوان - إذا لم يكن في القائمة، نستخدم "أخرى" والقيمة المخصصة
          let animalType = rawAnimalType;
          let customAnimalType = '';
          if (rawAnimalType && !animalTypeOptions.includes(rawAnimalType)) {
            animalType = 'أخرى';
            customAnimalType = rawAnimalType;
          }

          // معالجة نوع العينة - إذا لم يكن في القائمة، نستخدم "أخرى" والقيمة المخصصة
          let sampleType = rawSampleType;
          let customSampleType = '';
          if (rawSampleType && !sampleTypeOptions.includes(rawSampleType)) {
            sampleType = 'أخرى';
            customSampleType = rawSampleType;
          }

          importedSamples.push({
            sample_number: '',
            section: section,
            required_test: testName,
            sample_type: sampleType,
            custom_sample_type: customSampleType,
            animal_type: animalType,
            custom_animal_type: customAnimalType,
            sample_count: sampleCount,
            notes: ''
          });
        }
      }

      if (importedSamples.length === 0) {
        toast.error('لا توجد عينات صالحة للاستيراد في هذا الإجراء');
        return;
      }

      setValue('samples', importedSamples);

      // ملاحظة: لا نحذف التنبيه هنا
      // سيتم حذفه تلقائياً عند حفظ الإجراء (في دالة onSubmit)

      toast.success(`تم استيراد ${importedSamples.length} عينة بنجاح من القسم البيطري`);
    } catch (error) {
      console.error('Error importing from quarantine:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`حدث خطأ أثناء استيراد البيانات: ${errorMessage}`);
    }
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

  // مراقبة تغيير مكان ورود العينة
  useEffect(() => {
    if (watchedSampleOrigin === 'أخرى') {
      setShowCustomSampleOrigin(true);
    } else {
      setShowCustomSampleOrigin(false);
      setValue('custom_sample_origin', '');
    }
  }, [watchedSampleOrigin, setValue]);

  // مراقبة تغيير اسم مستلم العينة
  useEffect(() => {
    if (watchedReceiverName === 'أخرى') {
      setShowCustomReceiverName(true);
    } else {
      setShowCustomReceiverName(false);
      setValue('custom_receiver_name', '');
    }
  }, [watchedReceiverName, setValue]);

  // مراقبة تغيير أقسام العينات
  useEffect(() => {
    if (watchedSamples) {
      const newShowCustomSections: {[key: number]: boolean} = {};
      const newShowCustomTests: {[key: number]: boolean} = {};
      watchedSamples.forEach((sample: any, index: number) => {
        if (sample && sample.section === 'other') {
          newShowCustomSections[index] = true;
        }
        if (sample && sample.required_test === 'أخرى') {
          newShowCustomTests[index] = true;
        }
      });
      setShowCustomSections(newShowCustomSections);
      setShowCustomTests(newShowCustomTests);
    }
  }, [watchedSamples]);

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

  useEffect(() => {
    const loadNextNumber = async () => {
      try {
        const number = await getNextProcedureNumber();
        setNextProcedureNumber(number);
        setValue('procedure_number', number);
        setShowCustomSections({});
      } catch (error) {
        console.error('Error loading next procedure number:', error);
        // تجاهل الخطأ في الوضع المحلي
      }
    };
    loadNextNumber();
  }, [getNextProcedureNumber, setValue]);

  const onSubmit = async (data: SampleReceptionForm) => {
    try {
      // التحقق من أن رقم الإجراء الخارجي لم يتم تسجيله مسبقاً
      if (data.external_procedure_number && data.external_procedure_number.trim()) {
        const labData = localStorage.getItem('agriserv_lab_db');
        if (labData) {
          const labDatabase = JSON.parse(labData);
          const labProcedures = labDatabase.saved_samples || [];

          // استخدام vet_procedure_id للتحقق من التكرار إن وُجد، وإلا استخدم رقم الإجراء
          const existingProcedure = labProcedures.find((p: any) => {
            if (data.vet_procedure_id && p.vet_procedure_id) {
              return p.vet_procedure_id === data.vet_procedure_id;
            }
            const externalProcNumber = p.external_procedure_number?.trim();
            const searchNumber = data.external_procedure_number.trim();
            return externalProcNumber && externalProcNumber === searchNumber && !p.vet_procedure_id;
          });

          if (existingProcedure) {
            toast.error('تم تسجيل هذا الإجراء سابقاً في المختبر');
            return;
          }
        }
      }

      // استخدام البلد المخصص إذا تم اختيار "أخرى"
      const finalCountryPort = data.country_port === 'أخرى' ? data.custom_country_port : data.country_port;
      const finalSampleOrigin = data.sample_source === 'أخرى' ? data.custom_sample_origin : data.sample_source;
      const finalReceiverName = data.receiver_name === 'أخرى' ? data.custom_receiver_name : data.receiver_name;
      
      // معالجة العينات مع الأقسام المخصصة
      const processedSamples = data.samples.map((sample: any) => {
        // استخدام القسم المخصص إذا تم اختيار "أخرى"
        const finalSection = sample.section === 'other' ? sample.custom_section : sample.section;
        const finalTest = sample.required_test === 'أخرى' ? sample.custom_test : sample.required_test;
        const finalSampleType = sample.sample_type === 'أخرى' ? sample.custom_sample_type : sample.sample_type;
        const finalAnimalType = sample.animal_type === 'أخرى' ? sample.custom_animal_type : sample.animal_type;
        
        return {
          ...sample,
          department: finalSection,
          requested_test: finalTest,
          sample_type: finalSampleType,
          animal_type: finalAnimalType,
        };
      });
      
      await createProcedure({
        ...data,
        country_port: finalCountryPort,
        sample_source: finalSampleOrigin,
        receiver_name: finalReceiverName,
        samples: processedSamples
      });

      // حذف التنبيه الخاص بهذا الإجراء بعد الحفظ النهائي (إذا كان مستورد من المحجر)
      if (data.external_procedure_number && data.external_procedure_number.trim()) {
        deleteAlertForProcedure(data.external_procedure_number.trim());
      }

      // تحديث رقم الإجراء التالي
      const nextNumber = await getNextProcedureNumber();
      setNextProcedureNumber(nextNumber);

      // تفريغ النموذج بعد الحفظ
      reset({
        procedure_number: nextNumber,
        reception_date: getSaudiDate(),
        samples: [{
          sample_number: '1',
          section: '',
          required_test: '',
          sample_type: '',
          animal_type: '',
          sample_count: 1,
          notes: ''
        }],
        temperature: 'appropriate',
        preservation_method: 'appropriate',
        sample_data: 'correct',
        sample_count_accuracy: 'correct',
        client_name: '',
        civil_record: '',
        external_procedure_number: '',
        external_procedure_date: '',
        vet_procedure_id: '',
        country_port: '',
        custom_country_port: '',
        sample_source: '',
        custom_sample_origin: '',
        receiver_name: '',
        custom_receiver_name: '',
        quality_notes: '',
      });
      setShowCustomCountryPort(false);
      setShowCustomSampleOrigin(false);
      setShowCustomReceiverName(false);
      setShowCustomSections({});
      setShowCustomTests({});
      setExpandedSamples({});
      setVeterinaryProcedureNumber('');

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

  const needsQualityNotes = 
    watchedValues.temperature === 'inappropriate' ||
    watchedValues.preservation_method === 'inappropriate' ||
    watchedValues.sample_data === 'incorrect' ||
    watchedValues.sample_count_accuracy === 'incorrect';

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={FileText}
            title="استقبال العينات"
            subtitle="تسجيل وإدارة العينات الواردة للمختبر"
          />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* استيراد من القسم البيطري */}
            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/50 border-2 border-amber-200 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-right text-amber-800 flex items-center justify-start gap-3" style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                <span style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>استيراد من القسم البيطري</span>
                <Upload className="w-5 h-5" />
              </h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الإجراء البيطري
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={veterinaryProcedureNumber}
                      onChange={(e) => setVeterinaryProcedureNumber(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="أدخل رقم الإجراء البيطري..."
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-amber-600 hover:bg-gray-100 rounded transition-all duration-200"
                      title="لصق من الحافظة"
                    >
                      <Clipboard className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleImportFromQuarantine}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
                >
                  <Download className="w-5 h-5" />
                  استيراد البيانات
                </button>
              </div>
            </div>

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
                    رقم الإجراء المخبري <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('procedure_number')}
                      readOnly
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-secondary-50/80 text-right font-mono text-lg font-bold text-secondary-700 shadow-inner"
                      value={nextProcedureNumber}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <span className="bg-secondary-200 text-secondary-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
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
                    تاريخ الإجراء المخبري <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('reception_date')}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                  />
                  {errors.client_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.client_name.message}</p>
                  )}
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
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    بلد المنشأ <span className="text-red-500">*</span>
                  </label>
                  {watchedCountryPort === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_country_port')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="اكتب بلد المنشأ..."
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
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
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
                  {errors.custom_country_port && (
                    <p className="text-red-500 text-sm mt-1">{errors.custom_country_port.message}</p>
                  )}
                </div>
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مكان ورود العينة <span className="text-red-500">*</span>
                  </label>
                  {watchedSampleOrigin === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_sample_origin')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="اكتب مكان ورود العينة..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue('sample_source', '');
                          setValue('custom_sample_origin', '');
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
                      {...register('sample_source')}
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                    >
                      <option value="">اختر مكان ورود العينة</option>
                      {sampleOriginOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.sample_source && (
                    <p className="text-red-500 text-sm mt-1">{errors.sample_source.message}</p>
                  )}
                  {errors.custom_sample_origin && (
                    <p className="text-red-500 text-sm mt-1">{errors.custom_sample_origin.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم مستلم العينة <span className="text-red-500">*</span>
                  </label>
                  {watchedReceiverName === 'أخرى' ? (
                    <div className="relative">
                      <input
                        {...register('custom_receiver_name')}
                        className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                        placeholder="اكتب اسم مستلم العينة..."
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
                      className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                    >
                      <option value="">اختر اسم مستلم العينة</option>
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
                  {errors.custom_receiver_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.custom_receiver_name.message}</p>
                  )}
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
              </div>
            </div>

            {/* Samples */}
            <div className={`border-2 rounded-xl p-6 shadow-lg transition-all ${
              !areSamplesValid() ? 'bg-red-50/80 border-red-300' : 'bg-accent-50/80 border-accent-200'
            }`}>
              <h3 className="text-xl font-bold text-right flex items-center gap-3 mb-6" style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                <span className={!areSamplesValid() ? 'text-red-700' : 'text-accent-800'} style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>العينات</span>
                {!areSamplesValid() && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقول إلزامية مفقودة
                  </span>
                )}
                <div className={`w-3 h-3 rounded-full ${!areSamplesValid() ? 'bg-red-500' : 'bg-accent-500'}`}></div>
              </h3>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const isExpanded = expandedSamples[index];
                  const sampleNumber = watchedSamples?.[index]?.sample_number || (index + 1).toString();
                  const isValid = isSampleValid(index);

                  return (
                    <div key={field.id} className={`bg-white/80 backdrop-blur-sm border-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
                      !isValid ? 'border-red-400 shadow-red-200' : 'border-accent-100'
                    }`}>

                      {/* شريط العنوان القابل للطي */}
                      <div
                        onClick={() => toggleSample(index)}
                        className={`px-4 h-[50px] flex items-center justify-between cursor-pointer transition-all duration-200 ${
                          !isValid ? 'bg-red-50 hover:bg-red-100' : 'bg-accent-100/90 hover:bg-accent-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={!isValid ? 'text-red-700' : 'text-accent-700'}>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                          <span className={`font-bold text-lg ${!isValid ? 'text-red-700' : 'text-accent-800'}`}>
                            عينة رقم {sampleNumber}
                          </span>
                          {!isValid && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                              <AlertCircle className="w-4 h-4" />
                              حقول إلزامية مفقودة
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* زر حذف العينة */}
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(index);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </button>
                          )}

                          {/* زر إضافة عينة جديدة */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              append({ sample_number: (fields.length + 1).toString() });
                            }}
                            className="bg-secondary-500 text-white px-4 py-2 rounded-lg hover:bg-secondary-600 flex items-center gap-2 shadow-md transform hover:scale-105 transition-all duration-200"
                          >
                            <Plus className="w-4 h-4" />
                            إضافة عينة
                          </button>
                        </div>
                      </div>

                      {/* محتوى العينة القابل للطي */}
                      {isExpanded && (
                        <div className="p-6">
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
                            className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 bg-accent-50/80 font-semibold text-accent-700"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <span className="bg-accent-200 text-accent-900 px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          القسم <span className="text-red-500">*</span>
                        </label>
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
                        {errors.samples?.[index]?.section && (
                          <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.section?.message}</p>
                        )}
                      </div>

                      {/* حقل القسم المخصص - يظهر عند اختيار "أخرى" */}
                      {watchedSamples[index]?.section === 'other' && (
                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            اكتب اسم القسم <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              {...register(`samples.${index}.custom_section`)}
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                              placeholder="اكتب اسم القسم..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`samples.${index}.section`, '');
                                setValue(`samples.${index}.custom_section`, '');
                              }}
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الفحص المطلوب <span className="text-red-500">*</span>
                        </label>
                        {watchedSamples[index]?.required_test === 'أخرى' ? (
                          <div className="relative">
                            <input
                              {...register(`samples.${index}.custom_test`)}
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                              placeholder="اكتب الفحص المطلوب..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`samples.${index}.required_test`, '');
                                setValue(`samples.${index}.custom_test`, '');
                              }}
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : watchedSamples[index]?.section && watchedSamples[index]?.section !== 'other' && testsBySection[watchedSamples[index].section as keyof typeof testsBySection] ? (
                          <select
                            {...register(`samples.${index}.required_test`)}
                            className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                          >
                            <option value="">اختر الفحص المطلوب</option>
                            {testsBySection[watchedSamples[index].section as keyof typeof testsBySection]?.map((test) => (
                              <option key={test} value={test}>
                                {test}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            {...register(`samples.${index}.required_test`)}
                            className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
                            placeholder="اكتب الفحص المطلوب..."
                          />
                        )}
                        {errors.samples?.[index]?.required_test && (
                          <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.required_test?.message}</p>
                        )}
                        {errors.samples?.[index]?.custom_test && (
                          <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.custom_test?.message}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع العينة <span className="text-red-500">*</span>
                        </label>
                        {watchedSamples[index]?.sample_type === 'أخرى' ? (
                          <div className="relative">
                            <input
                              {...register(`samples.${index}.custom_sample_type`)}
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                              placeholder="اكتب نوع العينة..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`samples.${index}.sample_type`, '');
                                setValue(`samples.${index}.custom_sample_type`, '');
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
                        {errors.samples?.[index]?.custom_sample_type && (
                          <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.custom_sample_type?.message}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع الحيوان <span className="text-red-500">*</span>
                        </label>
                        {watchedSamples[index]?.animal_type === 'أخرى' ? (
                          <div className="relative">
                            <input
                              {...register(`samples.${index}.custom_animal_type`)}
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200 pr-12"
                              placeholder="اكتب نوع الحيوان..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`samples.${index}.animal_type`, '');
                                setValue(`samples.${index}.custom_animal_type`, '');
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
                        {errors.samples?.[index]?.custom_animal_type && (
                          <p className="text-red-500 text-sm mt-1">{errors.samples[index]?.custom_animal_type?.message}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          عدد العينات <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...register(`samples.${index}.sample_count`, { valueAsNumber: true })}
                          className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right transition-all duration-200"
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
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right resize-y min-h-[80px] transition-all duration-200"
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

            {/* Quality Check */}
            <div className="bg-teal-50/80 border-2 border-teal-200 rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-right text-teal-900 flex items-center gap-2 mb-4" style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>
                <span style={{ fontFamily: "'SST Arabic', sans-serif", fontWeight: 700 }}>فحص جودة العينات</span>
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
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right resize-y min-h-[80px] transition-all duration-200 bg-red-50/50 text-sm"
                    placeholder="يرجى توضيح سبب عدم مناسبة العينة..."
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-8">
              <button
                type="submit"
                className="bg-secondary-500 text-white px-12 py-4 rounded-2xl hover:bg-secondary-600 flex items-center gap-3 shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-bold"
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