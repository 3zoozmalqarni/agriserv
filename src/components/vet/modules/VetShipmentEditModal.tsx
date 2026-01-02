import { useState, useEffect, useMemo } from 'react';
import { X, Save, ChevronDown, ChevronUp, AlertCircle, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AttachmentsSection from './AttachmentsSection';
import { useVetImporters } from '../../../hooks/useVetImporters';

interface AnimalData {
  animal_type: string;
  animal_gender: string;
  animal_count: string;
  death_count: string;
  final_decision?: 'فسح' | 'حجر' | 'إرجاع' | '';
  quarantine_locations?: string[]; // مصفوفة لدعم اختيار أكثر من موقع
  quarantine_traders?: string[]; // مصفوفة أسماء التجار المختارين لحجر الخمرة
  return_category?: 'A1' | 'A2' | 'B' | '';
  return_reason?: string;
}

interface AnimalShipment {
  id: string;
  procedure_number: string;
  procedure_date?: string;
  transport_method: string;
  origin_country: string;
  importer_name: string;
  arrival_time: string;
  animals: AnimalData[];
  temperature_status: string;
  temperature_details: string;
  disease_symptoms: string;
  disease_symptoms_details: string;
  skeleton_symptoms: string;
  skeleton_symptoms_details: string;
  skin_symptoms: string;
  skin_symptoms_details: string;
  anatomical_features: string;
  anatomical_features_details: string;
  general_diagnosis: string;
  final_action: string;
  doctors: string[];
  created_at: string;
  attachments?: any[];
  final_decision?: string;
  arrival_date?: string;
}

interface VetShipmentEditModalProps {
  shipment: AnimalShipment;
  onClose: () => void;
  onSave: (updatedShipment: AnimalShipment) => void;
}

export default function VetShipmentEditModal({ shipment, onClose, onSave }: VetShipmentEditModalProps) {
  const { importers } = useVetImporters();
  // تحويل البيانات القديمة إلى الصيغة الجديدة
  const migratedShipment = {
    ...shipment,
    animals: shipment.animals.map((animal: any) => {
      // إذا كانت البيانات القديمة موجودة وليس الجديدة، قم بالتحويل
      if (animal.quarantine_location && !animal.quarantine_locations) {
        return {
          ...animal,
          quarantine_locations: [animal.quarantine_location],
          quarantine_location: undefined // حذف الحقل القديم
        };
      }
      // إذا لم يكن هناك quarantine_locations، أنشئ مصفوفة فارغة
      if (!animal.quarantine_locations) {
        return {
          ...animal,
          quarantine_locations: []
        };
      }
      return animal;
    })
  };

  const [editedShipment, setEditedShipment] = useState<AnimalShipment>(migratedShipment);
  const [expandedAnimals, setExpandedAnimals] = useState<Record<number, boolean>>({});
  const [selectedImporters, setSelectedImporters] = useState<Array<{name: string, status: string}>>([]);
  const [importerSearch, setImporterSearch] = useState('');
  const [showImporterDropdown, setShowImporterDropdown] = useState(false);

  // تهيئة المستوردين المختارين عند فتح النافذة
  useEffect(() => {
    if (editedShipment.importer_name && importers.length > 0) {
      const names = editedShipment.importer_name.split(' | ');
      const importersData = names.map(name => {
        const importer = importers.find(imp => imp.importer_name === name.trim());
        return {
          name: name.trim(),
          status: importer?.status || 'غير نشط'
        };
      });
      setSelectedImporters(importersData);
    }
  }, [editedShipment.importer_name, importers]);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showImporterDropdown && !target.closest('.importer-dropdown-container')) {
        setShowImporterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImporterDropdown]);

  const updateAnimalField = (index: number, field: keyof AnimalData, value: string) => {
    const newAnimals = [...editedShipment.animals];
    newAnimals[index] = { ...newAnimals[index], [field]: value };

    if (field === 'final_decision') {
      newAnimals[index].quarantine_locations = [];
      newAnimals[index].quarantine_traders = [];
      newAnimals[index].return_category = '';
      newAnimals[index].return_reason = '';
    }

    // حساب القرار النهائي
    const decisions = newAnimals
      .filter(a => a.final_decision && a.final_decision.trim())
      .map(a => a.final_decision);

    let finalDecision = '';

    if (decisions.length > 0) {
      const hasFaseh = decisions.includes('فسح');
      const hasHajar = decisions.includes('حجر');
      const hasIrjaa = decisions.includes('إرجاع');

      if (hasFaseh && !hasHajar && !hasIrjaa) {
        finalDecision = 'تفسح';
      } else if (!hasFaseh && hasHajar && !hasIrjaa) {
        finalDecision = 'تحجر';
      } else if (!hasFaseh && !hasHajar && hasIrjaa) {
        finalDecision = 'إرجاع';
      } else if (hasFaseh && hasHajar && !hasIrjaa) {
        finalDecision = 'حجر جزئي';
      } else if (hasFaseh && !hasHajar && hasIrjaa) {
        finalDecision = 'إرجاع جزئي';
      } else if (!hasFaseh && hasHajar && hasIrjaa) {
        finalDecision = 'حجر - إرجاع جزئي';
      } else if (hasFaseh && hasHajar && hasIrjaa) {
        finalDecision = 'حجر جزئي - إرجاع جزئي';
      }
    }

    setEditedShipment({ ...editedShipment, animals: newAnimals, final_decision: finalDecision });
  };

  // دالة لتحديث مواقع الحجر (checkboxes)
  const toggleQuarantineLocation = (index: number, location: string) => {
    const newAnimals = [...editedShipment.animals];
    const currentLocations = newAnimals[index].quarantine_locations || [];

    if (currentLocations.includes(location)) {
      // إزالة الموقع إذا كان محدداً
      newAnimals[index].quarantine_locations = currentLocations.filter(loc => loc !== location);
    } else {
      // إضافة الموقع إذا لم يكن محدداً
      newAnimals[index].quarantine_locations = [...currentLocations, location];
    }

    setEditedShipment({ ...editedShipment, animals: newAnimals });
  };

  const toggleAnimal = (index: number) => {
    setExpandedAnimals(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isAnimalBasicDataValid = (animal: AnimalData): boolean => {
    return !!(
      animal.animal_type &&
      animal.animal_type.trim() &&
      animal.animal_gender &&
      animal.animal_gender.trim() &&
      animal.animal_count !== undefined &&
      animal.animal_count !== '' &&
      animal.death_count !== undefined &&
      animal.death_count !== ''
    );
  };

  const isAnimalValid = (animal: AnimalData): boolean => {
    const hasBasicData = isAnimalBasicDataValid(animal);
    const hasDecision = animal.final_decision && animal.final_decision.trim();

    if (!hasBasicData || !hasDecision) return false;

    if (animal.final_decision === 'حجر') {
      const hasQuarantineLocation = !!(animal.quarantine_locations && animal.quarantine_locations.length > 0);

      // إذا كان "حجر في الخمرة" مختاراً، يجب اختيار تاجر واحد على الأقل
      if (animal.quarantine_locations?.includes('حجر في الخمرة')) {
        return hasQuarantineLocation && !!(animal.quarantine_traders && animal.quarantine_traders.length > 0);
      }

      return hasQuarantineLocation;
    }

    if (animal.final_decision === 'إرجاع') {
      // التحقق من وجود نوع السبب
      if (!animal.return_type || !animal.return_type.trim()) return false;

      // إذا كان السبب مرضي
      if (animal.return_type === 'مرضية') {
        return !!(animal.return_category && animal.return_category.trim() && animal.return_reason && animal.return_reason.trim());
      }

      // إذا كان السبب إداري
      if (animal.return_type === 'إدارية') {
        if (!animal.admin_return_reasons || animal.admin_return_reasons.length === 0) return false;

        // التحقق من أن جميع الأسباب الإدارية مكتملة
        return animal.admin_return_reasons.every((reason: any) => {
          if (!reason.type || !reason.type.trim()) return false;
          if (reason.type === 'أخرى') {
            return !!(reason.customText && reason.customText.trim());
          }
          return true;
        });
      }

      return false;
    }

    return true;
  };

  const isShipmentDataValid = (): boolean => {
    return !!(
      editedShipment.procedure_number &&
      editedShipment.procedure_number.trim() &&
      editedShipment.procedure_date &&
      editedShipment.procedure_date.trim() &&
      editedShipment.transport_method &&
      editedShipment.transport_method.trim() &&
      editedShipment.origin_country &&
      editedShipment.origin_country.trim() &&
      selectedImporters.length > 0 &&
      editedShipment.arrival_time &&
      editedShipment.arrival_time.trim()
    );
  };

  const areAnimalsValid = (): boolean => {
    if (editedShipment.animals.length === 0) return false;
    return editedShipment.animals.every(animal => isAnimalBasicDataValid(animal));
  };

  const isFinalActionValid = (): boolean => {
    const allAnimalsHaveDecisions = editedShipment.animals.length > 0 && editedShipment.animals.every(animal =>
      animal.final_decision && animal.final_decision.trim()
    );
    return !!(
      editedShipment.final_action &&
      editedShipment.final_action.trim() &&
      editedShipment.final_decision &&
      editedShipment.final_decision.trim() &&
      allAnimalsHaveDecisions
    );
  };

  const handleSave = () => {
    if (!isShipmentDataValid()) {
      toast.error('الرجاء إكمال البيانات الأساسية');
      return;
    }

    if (!areAnimalsValid()) {
      toast.error('الرجاء إكمال بيانات جميع الحيوانات');
      return;
    }

    const hasInvalidAnimals = editedShipment.animals.some(animal => !isAnimalValid(animal));
    if (hasInvalidAnimals) {
      toast.error('الرجاء إكمال قرارات جميع الحيوانات والبيانات المطلوبة');
      return;
    }

    if (!isFinalActionValid()) {
      toast.error('الرجاء إكمال الإجراء النهائي وقرارات الحيوانات');
      return;
    }

    onSave(editedShipment);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full my-8">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b shadow-sm rounded-t-2xl">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[#003361]">تعديل الإرسالية</h2>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#00a651' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#008a40'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00a651'}
          >
            <Save className="w-5 h-5" />
            <span className="font-semibold">حفظ التعديلات</span>
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* البيانات الأساسية */}
          <div className={`rounded-xl p-6 border transition-all ${
            !isShipmentDataValid() ? 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-300' : 'bg-gradient-to-br from-[#003361]/5 to-[#004d8c]/5 border-[#003361]/20'
          }`}>
            <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: !isShipmentDataValid() ? '#dc2626' : 'rgba(0, 51, 97, 0.3)' }}>
              <h3 className={`text-xl font-bold ${!isShipmentDataValid() ? 'text-red-700' : 'text-gray-800'}`}>
                البيانات الأساسية
              </h3>
              {!isShipmentDataValid() && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  حقول إلزامية مفقودة
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رقم الإجراء البيطري <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editedShipment.procedure_number}
                  readOnly
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التاريخ <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editedShipment.procedure_date || editedShipment.arrival_date || ''}
                  readOnly
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  وسيلة النقل <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editedShipment.transport_method}
                  readOnly
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  بلد المنشأ <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editedShipment.origin_country}
                  readOnly
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  وقت الوصول <span className="text-red-600">*</span>
                </label>
                <select
                  value={editedShipment.arrival_time}
                  onChange={(e) => setEditedShipment({ ...editedShipment, arrival_time: e.target.value })}
                  className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                >
                  <option value="">اختر وقت الوصول</option>
                  <option value="صباحاً">صباحاً</option>
                  <option value="مساءً">مساءً</option>
                  <option value="منتصف الليل">منتصف الليل</option>
                </select>
              </div>

              <div className="relative md:col-span-2 importer-dropdown-container">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  أسماء المستوردين <span className="text-red-600">*</span>
                </label>

                {selectedImporters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedImporters.map((importer, index) => {
                      const isActive = importer.status === 'نشط';
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                            isActive
                              ? 'bg-green-100 text-green-800 border-green-400'
                              : 'bg-red-100 text-red-800 border-red-400'
                          }`}
                        >
                          <span className="font-semibold text-sm">{importer.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newImporters = selectedImporters.filter((_, i) => i !== index);
                              setSelectedImporters(newImporters);
                              setEditedShipment({
                                ...editedShipment,
                                importer_name: newImporters.map(imp => imp.name).join(' | ')
                              });
                            }}
                            className="hover:bg-white/40 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={importerSearch}
                    onChange={(e) => setImporterSearch(e.target.value)}
                    onFocus={() => setShowImporterDropdown(true)}
                    placeholder="ابحث عن مستورد..."
                    className="w-full px-4 pr-12 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  />
                </div>

                {showImporterDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {importers
                      .filter(imp =>
                        !selectedImporters.some(si => si.name === imp.importer_name) &&
                        (imp.importer_name.toLowerCase().includes(importerSearch.toLowerCase()) ||
                         (imp.farm_location || '').toLowerCase().includes(importerSearch.toLowerCase()))
                      )
                      .map(importer => {
                        const isActive = importer.status === 'نشط';
                        return (
                          <div
                            key={importer.id}
                            onClick={() => {
                              const newImporters = [...selectedImporters, { name: importer.importer_name, status: importer.status }];
                              setSelectedImporters(newImporters);
                              setEditedShipment({
                                ...editedShipment,
                                importer_name: newImporters.map(imp => imp.name).join(' | ')
                              });
                              setImporterSearch('');
                            }}
                            className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                              isActive
                                ? 'hover:bg-green-50 bg-green-50/30'
                                : 'hover:bg-red-50 bg-red-50/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`font-semibold ${isActive ? 'text-green-700' : 'text-red-700'}`}>
                                {importer.importer_name}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {importer.status}
                              </span>
                            </div>
                            {importer.farm_location && (
                              <div className={`text-sm mt-0.5 ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {importer.farm_location}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {importers.filter(imp =>
                      !selectedImporters.some(si => si.name === imp.importer_name) &&
                      (imp.importer_name.toLowerCase().includes(importerSearch.toLowerCase()) ||
                       (imp.farm_location || '').toLowerCase().includes(importerSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-3 text-center text-gray-500">
                        {selectedImporters.length > 0 && importerSearch === '' ? 'ابحث لإضافة المزيد...' : 'لا توجد نتائج'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* بيانات الإرسالية */}
          <div className={`rounded-xl p-6 border transition-all ${
            !areAnimalsValid() ? 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-300' : 'bg-gradient-to-br from-[#61bf69]/10 to-[#50a857]/10 border-[#61bf69]/30'
          }`}>
            <div className="flex items-center justify-between mb-6 border-b pb-3" style={{ borderColor: !areAnimalsValid() ? '#dc2626' : 'rgba(97, 191, 105, 0.4)' }}>
              <div className="flex items-center gap-3">
                <h3 className={`text-xl font-bold ${!areAnimalsValid() ? 'text-red-700' : 'text-gray-800'}`}>
                  بيانات الإرسالية
                </h3>
                {!areAnimalsValid() && editedShipment.animals.length > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقول إلزامية مفقودة
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {editedShipment.animals.map((animal, index) => {
                const isValid = isAnimalBasicDataValid(animal);
                return (
                  <div key={index} className={`bg-white/60 rounded-lg border-2 overflow-hidden transition-all ${
                    !isValid ? 'border-red-400 shadow-red-200 shadow-lg' : 'border-[#61bf69]/30'
                  }`}>
                    <button
                      type="button"
                      onClick={() => toggleAnimal(index)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-white/80 transition-colors ${
                        !isValid ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${!isValid ? 'text-red-700' : 'text-gray-800'}`}>
                          الحيوان {index + 1}
                        </span>
                        {!isValid && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                            <AlertCircle className="w-4 h-4" />
                            حقول إلزامية مفقودة
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          {animal.animal_type && `(${animal.animal_type} - ${animal.animal_gender})`}
                        </span>
                      </div>
                      {expandedAnimals[index] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {expandedAnimals[index] && (
                      <div className="p-5 border-t border-[#61bf69]/30 bg-white/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              نوع الحيوان <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={animal.animal_type}
                              readOnly
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              جنس الحيوان <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={animal.animal_gender}
                              readOnly
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              عدد الحيوانات <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="number"
                              value={animal.animal_count}
                              onChange={(e) => updateAnimalField(index, 'animal_count', e.target.value)}
                              min="0"
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              عدد النفوق <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="number"
                              value={animal.death_count}
                              onChange={(e) => updateAnimalField(index, 'death_count', e.target.value)}
                              min="0"
                              className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
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

          {/* تقرير الكشف الظاهري */}
            <div className="bg-gradient-to-br from-[#003361]/5 to-[#61bf69]/5 rounded-xl p-6 border border-[#003361]/20">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-[#003361]/30 pb-3">
                تقرير الكشف الظاهري للإرسالية
              </h3>

              <p className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">
                بعد الكشف على جميع الأدوار والعنابر في الباخرة وعزل الحالات التي يشتبه بإصابتها بالأمراض "في حال وجودها" البيانات أدناه توضح الوضع العام للإرسالية
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    درجة الحرارة / الأغشية المخاطية <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.temperature_status}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedShipment({
                        ...editedShipment,
                        temperature_status: newValue,
                        temperature_details: newValue === 'طبيعية' ? '' : editedShipment.temperature_details
                      });
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="طبيعية">طبيعية</option>
                    <option value="غير طبيعية">غير طبيعية</option>
                  </select>
                  {editedShipment.temperature_status === 'غير طبيعية' && (
                    <textarea
                      value={editedShipment.temperature_details}
                      onChange={(e) => setEditedShipment({ ...editedShipment, temperature_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    أعراض مرضية "تنفسية - هضمية - بولية - تناسلية - عضلية - غدد لمفاوية" <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.disease_symptoms}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedShipment({
                        ...editedShipment,
                        disease_symptoms: newValue,
                        disease_symptoms_details: newValue === 'لا يوجد' ? '' : editedShipment.disease_symptoms_details
                      });
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="لا يوجد">لا يوجد</option>
                    <option value="يوجد">يوجد</option>
                  </select>
                  {editedShipment.disease_symptoms === 'يوجد' && (
                    <textarea
                      value={editedShipment.disease_symptoms_details}
                      onChange={(e) => setEditedShipment({ ...editedShipment, disease_symptoms_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    أعراض ظاهرية بالهيكل العظمي والمفاصل <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.skeleton_symptoms}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedShipment({
                        ...editedShipment,
                        skeleton_symptoms: newValue,
                        skeleton_symptoms_details: newValue === 'لا يوجد' ? '' : editedShipment.skeleton_symptoms_details
                      });
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="لا يوجد">لا يوجد</option>
                    <option value="يوجد">يوجد</option>
                  </select>
                  {editedShipment.skeleton_symptoms === 'يوجد' && (
                    <textarea
                      value={editedShipment.skeleton_symptoms_details}
                      onChange={(e) => setEditedShipment({ ...editedShipment, skeleton_symptoms_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    أعراض مرضية على الجلد والحوافر <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.skin_symptoms}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedShipment({
                        ...editedShipment,
                        skin_symptoms: newValue,
                        skin_symptoms_details: newValue === 'لا يوجد' ? '' : editedShipment.skin_symptoms_details
                      });
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="لا يوجد">لا يوجد</option>
                    <option value="يوجد">يوجد</option>
                  </select>
                  {editedShipment.skin_symptoms === 'يوجد' && (
                    <textarea
                      value={editedShipment.skin_symptoms_details}
                      onChange={(e) => setEditedShipment({ ...editedShipment, skin_symptoms_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    الصفة التشريحية "إن وجدت" <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.anatomical_features}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedShipment({
                        ...editedShipment,
                        anatomical_features: newValue,
                        anatomical_features_details: newValue === 'لا يوجد' ? '' : editedShipment.anatomical_features_details
                      });
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="لا يوجد">لا يوجد</option>
                    <option value="يوجد">يوجد</option>
                  </select>
                  {editedShipment.anatomical_features === 'يوجد' && (
                    <textarea
                      value={editedShipment.anatomical_features_details}
                      onChange={(e) => setEditedShipment({ ...editedShipment, anatomical_features_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    التشخيص العام حسب الكشف الظاهري <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editedShipment.general_diagnosis === 'سليم' ? 'سليم' : 'أخرى'}
                    onChange={(e) => {
                      if (e.target.value === 'سليم') {
                        setEditedShipment({ ...editedShipment, general_diagnosis: 'سليم' });
                      } else {
                        setEditedShipment({ ...editedShipment, general_diagnosis: '' });
                      }
                    }}
                    className="w-full px-4 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                  >
                    <option value="سليم">سليم</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  {editedShipment.general_diagnosis !== 'سليم' && (
                    <textarea
                      value={editedShipment.general_diagnosis}
                      onChange={(e) => setEditedShipment({ ...editedShipment, general_diagnosis: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mt-2"
                      placeholder="اكتب التشخيص..."
                    />
                  )}
                </div>
              </div>
            </div>

            {/* المرفقات */}
            <AttachmentsSection
              attachments={editedShipment.attachments || []}
              onAttachmentsChange={(attachments) => setEditedShipment({ ...editedShipment, attachments })}
              required={false}
            />

            {/* الإجراء النهائي */}
            <div className={`rounded-xl p-6 border transition-all ${
              !isFinalActionValid() ? 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-300' : 'bg-gradient-to-br from-red-50/30 to-rose-50/30 border-red-100'
            }`}>
              <div className="flex items-center gap-3 mb-4 border-b pb-3" style={{ borderColor: !isFinalActionValid() ? '#dc2626' : 'rgba(239, 68, 68, 0.2)' }}>
                <h3 className={`text-xl font-bold ${!isFinalActionValid() ? 'text-red-700' : 'text-gray-800'}`}>
                  الإجراء النهائي <span className="text-red-600">*</span>
                </h3>
                {!isFinalActionValid() && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    حقل إلزامي مفقود
                  </span>
                )}
              </div>

              <p className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">
                بناءً على نتيجة الكشف الظاهري ونتيجة قسم المختبرات
              </p>

              <textarea
                value={editedShipment.final_action}
                onChange={(e) => setEditedShipment({ ...editedShipment, final_action: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent mb-6"
                placeholder="اكتب الإجراء النهائي..."
              />

              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  القرار لكل حيوان <span className="text-red-600">*</span>
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  حدد القرار المناسب لكل حيوان (الحيوانات المستوردة في هذا الإجراء)
                </p>

                <div className="space-y-3">
                  {editedShipment.animals.map((animal, index) => {
                    const hasDecision = animal.final_decision && animal.final_decision.trim();
                    return (
                      <div key={index} className={`bg-white/60 border-2 rounded-lg p-4 transition-all ${
                        !hasDecision ? 'border-red-400 shadow-red-200 shadow-lg bg-red-50/30' : 'border-[#61bf69]/30'
                      }`}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-[250px]">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h5 className={`font-bold ${!hasDecision ? 'text-red-700' : 'text-gray-800'}`}>
                                {animal.animal_type} ({animal.animal_gender})
                              </h5>
                              <span className="text-sm text-gray-600">
                                العدد: {animal.animal_count || '-'} | النفوق: {animal.death_count || '-'}
                              </span>
                              {!hasDecision && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                                  <AlertCircle className="w-4 h-4" />
                                  يجب اختيار القرار
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${!hasDecision ? 'text-red-700' : 'text-gray-700'}`}>القرار:</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateAnimalField(index, 'final_decision', 'فسح')}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 text-sm ${
                                  animal.final_decision === 'فسح'
                                    ? 'bg-green-500 text-white border-green-600 shadow-lg'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50'
                                }`}
                              >
                                فسح
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAnimalField(index, 'final_decision', 'حجر')}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 text-sm ${
                                  animal.final_decision === 'حجر'
                                    ? 'bg-yellow-500 text-white border-yellow-600 shadow-lg'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-500 hover:bg-yellow-50'
                                }`}
                              >
                                حجر
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAnimalField(index, 'final_decision', 'إرجاع')}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 text-sm ${
                                  animal.final_decision === 'إرجاع'
                                    ? 'bg-red-500 text-white border-red-600 shadow-lg'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-500 hover:bg-red-50'
                                }`}
                              >
                                إرجاع
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* خيارات موقع الحجر */}
                        {animal.final_decision === 'حجر' && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              موقع الحجر <span className="text-red-600">*</span>
                              <span className="text-xs font-normal text-gray-600 mr-2">(يمكن اختيار أكثر من موقع)</span>
                            </label>
                            <div className="space-y-3">
                              {/* خيار: حجر في مزرعة المستورد */}
                              <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all hover:bg-yellow-50 hover:border-yellow-400">
                                <input
                                  type="checkbox"
                                  checked={animal.quarantine_locations?.includes('حجر في مزرعة المستورد') || false}
                                  onChange={() => toggleQuarantineLocation(index, 'حجر في مزرعة المستورد')}
                                  className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-gray-700">حجر في مزرعة المستورد</span>
                              </label>

                              {/* خيار: حجر في الخمرة */}
                              <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all hover:bg-yellow-50 hover:border-yellow-400">
                                  <input
                                    type="checkbox"
                                    checked={animal.quarantine_locations?.includes('حجر في الخمرة') || false}
                                    onChange={() => {
                                      toggleQuarantineLocation(index, 'حجر في الخمرة');
                                      // إذا تم إلغاء التحديد، امسح التاجر المختار
                                      if (animal.quarantine_locations?.includes('حجر في الخمرة')) {
                                        const newAnimals = [...editedShipment.animals];
                                        newAnimals[index].quarantine_trader = '';
                                        setEditedShipment({ ...editedShipment, animals: newAnimals });
                                      }
                                    }}
                                    className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                                  />
                                  <span className="text-sm font-semibold text-gray-700">حجر في الخمرة</span>
                                </label>

                                {/* قائمة المستوردين من المستوردين المختارين في الأعلى (نشط/غير نشط) */}
                                {animal.quarantine_locations?.includes('حجر في الخمرة') && (
                                  <div className="mr-8">
                                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                                      اختر المستوردين (حجر الخمرة) <span className="text-red-600">*</span>
                                      <span className="text-xs font-normal text-gray-500 mr-2">(يمكن اختيار أكثر من مستورد)</span>
                                    </label>

                                    {selectedImporters.length > 0 ? (
                                      <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                                        {selectedImporters.map((importer, idx) => {
                                          const fullImporter = importers.find(i => i.importer_name === importer.name);
                                          const isChecked = animal.quarantine_traders?.includes(importer.name) || false;
                                          const isActive = importer.status === 'نشط';

                                          return (
                                            <label
                                              key={idx}
                                              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border ${
                                                isActive
                                                  ? 'hover:bg-green-50 border-green-200 bg-green-50/30'
                                                  : 'hover:bg-red-50 border-red-200 bg-red-50/30'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const newAnimals = [...editedShipment.animals];
                                                  const currentTraders = newAnimals[index].quarantine_traders || [];

                                                  if (e.target.checked) {
                                                    newAnimals[index].quarantine_traders = [...currentTraders, importer.name];
                                                  } else {
                                                    newAnimals[index].quarantine_traders = currentTraders.filter(t => t !== importer.name);
                                                  }

                                                  setEditedShipment({ ...editedShipment, animals: newAnimals });
                                                }}
                                                className={`w-4 h-4 border-gray-300 rounded focus:ring-2 ${
                                                  isActive
                                                    ? 'text-green-500 focus:ring-green-500'
                                                    : 'text-red-500 focus:ring-red-500'
                                                }`}
                                              />
                                              <span className={`text-sm flex-1 font-semibold ${
                                                isActive ? 'text-green-700' : 'text-red-700'
                                              }`}>
                                                {importer.name}
                                                {fullImporter?.farm_location && (
                                                  <span className={`text-xs font-normal mr-1 ${
                                                    isActive ? 'text-green-600' : 'text-red-600'
                                                  }`}>
                                                    ({fullImporter.farm_location})
                                                  </span>
                                                )}
                                              </span>
                                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                isActive
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                {importer.status}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                        ⚠️ لا يوجد مستوردين في القائمة أعلاه
                                      </div>
                                    )}

                                    {(!animal.quarantine_traders || animal.quarantine_traders.length === 0) && selectedImporters.length > 0 && (
                                      <p className="mt-1.5 text-xs text-red-600 font-semibold">⚠️ يجب اختيار مستورد واحد على الأقل</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {(!animal.quarantine_locations || animal.quarantine_locations.length === 0) && (
                              <p className="mt-2 text-xs text-red-600 font-semibold">⚠️ يجب اختيار موقع واحد على الأقل</p>
                            )}
                          </div>
                        )}

                        {/* قوائم شرطية لسبب الإرجاع */}
                        {animal.final_decision === 'إرجاع' && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-3">
                                نوع السبب <span className="text-red-600">*</span>
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAnimals = [...editedShipment.animals];
                                    newAnimals[index] = {
                                      ...newAnimals[index],
                                      return_type: 'مرضية' as any,
                                      return_category: '',
                                      return_reason: '',
                                      admin_return_reasons: []
                                    };
                                    setEditedShipment({ ...editedShipment, animals: newAnimals });
                                  }}
                                  className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-sm ${
                                    animal.return_type === 'مرضية'
                                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105'
                                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-400 hover:shadow-md'
                                  }`}
                                >
                                  مرضية
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAnimals = [...editedShipment.animals];
                                    newAnimals[index] = {
                                      ...newAnimals[index],
                                      return_type: 'إدارية' as any,
                                      return_category: '',
                                      return_reason: '',
                                      admin_return_reasons: []
                                    };
                                    setEditedShipment({ ...editedShipment, animals: newAnimals });
                                  }}
                                  className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-sm ${
                                    animal.return_type === 'إدارية'
                                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-400 hover:shadow-md'
                                  }`}
                                >
                                  إدارية
                                </button>
                              </div>
                            </div>

                            {animal.return_type === 'مرضية' && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  السبب المرضي <span className="text-red-600">*</span>
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      فئة القائمة
                                    </label>
                                    <select
                                      value={animal.return_category || ''}
                                      onChange={(e) => {
                                        const newAnimals = [...editedShipment.animals];
                                        newAnimals[index] = {
                                          ...newAnimals[index],
                                          return_category: e.target.value as any,
                                          return_reason: ''
                                        };
                                        setEditedShipment({ ...editedShipment, animals: newAnimals });
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                    >
                                      <option value="">اختر الفئة</option>
                                      <option value="A1">A1</option>
                                      <option value="A2">A2</option>
                                      <option value="B">B</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      المرض
                                    </label>
                                    <select
                                      value={animal.return_reason || ''}
                                      onChange={(e) => updateAnimalField(index, 'return_reason', e.target.value)}
                                      disabled={!animal.return_category}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                      <option value="">اختر المرض</option>
                                      {animal.return_category === 'A1' && (
                                        <>
                                          <option value="الحمى المالطية (البروسيلا)">الحمى المالطية (البروسيلا)</option>
                                          <option value="حمى الوادي المتصدع (RVF)">حمى الوادي المتصدع (RVF)</option>
                                        </>
                                      )}
                                      {animal.return_category === 'A2' && (
                                        <>
                                          <option value="التهاب الجلد العقدي في الابقار(LSDV)">التهاب الجلد العقدي في الابقار (LSDV)</option>
                                          <option value="جدري الأغنام (SPV)">جدري الأغنام (SPV)</option>
                                          <option value="جدري الجمال (CPV)">جدري الجمال (CPV)</option>
                                          <option value="اللسان الأزرق (BTV)">اللسان الأزرق (BTV)</option>
                                          <option value="الالتهاب الرئوي البلوري في الماعز (CCP)">الالتهاب الرئوي البلوري في الماعز (CCP)</option>
                                          <option value="الالتهاب الرئوي البلوري في الأبقار (CBP)">الالتهاب الرئوي البلوري في الأبقار (CBP)</option>
                                          <option value="طاعون المجترات الصغيرة (PPR)">طاعون المجترات الصغيرة (PPR)</option>
                                          <option value="الحمى القلاعية (FMD)">الحمى القلاعية (FMD)</option>
                                        </>
                                      )}
                                      {animal.return_category === 'B' && (
                                        <>
                                          <option value="الإسهال البقري الفيروسي (BVD)">الإسهال البقري الفيروسي (BVD)</option>
                                          <option value="التهاب الأنف الرغامي البقري المعدي (IBR)">التهاب الأنف الرغامي البقري المعدي (IBR)</option>
                                          <option value="مرض السل البقري (BT)">مرض السل البقري (BT)</option>
                                          <option value="مرض الدودة الحلزونية (Screw Worm)">مرض الدودة الحلزونية (Screw Worm)</option>
                                        </>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {animal.return_type === 'إدارية' && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-semibold text-gray-700">
                                    الأسباب الإدارية <span className="text-red-600">*</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentReasons = animal.admin_return_reasons || [];
                                      updateAnimalField(index, 'admin_return_reasons', [...currentReasons, { type: '', customText: '' }]);
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
                                  >
                                    <span>+</span>
                                    <span>إضافة سبب</span>
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {(!animal.admin_return_reasons || animal.admin_return_reasons.length === 0) ? (
                                    <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                                      لم يتم إضافة أي سبب بعد
                                    </div>
                                  ) : (
                                    animal.admin_return_reasons.map((reason: any, reasonIndex: number) => (
                                      <div key={reasonIndex} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                          {reason.type === 'أخرى' ? (
                                            <input
                                              type="text"
                                              value={reason.customText || ''}
                                              onChange={(e) => {
                                                const currentReasons = [...(animal.admin_return_reasons || [])];
                                                currentReasons[reasonIndex] = {
                                                  ...currentReasons[reasonIndex],
                                                  customText: e.target.value
                                                };
                                                updateAnimalField(index, 'admin_return_reasons', currentReasons);
                                              }}
                                              placeholder="اكتب السبب..."
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                            />
                                          ) : (
                                            <select
                                              value={reason.type || ''}
                                              onChange={(e) => {
                                                const currentReasons = [...(animal.admin_return_reasons || [])];
                                                currentReasons[reasonIndex] = {
                                                  ...currentReasons[reasonIndex],
                                                  type: e.target.value,
                                                  customText: ''
                                                };
                                                updateAnimalField(index, 'admin_return_reasons', currentReasons);
                                              }}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                            >
                                              <option value="">اختر السبب</option>
                                              <option value="نقص في المستندات اللازمة">نقص في المستندات اللازمة</option>
                                              <option value="أخرى">أخرى</option>
                                            </select>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentReasons = animal.admin_return_reasons || [];
                                            const updatedReasons = currentReasons.filter((_: any, i: number) => i !== reasonIndex);
                                            updateAnimalField(index, 'admin_return_reasons', updatedReasons);
                                          }}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                                        >
                                          <span className="text-xl">×</span>
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* القرار النهائي المستنتج */}
                <div className="mt-6 pt-6 border-t-2 border-gray-300">
                  <h4 className="text-lg font-bold text-gray-800 mb-2">
                    القرار النهائي <span className="text-red-600">*</span>
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    يتم استنتاج القرار النهائي تلقائيًا بناءً على القرارات المتخذة لكل حيوان أعلاه
                  </p>

                  {editedShipment.final_decision ? (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <p className="text-blue-900 font-bold text-lg">
                          القرار النهائي المستنتج
                        </p>
                      </div>
                      <div className="text-center">
                        <span className="inline-block px-6 py-3 bg-white border-2 border-blue-400 rounded-lg text-blue-900 font-bold text-xl shadow-md">
                          {editedShipment.final_decision}
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 text-center mt-3">
                        تم استنتاجه تلقائيًا بناءً على قرارات الحيوانات أعلاه
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center">
                      <p className="text-gray-600">
                        قم باختيار قرار لكل حيوان أعلاه ليتم استنتاج القرار النهائي تلقائيًا
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
