import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Package, Minus, CreditCard as Edit, Trash2, Search, Printer, Download } from 'lucide-react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory, type InventoryItem } from '../../../hooks/useInventory';
import * as XLSX from 'xlsx';
import { localDB } from '../../../lib/localDatabase';
import PageHeader from '../../shared/PageHeader';
import { useAuth } from '../../../hooks/useAuth.tsx';
import { getSaudiDate } from '../../../lib/shared-constants';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'اسم المشخص/الأداة مطلوب'),
  quantity: z.number().min(1, 'العدد يجب أن يكون أكبر من صفر'),
  type: z.string().min(1, 'النوع مطلوب'),
  custom_type: z.string().optional(),
  unit: z.string().min(1, 'الوحدة مطلوبة'),
  custom_unit: z.string().optional(),
  size: z.string().optional(),
  section: z.string().min(1, 'القسم مطلوب'),
  custom_section: z.string().optional(),
  expiry_date: z.string().optional(),
  serial_number: z.string().optional(),
  batch_number: z.string().optional(),
});

const withdrawalSchema = z.object({
  quantity: z.number().min(1, 'الكمية يجب أن تكون أكبر من صفر'),
  specialist_name: z.string().min(1, 'اسم الأخصائي مطلوب'),
  custom_specialist_name: z.string().optional(),
});

type InventoryItemForm = z.infer<typeof inventoryItemSchema>;
type WithdrawalForm = z.infer<typeof withdrawalSchema>;

const typeLabels = {
  diagnostic: 'مشخص',
  tools: 'أدوات',
};

const unitLabels = {
  carton: 'كرتون',
  bag: 'كيس',
  box: 'علبة',
};

const sectionLabels = {
  bacteriology: 'البكتيريا',
  Virology: 'الفيروسات',
  parasitology: 'الطفيليات',
  poultry: 'الدواجن',
  'Molecular biology': 'الأحياء الجزيئية',
  other: 'أخرى',
};

const specialistOptions = [
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

export default function Inventory() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showCustomSpecialist, setShowCustomSpecialist] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { items, loading, addItem, withdrawItem, deleteItem, updateItem } = useInventory();
  const { hasPermission } = useAuth();

  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItem,
    watch: watchItem,
    setValue: setItemValue,
    formState: { errors: itemErrors },
  } = useForm<InventoryItemForm>({
    resolver: zodResolver(inventoryItemSchema),
  });

  const {
    register: registerWithdrawal,
    handleSubmit: handleSubmitWithdrawal,
    reset: resetWithdrawal,
    watch: watchWithdrawal,
    setValue: setWithdrawalValue,
    formState: { errors: withdrawalErrors },
  } = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
  });

  const watchedSpecialist = watchWithdrawal('specialist_name');
  const watchedType = watchItem('type');
  const watchedUnit = watchItem('unit');
  const watchedSection = watchItem('section');

  const filteredInventory = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || item.section === sectionFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesSection && matchesType;
  });

  // حساب الصفحات
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // إعادة تعيين الصفحة إلى 1 عند تغيير البحث أو الفلتر
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sectionFilter, typeFilter]);

  const onSubmitItem = async (data: InventoryItemForm) => {
    try {
      // معالجة النوع
      const finalType = data.type === 'أخرى' ? data.custom_type?.trim() : data.type;
      if (!finalType) {
        toast.error('يرجى تحديد النوع');
        return;
      }

      // معالجة الوحدة
      const finalUnit = data.unit === 'أخرى' ? data.custom_unit?.trim() : data.unit;
      if (!finalUnit) {
        toast.error('يرجى تحديد الوحدة');
        return;
      }

      // معالجة القسم
      const finalSection = data.section === 'أخرى' ? data.custom_section?.trim() : data.section;
      if (!finalSection) {
        toast.error('يرجى تحديد القسم');
        return;
      }

      const { custom_section, custom_type, custom_unit, ...cleanData } = data;

      const itemData = {
        ...cleanData,
        type: finalType as 'diagnostic' | 'tools',
        unit: finalUnit,
        section: finalSection,
        expiry_date: cleanData.expiry_date && cleanData.expiry_date.trim() !== '' ? cleanData.expiry_date : null,
        serial_number: cleanData.serial_number && cleanData.serial_number.trim() !== '' ? cleanData.serial_number : null,
        batch_number: cleanData.batch_number && cleanData.batch_number.trim() !== '' ? cleanData.batch_number : null,
        size: cleanData.size && cleanData.size.trim() !== '' ? cleanData.size : null,
      };

      if (editingItem) {
        await updateItem(editingItem.id, itemData as Partial<InventoryItem>);
        setShowEditForm(false);
        setEditingItem(null);
      } else {
        await addItem(itemData as Partial<InventoryItem>);
        setShowAddForm(false);
      }
      resetItem();

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
      console.error('Error saving item:', error);
    }
  };

  const onSubmitWithdrawal = async (data: WithdrawalForm) => {
    if (!selectedItem) return;

    if (data.quantity > selectedItem.quantity) {
      toast.error('الكمية المطلوبة أكبر من المتوفرة');
      return;
    }

    try {
      // استخدام الاسم المخصص إذا تم اختيار "أخرى"
      const finalSpecialistName = data.specialist_name === 'أخرى' ? data.custom_specialist_name : data.specialist_name;
      await withdrawItem(selectedItem.id, data.quantity, finalSpecialistName || '');
      setShowWithdrawalForm(false);
      setSelectedItem(null);
      setShowCustomSpecialist(false);
      resetWithdrawal();
    } catch (error) {
      console.error('Error withdrawing item:', error);
    }
  };

  const handleWithdrawal = (item: any) => {
    if (item.quantity === 0) {
      toast.error('هذا الصنف غير متوفر');
      return;
    }
    setSelectedItem(item);
    setShowWithdrawalForm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setItemValue('name', item.name);
    setItemValue('quantity', item.quantity);

    // Handle type - check if it's a custom value
    if (item.type === 'diagnostic' || item.type === 'tools') {
      setItemValue('type', item.type);
      setItemValue('custom_type', '');
    } else {
      setItemValue('type', 'أخرى');
      setItemValue('custom_type', item.type);
    }

    // Handle unit - check if it's a custom value
    if (item.unit === 'carton' || item.unit === 'bag' || item.unit === 'box') {
      setItemValue('unit', item.unit);
      setItemValue('custom_unit', '');
    } else {
      setItemValue('unit', 'أخرى');
      setItemValue('custom_unit', item.unit);
    }

    setItemValue('size', item.size || '');

    // Handle section - check if it's a custom value
    const predefinedSections = ['bacteriology', 'Virology', 'parasitology', 'poultry', 'Molecular biology'];
    if (predefinedSections.includes(item.section)) {
      setItemValue('section', item.section);
      setItemValue('custom_section', '');
    } else {
      setItemValue('section', 'أخرى');
      setItemValue('custom_section', item.section);
    }

    setItemValue('expiry_date', item.expiry_date || '');
    setItemValue('serial_number', item.serial_number || '');
    setItemValue('batch_number', item.batch_number || '');
    setShowEditForm(true);
  };

  const getItemStatus = (item: any) => {
    if (item.quantity === 0) return 'out_of_stock';
    if (item.quantity < 5) return 'low';
    return 'good';
  };

  const getExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return 'none';

    const expiry = new Date(expiryDate);
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    if (expiry < today) return 'expired';
    if (expiry < sixMonthsFromNow) return 'expiring_soon';
    return 'valid';
  };

  const getExpiryBorderClass = (expiryStatus: string) => {
    switch (expiryStatus) {
      case 'expired':
        return 'border-red-500 border-2';
      case 'expiring_soon':
        return 'border-yellow-500 border-2';
      default:
        return 'border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'good':
        return 'متوفر';
      case 'low':
        return 'كمية قليلة';
      case 'out_of_stock':
        return 'غير متوفر';
      default:
        return 'غير محدد';
    }
  };

  const handlePrintClick = () => {
    setShowPrintPreview(true);
  };

      const printInventory = () => {

    // Get the content to print
    const printArea = document.querySelector('.print-modal-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    // Clone and clean the content
    const clonedContent = printArea.cloneNode(true) as HTMLElement;
    const noPrintElements = clonedContent.querySelectorAll('.no-print, button, svg');
    noPrintElements.forEach(el => el.remove());

    // Create temporary print container
    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container-inventory';
    printContainer.style.display = 'none';
    printContainer.appendChild(clonedContent);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-inventory';
    printStyles.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm !important;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .no-print,
        button,
        svg {
          display: none !important;
        }

        .no-break {
          page-break-inside: avoid !important;
        }

        h1, h2, h3 {
          page-break-after: avoid !important;
        }

        body::after {
          content: "هذا التقرير صادر من مختبر محجر ميناء جدة الإسلامي • جميع النتائج المخبرية دقيقة ومعتمدة • تعتبر هذه الوثيقة سرية وغير قابلة للتداول" !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          height: 35px !important;
          text-align: center !important;
          font-size: 6.5px !important;
          padding: 5px 10px !important;
          background: white !important;
          border-top: 2px solid #008a40 !important;
          box-sizing: border-box !important;
          color: #374151 !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          z-index: 9999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body > *:not(#temp-print-container-inventory) {
          display: none !important;
        }

        #temp-print-container-inventory {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-inventory * {
          visibility: visible !important;
        }

        h1 { color: #003361 !important; }
        h2 { color: #00a651 !important; }
        h3 { color: #6b7280 !important; }

        .text-gray-900 { color: #111827 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .font-semibold { font-weight: 600 !important; }
        .font-bold { font-weight: 700 !important; }

        .bg-blue-50 { background-color: #eff6ff !important; }
        .bg-gray-50 { background-color: #f9fafb !important; }
        .bg-green-50 { background-color: #f0fdf4 !important; }
        .border-gray-200 { border-color: #e5e7eb !important; }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-inventory');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    // Print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-inventory');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-inventory');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const exportToExcel = async () => {
    try {
      const transactions = await localDB.getInventoryTransactions();

      const exportData = filteredInventory.map(item => ({
        'اسم الصنف': item.name,
        'الكمية الحالية': (() => {
          return item.quantity;
        })(),
        'الكمية المدخلة': (() => {
          const itemTransactions = transactions.filter(t => t.item_id === item.id);
          const totalWithdrawn = itemTransactions
            .filter(t => t.type === 'withdrawal')
            .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
          return item.quantity + totalWithdrawn;
        })(),
        'الكمية المصروفة': (() => {
          const itemTransactions = transactions.filter(t => t.item_id === item.id);
          return itemTransactions
            .filter(t => t.type === 'withdrawal')
            .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
        })(),
        'النوع': typeLabels[item.type as keyof typeof typeLabels] || item.type || '-',
        'الوحدة': unitLabels[item.unit as keyof typeof unitLabels] || item.unit || '-',
        'الحجم': item.size || '-',
        'القسم': sectionLabels[item.section as keyof typeof sectionLabels] || item.section,
        'تاريخ الإدخال': item.entry_date,
        'تاريخ الانتهاء': item.expiry_date || '-',
        'الرقم التسلسلي': item.serial_number || '-',
        'رقم التشغيلة': item.batch_number || '-',
        'الحالة': getStatusLabel(getItemStatus(item))
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'المخزون');

      const fileName = `تقرير_المخزون_${getSaudiDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('خطأ في تصدير البيانات');
    }
  };

  // Modal للطباعة

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المخزون...</p>
        </div>
      </div>
    );
  }

  if (showAddForm || showEditForm) {
    const isEditing = showEditForm && editingItem;
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setShowEditForm(false);
                setEditingItem(null);
                resetItem();
              }}
              className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
            >
              إلغاء
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'تعديل صنف' : 'إضافة صنف جديد'}</h2>
          </div>

          <form onSubmit={handleSubmitItem(onSubmitItem)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المشخص/الأداة <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerItem('name')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
                {itemErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.name.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العدد <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  {...registerItem('quantity', { valueAsNumber: true })}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
                {itemErrors.quantity && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.quantity.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النوع <span className="text-red-500">*</span>
                </label>
                {watchedType === 'أخرى' ? (
                  <div className="relative">
                    <input
                      {...registerItem('custom_type')}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                      placeholder="اكتب النوع..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setItemValue('type', '');
                        setItemValue('custom_type', '');
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    {...registerItem('type')}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">اختر النوع</option>
                    <option value="diagnostic">مشخص</option>
                    <option value="tools">أدوات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                )}
                {itemErrors.type && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.type.message}</p>
                )}
                {itemErrors.custom_type && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.custom_type.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوحدة <span className="text-red-500">*</span>
                </label>
                {watchedUnit === 'أخرى' ? (
                  <div className="relative">
                    <input
                      {...registerItem('custom_unit')}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                      placeholder="اكتب الوحدة..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setItemValue('unit', '');
                        setItemValue('custom_unit', '');
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    {...registerItem('unit')}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">اختر الوحدة</option>
                    <option value="carton">كرتون</option>
                    <option value="bag">كيس</option>
                    <option value="box">علبة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                )}
                {itemErrors.unit && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.unit.message}</p>
                )}
                {itemErrors.custom_unit && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.custom_unit.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحجم
                </label>
                <input
                  {...registerItem('size')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  placeholder="مثال: 500 مل"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  القسم <span className="text-red-500">*</span>
                </label>
                {watchedSection === 'أخرى' ? (
                  <div className="relative">
                    <input
                      {...registerItem('custom_section')}
                      className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                      placeholder="اكتب اسم القسم..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setItemValue('section', '');
                        setItemValue('custom_section', '');
                      }}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select
                    {...registerItem('section')}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                  >
                    <option value="">اختر القسم</option>
                    <option value="bacteriology">البكتيريا</option>
                    <option value="Virology">الفيروسات</option>
                    <option value="parasitology">الطفيليات</option>
                    <option value="poultry">الدواجن</option>
                    <option value="Molecular biology">الأحياء الجزيئية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                )}
                {itemErrors.section && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.section.message}</p>
                )}
                {itemErrors.custom_section && (
                  <p className="text-red-500 text-sm mt-1">{itemErrors.custom_section.message}</p>
                )}
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الانتهاء
                </label>
                <input
                  type="date"
                  {...registerItem('expiry_date')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم التسلسلي
                </label>
                <input
                  {...registerItem('serial_number')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>

              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم التشغيلة
                </label>
                <input
                  {...registerItem('batch_number')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                />
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="bg-secondary-600 text-white px-8 py-3 rounded-lg hover:bg-secondary-700 flex items-center gap-2 text-lg font-medium"
              >
                {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {isEditing ? 'حفظ التعديلات' : 'إضافة الصنف'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showWithdrawalForm && selectedItem) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setShowWithdrawalForm(false);
                setSelectedItem(null);
                setShowCustomSpecialist(false);
              }}
              className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
            >
              إلغاء
            </button>
            <h2 className="text-2xl font-bold text-gray-900">صرف من المخزون</h2>
          </div>

          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-primary-900 mb-2">معلومات الصنف</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-right">
                <span className="font-semibold">الاسم: </span>
                <span>{selectedItem.name}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">الكمية المتوفرة: </span>
                <span className="text-secondary-600 font-bold">{selectedItem.quantity}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">النوع: </span>
                <span>{typeLabels[selectedItem.type as keyof typeof typeLabels] || selectedItem.type}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">الوحدة: </span>
                <span>{unitLabels[selectedItem.unit as keyof typeof unitLabels] || selectedItem.unit}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitWithdrawal(onSubmitWithdrawal)} className="space-y-6">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الكمية المطلوب صرفها <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={selectedItem.quantity}
                {...registerWithdrawal('quantity', { valueAsNumber: true })}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              />
              {withdrawalErrors.quantity && (
                <p className="text-red-500 text-sm mt-1">{withdrawalErrors.quantity.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                الحد الأقصى: {selectedItem.quantity}
              </p>
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الأخصائي <span className="text-red-500">*</span>
              </label>
              {watchedSpecialist === 'أخرى' ? (
                <div className="relative">
                  <input
                    {...registerWithdrawal('custom_specialist_name')}
                    className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right bg-secondary-50 pr-12"
                    placeholder="اكتب اسم الأخصائي..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawalValue('specialist_name', '');
                      setWithdrawalValue('custom_specialist_name', '');
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  {...registerWithdrawal('specialist_name')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                >
                  <option value="">اختر الأخصائي</option>
                  {specialistOptions.map((specialist) => (
                    <option key={specialist} value={specialist}>
                      {specialist}
                    </option>
                  ))}
                </select>
              )}
              {withdrawalErrors.specialist_name && (
                <p className="text-red-500 text-sm mt-1">{withdrawalErrors.specialist_name.message}</p>
              )}
              {withdrawalErrors.custom_specialist_name && (
                <p className="text-red-500 text-sm mt-1">{withdrawalErrors.custom_specialist_name.message}</p>
              )}
            </div>

            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 flex items-center gap-2 text-lg font-medium"
              >
                <Minus className="w-5 h-5" />
                تسجيل الصرف
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Package}
            title="المخزون"
            subtitle="إدارة ومتابعة المواد والأصناف المخزنية"
          />

        <div className="flex items-center justify-end gap-4 mb-6">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrintClick}
            className="text-white px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: '#f18700' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          {hasPermission('add_inventory_item') && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-secondary-600 text-white px-4 py-2 rounded-lg hover:bg-secondary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة صنف
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-primary-50/80 p-4 rounded-lg border border-primary-200">
            <h3 className="font-bold text-primary-900 mb-2 text-right">إجمالي الأصناف</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary-600">{filteredInventory.length}</span>
              <span className="text-sm text-primary-700 block">صنف</span>
            </div>
          </div>

          <div className="bg-secondary-50/80 p-4 rounded-lg border border-secondary-200">
            <h3 className="font-bold text-secondary-900 mb-2 text-right">إجمالي الكميات</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-secondary-600">
                {filteredInventory.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
              <span className="text-sm text-secondary-700 block">وحدة</span>
            </div>
          </div>

          <div className="bg-yellow-50/80 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-bold text-yellow-900 mb-2 text-right">كمية قليلة</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-yellow-600">
                {filteredInventory.filter(item => getItemStatus(item) === 'low').length}
              </span>
              <span className="text-sm text-yellow-700 block">صنف</span>
            </div>
          </div>

          <div className="bg-red-50/80 p-4 rounded-lg border border-red-200">
            <h3 className="font-bold text-red-900 mb-2 text-right">غير متوفر</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-red-600">
                {filteredInventory.filter(item => getItemStatus(item) === 'out_of_stock').length}
              </span>
              <span className="text-sm text-red-700 block">صنف</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الأصناف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              />
            </div>
          </div>
          
          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
            >
              <option value="all">جميع الأقسام</option>
              <option value="bacteriology">البكتيريا</option>
              <option value="Virology">الفيروسات</option>
              <option value="parasitology">الطفيليات</option>
              <option value="poultry">الدواجن</option>
              <option value="molecular_biology">الأحياء الجزيئية</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">النوع</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
            >
              <option value="all">جميع الأنواع</option>
              <option value="diagnostic">مشخص</option>
              <option value="tools">أدوات</option>
            </select>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedInventory.map((item) => {
            const status = getItemStatus(item);
            const expiryStatus = getExpiryStatus(item.expiry_date);
            const borderClass = getExpiryBorderClass(expiryStatus);
            return (
              <div key={item.id} className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${borderClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                    {expiryStatus === 'expiring_soon' && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        ينتهي التاريخ قريباً
                      </span>
                    )}
                    {expiryStatus === 'expired' && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        منتهي الصلاحية
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-right">{item.name}</h3>
                </div>

                <div className="space-y-2 text-sm text-right mb-4">
                  <div>
                    <span className="font-semibold">الكمية: </span>
                    <span className="text-secondary-600 font-bold">{item.quantity}</span>
                  </div>
                  <div>
                    <span className="font-semibold">النوع: </span>
                    <span>{typeLabels[item.type as keyof typeof typeLabels] || item.type}</span>
                  </div>
                  <div>
                    <span className="font-semibold">الوحدة: </span>
                    <span>{unitLabels[item.unit as keyof typeof unitLabels] || item.unit}</span>
                  </div>
                  {item.size && (
                    <div>
                      <span className="font-semibold">الحجم: </span>
                      <span>{item.size}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">القسم: </span>
                    <span>{sectionLabels[item.section as keyof typeof sectionLabels] || item.section}</span>
                  </div>
                  {item.expiry_date && (
                    <div>
                      <span className="font-semibold">تاريخ الانتهاء: </span>
                      <span>{item.expiry_date}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  {hasPermission('edit_inventory_item') && (
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 flex items-center gap-1 text-sm"
                    >
                      <Edit className="w-3 h-3" />
                      تعديل
                    </button>
                  )}
                  {hasPermission('withdraw_inventory_item') && (
                    <button
                      onClick={() => handleWithdrawal(item)}
                      disabled={item.quantity === 0}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                    >
                      <Minus className="w-3 h-3" />
                      صرف
                    </button>
                  )}
                  {hasPermission('delete_inventory_item') && (
                    <button
                      onClick={() => {
                        setItemToDelete(item);
                        setShowDeleteModal(true);
                      }}
                      className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* أزرار التنقل بين الصفحات */}
        {filteredInventory.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              عرض {startIndex + 1} - {Math.min(endIndex, filteredInventory.length)} من أصل {filteredInventory.length} صنف
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

        {filteredInventory.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد أصناف في المخزون</p>
          </div>
        )}
      </div>

      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600">
                هل أنت متأكد من حذف الصنف "{itemToDelete.name}"؟ سيتم حذف جميع سجلات الصرف المرتبطة به.
              </p>
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

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 print-modal-content">
              <div className="flex items-center justify-between mb-6 pb-4 print-header">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold no-print"
                >
                  ×
                </button>
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#003361' }}>قسم المختبر بمحجر ميناء جدة الإسلامي</h1>
                  <h2 className="text-lg font-semibold" style={{ color: '#00a651' }}>تقرير مخزون المشخصات والأدوات</h2>
                </div>
                <button
                  onClick={printInventory}
                  className="p-2 text-white rounded-full transition-colors flex-shrink-0 flex items-center gap-2 px-4 no-print"
                  style={{ backgroundColor: '#f18700' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
                  title="طباعة"
                >
                  <Printer className="w-5 h-5" />
                  <span className="text-sm font-semibold">طباعة</span>
                </button>
              </div>

              {/* Preview Content */}
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4 no-break">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-2 text-right text-sm">إجمالي الأصناف</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{filteredInventory.length}</span>
                      <span className="text-xs text-blue-700 block">صنف</span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-bold text-green-900 mb-2 text-right text-sm">إجمالي الكميات</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">
                        {filteredInventory.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                      <span className="text-xs text-green-700 block">وحدة</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-bold text-yellow-900 mb-2 text-right text-sm">كمية قليلة</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-yellow-600">
                        {filteredInventory.filter(item => getItemStatus(item) === 'low').length}
                      </span>
                      <span className="text-xs text-yellow-700 block">صنف</span>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-bold text-red-900 mb-2 text-right text-sm">غير متوفر</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600">
                        {filteredInventory.filter(item => getItemStatus(item) === 'out_of_stock').length}
                      </span>
                      <span className="text-xs text-red-700 block">صنف</span>
                    </div>
                  </div>
                </div>

                {/* Inventory Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="px-3 py-2 text-center font-bold text-gray-900">الحالة</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">الكمية</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">القسم</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">الحجم</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">الوحدة</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">النوع</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-900">الاسم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item, index) => {
                        const status = getItemStatus(item);
                        return (
                          <tr
                            key={item.id}
                            className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-secondary-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{sectionLabels[item.section as keyof typeof sectionLabels] || item.section}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{item.size || '-'}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{unitLabels[item.unit as keyof typeof unitLabels] || item.unit}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{typeLabels[item.type as keyof typeof typeLabels] || item.type}</td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-900">{item.name}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t-2 border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-900 font-semibold mb-2 text-sm">
                      هذا التقرير تم إنشاءه لاستخدامات قسم المختبر بمحجر ميناء جدة الإسلامي
                    </p>
                    <p className="text-red-600 font-medium mb-2 text-xs">
                      تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية
                    </p>
                    <p className="text-gray-600 text-xs">
                      للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي
                    </p>
                  </div>
                </div>
              </div>
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
                تم حفظ الصنف بنجاح
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
    </div>
  );
}