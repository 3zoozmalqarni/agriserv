import { useState, useRef } from 'react';
import { Eye, CreditCard as Edit, Trash2, Plus, X, Save, Users, AlertCircle, Shield, Upload, CheckCircle, XCircle, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../hooks/useAuth.tsx';
import { useVetImporters } from '../../../hooks/useVetImporters';
import toast from 'react-hot-toast';
import { showToast } from '../../../lib/toastStyles';
import PageHeader from '../../shared/PageHeader';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import * as XLSX from 'xlsx';
import { getSaudiDate } from '../../../lib/shared-constants';

const importerSchema = z.object({
  importer_name: z.string().min(1, 'اسم المستورد مطلوب'),
  farm_location: z.string().optional(),
  phone_number: z.string().optional(),
  technical_report_expiry_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type ImporterFormData = z.infer<typeof importerSchema>;

interface Importer {
  id: string;
  importer_name: string;
  farm_location: string | null;
  phone_number: string | null;
  technical_report_expiry_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function VetImportersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectedImporter, setSelectedImporter] = useState<Importer | null>(null);
  const [importerToDelete, setImporterToDelete] = useState<string | null>(null);

  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddFarm, setQuickAddFarm] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const auth = useAuth();
  const hasPermission = auth?.hasPermission || (() => false);
  const { importers, loading, createImporter, updateImporter, deleteImporter } = useVetImporters();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ImporterFormData>({
    resolver: zodResolver(importerSchema),
    defaultValues: {
      status: 'نشط'
    }
  });

  const filteredImporters = importers
    .filter(importer => {
      const matchesSearch =
        importer.importer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (importer.farm_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (importer.phone_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (importer.status || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      if (a.status === 'نشط' && b.status !== 'نشط') return -1;
      if (a.status !== 'نشط' && b.status === 'نشط') return 1;
      return 0;
    });

  const activeCount = importers.filter(imp => imp.status === 'نشط').length;
  const inactiveCount = importers.length - activeCount;

  const totalPages = Math.ceil(filteredImporters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImporters = filteredImporters.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };

  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    const loadingToast = toast.loading('جاري حذف جميع المستوردين...');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const importer of importers) {
        try {
          await deleteImporter(importer.id);
          successCount++;
        } catch (error) {
          console.error(`Error deleting importer ${importer.id}:`, error);
          errorCount++;
        }
      }

      toast.dismiss(loadingToast);

      if (successCount > 0) {
        showToast.success(`تم حذف ${successCount} مستورد بنجاح` + (errorCount > 0 ? ` (فشل ${errorCount})` : ''));
      } else {
        showToast.error('فشل في حذف المستوردين');
      }

      setShowDeleteAllModal(false);
      setCurrentPage(1);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error deleting all importers:', error);
      showToast.error('حدث خطأ أثناء حذف المستوردين');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdd = () => {
    reset({
      importer_name: '',
      farm_location: '',
      phone_number: '',
      technical_report_expiry_date: '',
      notes: '',
      status: 'نشط'
    });
    setShowAddModal(true);
  };

  const handleView = (importer: Importer) => {
    setSelectedImporter(importer);
    setShowViewModal(true);
  };

  const handleEdit = (importer: Importer) => {
    setSelectedImporter(importer);
    reset({
      importer_name: importer.importer_name,
      farm_location: importer.farm_location || '',
      phone_number: importer.phone_number || '',
      technical_report_expiry_date: importer.technical_report_expiry_date || '',
      notes: importer.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    setImporterToDelete(id);
    setShowDeleteModal(true);
  };

  const onSubmitAdd = async (data: ImporterFormData) => {
    try {
      await createImporter({
        ...data,
        farm_location: data.farm_location || null,
        phone_number: data.phone_number || null,
        technical_report_expiry_date: data.technical_report_expiry_date || null,
        notes: data.notes || null
      });

      setShowAddModal(false);

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
      console.error('Error adding importer:', error);
      showToast.error('فشل في إضافة المستورد');
    }
  };

  const onSubmitEdit = async (data: ImporterFormData) => {
    if (!selectedImporter) return;

    try {
      await updateImporter(selectedImporter.id, {
        importer_name: data.importer_name,
        farm_location: data.farm_location || null,
        phone_number: data.phone_number || null,
        technical_report_expiry_date: data.technical_report_expiry_date || null,
        notes: data.notes || null
      });

      setShowEditModal(false);
      setSelectedImporter(null);

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
      console.error('Error updating importer:', error);
      showToast.error('فشل في تحديث بيانات المستورد');
    }
  };

  const confirmDelete = async () => {
    if (!importerToDelete) return;

    try {
      await deleteImporter(importerToDelete);

      showToast.success('تم حذف المستورد بنجاح');
      setShowDeleteModal(false);
      setImporterToDelete(null);
    } catch (error) {
      console.error('Error deleting importer:', error);
      showToast.error('فشل في حذف المستورد');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setImporterToDelete(null);
  };

  const handleToggleStatus = async (importer: Importer) => {
    try {
      const newStatus = importer.status === 'نشط' ? 'غير نشط' : 'نشط';
      await updateImporter(importer.id, { status: newStatus });

      showToast.success(`تم ${newStatus === 'نشط' ? 'تنشيط' : 'إلغاء تنشيط'} المستورد بنجاح`);
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast.error('فشل في تغيير حالة المستورد');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddName.trim()) {
      showToast.error('يرجى إدخال اسم المستورد');
      return;
    }

    try {
      await createImporter({
        importer_name: quickAddName,
        farm_location: quickAddFarm || null,
        phone_number: quickAddPhone || null,
        technical_report_expiry_date: null,
        notes: null,
        status: 'نشط'
      });

      showToast.success('تم إضافة المستورد بنجاح');
      setQuickAddName('');
      setQuickAddFarm('');
      setQuickAddPhone('');
    } catch (error) {
      console.error('Error adding importer:', error);
      showToast.error('فشل في إضافة المستورد');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast.error('يرجى اختيار ملف Excel صالح (.xlsx أو .xls)');
      return;
    }

    setIsImporting(true);
    const loadingToast = toast.loading('جاري استيراد البيانات...');

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            throw new Error('الملف فارغ أو لا يحتوي على بيانات');
          }

          console.log('📊 عدد الصفوف:', jsonData.length);
          console.log('📋 أسماء الأعمدة في الملف:', Object.keys(jsonData[0] || {}));
          console.log('🔍 أول صف في البيانات:', jsonData[0]);

          let successCount = 0;
          let errorCount = 0;
          let duplicateCount = 0;

          for (let i = 0; i < jsonData.length; i++) {
            try {
              const rowData: any = jsonData[i];

              // البحث عن اسم المستورد بجميع الاحتمالات الممكنة
              let importerName = '';
              const nameKeys = ['اسم المستورد', 'الاسم', 'name', 'Name', 'NAME', 'اسم', 'المستورد'];
              for (const key of nameKeys) {
                if (rowData[key] && rowData[key].toString().trim()) {
                  importerName = rowData[key].toString().trim();
                  break;
                }
              }

              if (!importerName) {
                console.warn(`الصف ${i + 1}: اسم المستورد فارغ`, rowData);
                errorCount++;
                continue;
              }

              // التحقق من عدم وجود المستورد مسبقاً
              const existingImporter = importers.find(
                imp => imp.importer_name.toLowerCase().trim() === importerName.toLowerCase().trim()
              );

              if (existingImporter) {
                console.warn(`⚠️ الصف ${i + 1}: المستورد "${importerName}" موجود مسبقاً - تم التخطي`);
                duplicateCount++;
                continue;
              }

              // البحث عن تاريخ انتهاء التقرير الفني
              const expiryDateKeys = ['تاريخ انتهاء التقرير الفني', 'تاريخ التقرير', 'expiry_date', 'التاريخ', 'تاريخ'];
              let expiryDate = '';
              for (const key of expiryDateKeys) {
                if (rowData[key]) {
                  expiryDate = rowData[key].toString().trim();
                  break;
                }
              }

              // البحث عن موقع المزرعة
              const locationKeys = ['موقع الحظائر', 'موقع المزرعة', 'الموقع', 'location', 'Location', 'موقع'];
              let farmLocation = null;
              for (const key of locationKeys) {
                if (rowData[key] && rowData[key].toString().trim()) {
                  farmLocation = rowData[key].toString().trim();
                  break;
                }
              }

              // البحث عن رقم الجوال
              const phoneKeys = ['رقم الجوال', 'الجوال', 'phone', 'Phone', 'جوال', 'رقم'];
              let phoneNumber = null;
              for (const key of phoneKeys) {
                if (rowData[key] && rowData[key].toString().trim()) {
                  phoneNumber = rowData[key].toString().trim();
                  break;
                }
              }

              // البحث عن الملاحظات
              const notesKeys = ['ملاحظات', 'notes', 'Notes', 'ملاحظة'];
              let notes = null;
              for (const key of notesKeys) {
                if (rowData[key] && rowData[key].toString().trim()) {
                  notes = rowData[key].toString().trim();
                  break;
                }
              }

              // البحث عن الحالة
              const statusKeys = ['الحالة', 'status', 'Status', 'حالة'];
              let status = 'نشط';
              for (const key of statusKeys) {
                if (rowData[key] && rowData[key].toString().trim()) {
                  status = rowData[key].toString().trim();
                  break;
                }
              }

              const importerData = {
                importer_name: importerName,
                farm_location: farmLocation,
                phone_number: phoneNumber,
                notes: notes,
                status: status,
                technical_report_expiry_date: expiryDate || null
              };

              console.log(`استيراد الصف ${i + 1}:`, importerData.importer_name);
              await createImporter(importerData);
              successCount++;
              console.log(`✓ تم استيراد: ${importerData.importer_name}`);
            } catch (error) {
              console.error(`✗ خطأ في الصف ${i + 1}:`, error);
              errorCount++;
            }
          }

          toast.dismiss(loadingToast);

          const totalProcessed = successCount + errorCount + duplicateCount;
          let message = '';

          if (successCount > 0) {
            message = `تم استيراد ${successCount} من ${totalProcessed} سجل`;
            if (duplicateCount > 0) {
              message += ` (تم تخطي ${duplicateCount} مكرر)`;
            }
            if (errorCount > 0) {
              message += ` (${errorCount} خطأ)`;
            }
            showToast.success(message);
          } else if (duplicateCount > 0 && errorCount === 0) {
            showToast.info(`جميع السجلات موجودة مسبقاً (${duplicateCount} مكرر)`);
          } else {
            showToast.error('فشل استيراد البيانات');
          }
        } catch (error) {
          toast.dismiss(loadingToast);
          console.error('Error parsing Excel:', error);
          showToast.error('خطأ في قراءة ملف Excel');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        toast.dismiss(loadingToast);
        showToast.error('فشل قراءة الملف');
        setIsImporting(false);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error importing Excel:', error);
      showToast.error('فشل في استيراد الملف');
      setIsImporting(false);
    }
  };

  const handleExportActive = () => {
    try {
      const activeImporters = importers.filter(imp => imp.status === 'نشط');

      if (activeImporters.length === 0) {
        showToast.error('لا يوجد مستوردين نشطين للتصدير');
        return;
      }

      const exportData = activeImporters.map(imp => ({
        'اسم المستورد': imp.importer_name || '',
        'موقع الحظائر': (imp.farm_location && imp.farm_location.trim() !== '') ? imp.farm_location : '-',
        'رقم الجوال': (imp.phone_number && imp.phone_number.trim() !== '') ? imp.phone_number : '-',
        'تاريخ انتهاء التقرير الفني': imp.technical_report_expiry_date || '-',
        'الملاحظات': (imp.notes && imp.notes.trim() !== '') ? imp.notes : '-',
        'الحالة': imp.status || 'نشط'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المستوردين النشطين');

      const date = getSaudiDate();
      XLSX.writeFile(wb, `المستوردين_النشطين_${date}.xlsx`);

      showToast.success(`تم تصدير ${activeImporters.length} مستورد نشط بنجاح`);
    } catch (error) {
      console.error('Error exporting active importers:', error);
      showToast.error('فشل في تصدير البيانات');
    }
  };

  const handleExportInactive = () => {
    try {
      const inactiveImporters = importers.filter(imp => imp.status !== 'نشط');

      if (inactiveImporters.length === 0) {
        showToast.error('لا يوجد مستوردين غير نشطين للتصدير');
        return;
      }

      const exportData = inactiveImporters.map(imp => ({
        'اسم المستورد': imp.importer_name || '',
        'موقع الحظائر': (imp.farm_location && imp.farm_location.trim() !== '') ? imp.farm_location : '-',
        'رقم الجوال': (imp.phone_number && imp.phone_number.trim() !== '') ? imp.phone_number : '-',
        'تاريخ انتهاء التقرير الفني': imp.technical_report_expiry_date || '-',
        'الملاحظات': (imp.notes && imp.notes.trim() !== '') ? imp.notes : '-',
        'الحالة': imp.status || 'غير نشط'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المستوردين الغير نشطين');

      const date = getSaudiDate();
      XLSX.writeFile(wb, `المستوردين_الغير_نشطين_${date}.xlsx`);

      showToast.success(`تم تصدير ${inactiveImporters.length} مستورد غير نشط بنجاح`);
    } catch (error) {
      console.error('Error exporting inactive importers:', error);
      showToast.error('فشل في تصدير البيانات');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'نشط':
        return 'bg-green-500 text-white';
      case 'غير نشط':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="min-h-0 bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-4">
          <PageHeader
            icon={Users}
            title="بيانات المستوردين"
            subtitle="إدارة بيانات المستوردين والمزارع"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2 mt-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-semibold mb-1">عدد المستوردين</p>
                  <p className="text-3xl font-bold text-blue-700">{importers.length}</p>
                </div>
                <div className="bg-blue-200 rounded-full p-3">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border-2 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-semibold mb-1">المستوردين النشطين</p>
                  <p className="text-3xl font-bold text-green-700">{activeCount}</p>
                </div>
                <div className="bg-green-200 rounded-full p-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 border-2 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-semibold mb-1">غير النشطين</p>
                  <p className="text-3xl font-bold text-red-700">{inactiveCount}</p>
                </div>
                <div className="bg-red-200 rounded-full p-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-2">
            <div className="flex-1">
              <SearchInputWithPaste
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="ابحث بالاسم، الموقع، رقم الجوال، أو الحالة..."
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
                disabled={isImporting}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isDeleting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد'}</span>
              </button>
              <button
                onClick={handleExportActive}
                disabled={isImporting || isDeleting || activeCount === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="تصدير المستوردين النشطين"
              >
                <Upload className="w-5 h-5" />
                <span>تصدير النشط</span>
              </button>
              <button
                onClick={handleExportInactive}
                disabled={isImporting || isDeleting || inactiveCount === 0}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="تصدير المستوردين الغير نشطين"
              >
                <Upload className="w-5 h-5" />
                <span>تصدير الغير نشط</span>
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isImporting || isDeleting || importers.length === 0}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="حذف جميع المستوردين"
              >
                <Trash2 className="w-5 h-5" />
                <span>{isDeleting ? 'جاري الحذف...' : 'حذف الكل'}</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#61bf69]/10 to-[#50a857]/10 rounded-xl border-2 border-[#61bf69]/30 p-3 mb-2 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اسم المستورد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="أدخل اسم المستورد"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickAdd();
                    }
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  موقع المزرعة
                </label>
                <input
                  type="text"
                  value={quickAddFarm}
                  onChange={(e) => setQuickAddFarm(e.target.value)}
                  placeholder="أدخل موقع المزرعة"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickAdd();
                    }
                  }}
                />
              </div>
              <div className="md:col-span-1">
                <button
                  onClick={handleQuickAdd}
                  className="w-full bg-[#61bf69] text-white px-4 py-3 rounded-lg hover:bg-[#50a857] transition-colors flex items-center justify-center gap-2 shadow-md font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#61bf69]"></div>
              <p className="mt-4 text-gray-600">جاري التحميل...</p>
            </div>
          ) : filteredImporters.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد بيانات مستوردين</h3>
              <p className="text-gray-500">لم يتم العثور على أي مستوردين مطابقين للبحث</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap w-[35%]">اسم المستورد</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap w-[35%]">موقع المزرعة</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap w-[15%]">الحالة</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap w-[15%]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedImporters.map((importer) => (
                    <tr
                      key={importer.id}
                      className={`border-b border-gray-100 hover:bg-[#61bf69]/5 transition-colors ${
                        importer.status === 'غير نشط' ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className={`px-3 py-4 text-center font-bold ${
                        importer.status === 'غير نشط' ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {importer.importer_name}
                      </td>
                      <td className={`px-3 py-4 text-center font-medium ${
                        importer.status === 'غير نشط' ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {importer.farm_location || '-'}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-block px-4 py-2 rounded-lg font-bold text-sm shadow-md ${getStatusColor(importer.status)}`}>
                          {importer.status}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(importer)}
                            className="p-2 text-[#61bf69] hover:text-white hover:bg-[#61bf69] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(importer)}
                            className="p-2 text-[#f18700] hover:text-white hover:bg-[#f18700] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(importer)}
                            className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                              importer.status === 'نشط'
                                ? 'text-orange-600 hover:text-white hover:bg-orange-600'
                                : 'text-green-600 hover:text-white hover:bg-green-600'
                            }`}
                            title={importer.status === 'نشط' ? 'تعطيل' : 'تفعيل'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(importer.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#61bf69] text-white hover:bg-[#50a857] shadow-md hover:shadow-lg'
                    }`}
                  >
                    السابق
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                              currentPage === page
                                ? 'bg-[#61bf69] text-white shadow-lg scale-110'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 3 ||
                        page === currentPage + 3
                      ) {
                        return (
                          <span key={page} className="text-gray-400 px-1 text-sm">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#61bf69] text-white hover:bg-[#50a857] shadow-md hover:shadow-lg'
                    }`}
                  >
                    التالي
                  </button>
                </div>
              )}

              <div className="mt-4 text-center text-sm text-gray-600">
                عرض {startIndex + 1} - {Math.min(endIndex, filteredImporters.length)} من {filteredImporters.length} سجل
                {importers.length !== filteredImporters.length && (
                  <span className="text-[#61bf69] font-bold mr-2">
                    (تمت تصفية {importers.length - filteredImporters.length} سجل)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#61bf69] to-[#50a857] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">إضافة مستورد جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitAdd)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اسم المستورد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('importer_name')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                />
                {errors.importer_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.importer_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  موقع المزرعة
                </label>
                <input
                  type="text"
                  {...register('farm_location')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <input
                  type="text"
                  {...register('phone_number')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  تاريخ انتهاء التقرير الفني
                </label>
                <input
                  type="date"
                  {...register('technical_report_expiry_date')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  الحالة <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                >
                  <option value="نشط">نشط</option>
                  <option value="غير نشط">غير نشط</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#61bf69] text-white py-3 rounded-lg hover:bg-[#50a857] transition-colors flex items-center justify-center gap-2 font-bold shadow-md"
                >
                  <Save className="w-5 h-5" />
                  <span>حفظ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedImporter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#f18700] to-[#d97700] px-6 py-4 flex items-center justify-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">تعديل بيانات المستورد</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedImporter(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors absolute left-6"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitEdit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اسم المستورد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('importer_name')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f18700] focus:border-transparent transition-all"
                />
                {errors.importer_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.importer_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  موقع المزرعة
                </label>
                <input
                  type="text"
                  {...register('farm_location')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f18700] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <input
                  type="text"
                  {...register('phone_number')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f18700] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  تاريخ انتهاء التقرير الفني
                </label>
                <input
                  type="date"
                  {...register('technical_report_expiry_date')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f18700] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f18700] focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#f18700] text-white py-3 rounded-lg hover:bg-[#d97700] transition-colors flex items-center justify-center gap-2 font-bold shadow-md"
                >
                  <Save className="w-5 h-5" />
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedImporter(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedImporter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#003361] to-[#004080] px-6 py-4 flex items-center justify-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">تفاصيل المستورد</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedImporter(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors absolute left-6"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-2">اسم المستورد</label>
                  <p className="text-lg font-bold text-gray-900">{selectedImporter.importer_name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-2">الحالة</label>
                  <span className={`inline-block px-4 py-2 rounded-lg font-bold text-sm shadow-md ${getStatusColor(selectedImporter.status)}`}>
                    {selectedImporter.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-2">موقع المزرعة</label>
                  <p className="text-gray-900 font-medium">{selectedImporter.farm_location || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-2">رقم الجوال</label>
                  <p className="text-gray-900 font-medium">{selectedImporter.phone_number || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-500 mb-2">تاريخ انتهاء التقرير الفني</label>
                  <p className="text-gray-900 font-medium">
                    {selectedImporter.technical_report_expiry_date
                      ? new Date(selectedImporter.technical_report_expiry_date).toLocaleDateString('ar-SA')
                      : '-'}
                  </p>
                </div>
              </div>
              {selectedImporter.notes && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{selectedImporter.notes}</p>
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedImporter(null);
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-3">تأكيد الحذف</h3>
              <p className="text-gray-600 text-center mb-2">
                هل أنت متأكد من حذف هذا المستورد؟
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-center mb-6">
                <p className="text-red-800 font-bold text-sm">
                  لن تتمكن من استعادة هذه البيانات مستقبلاً
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md"
                >
                  حذف
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-3">تحذير: حذف جميع المستوردين</h3>
              <p className="text-gray-600 text-center mb-2">
                هل أنت متأكد من حذف <span className="font-bold text-red-600">{importers.length}</span> مستورد؟
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center mb-6">
                <p className="text-red-800 font-bold text-base mb-2">
                  ⚠️ تحذير خطير ⚠️
                </p>
                <p className="text-red-700 font-semibold text-sm">
                  سيتم حذف جميع المستوردين نهائياً ولن يمكن استعادتهم!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteAll}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف الكل'}
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold disabled:opacity-50"
                >
                  إلغاء
                </button>
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
                تم حفظ البيانات بنجاح
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
