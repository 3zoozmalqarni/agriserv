import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, X, Printer, Ship, FileText, Download, Star, Mail, File, CreditCard as Edit } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import { vetDB } from '../../../lib/vetDatabase';
import { useProcedures } from '../../../hooks/useProcedures';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import type { ElectronAPI } from '../../../types/electron';
import VetShipmentEditModal from './VetShipmentEditModal';
import Pagination from '../../shared/Pagination';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface AnimalShipment {
  id: string;
  procedure_number: string;
  procedure_date?: string;
  transport_method: string;
  origin_country: string;
  importer_name: string;
  arrival_time: string;
  animals: any[];
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

export default function VetShipmentRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<AnimalShipment | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState<string | null>(null);
  const [shipments, setShipments] = useState<AnimalShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);
  const [ratedProcedures, setRatedProcedures] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const auth = useAuth();
  const { hasPermission } = auth || {};
  const { procedures: labProcedures } = useProcedures();

  useEffect(() => {
    loadShipments();

    // الاستماع لتغييرات البيانات (حذف إجراءات أو إرساليات)
    const handleDataChanged = () => {
      loadShipments();
    };

    // الاستماع لتغييرات الإجراءات (عند حذف إجراء، تُحذف الإرساليات المرتبطة)
    window.addEventListener('procedures-data-changed', handleDataChanged);
    window.addEventListener('shipment-data-changed', handleDataChanged);
    window.addEventListener('vet-data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('procedures-data-changed', handleDataChanged);
      window.removeEventListener('shipment-data-changed', handleDataChanged);
      window.removeEventListener('vet-data-changed', handleDataChanged);
    };
  }, []);

  useEffect(() => {
    if (previewAttachment && showAttachmentPreview) {
      const setupPreview = async () => {
        try {
          const electronAPI = (window as any).electronAPI;
          const isElectron = !!electronAPI;

          if (isElectron && electronAPI.createTempPdfFile) {
            console.log('[VetShipmentRecords] 🖥️  Electron: حفظ PDF مؤقتاً');
            try {
              const filePath = await electronAPI.createTempPdfFile(
                previewAttachment.data,
                previewAttachment.name
              );
              console.log('[VetShipmentRecords] ✅ تم إنشاء ملف مؤقت:', filePath);
              setTempFilePath(filePath);

              const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
              console.log('[VetShipmentRecords]   - file:// URL:', fileUrl);
              setPreviewBlobUrl(fileUrl);

              return () => {
                if (electronAPI.deleteTempPdfFile) {
                  electronAPI.deleteTempPdfFile(filePath).catch((err: any) => {
                    console.warn('[VetShipmentRecords] ⚠️  فشل حذف الملف المؤقت:', err);
                  });
                }
              };
            } catch (error) {
              console.error('[VetShipmentRecords] ❌ فشل إنشاء ملف مؤقت:', error);
              toast.error('فشل إنشاء معاينة PDF');
            }
          } else {
            console.log('[VetShipmentRecords] 🌐 Browser: تحويل إلى blob URL');
            const base64Data = previewAttachment.data.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            console.log('[VetShipmentRecords] ✅ تم إنشاء blob URL:', url);
            setPreviewBlobUrl(url);

            return () => {
              if (url) {
                URL.revokeObjectURL(url);
              }
            };
          }
        } catch (error) {
          console.error('[VetShipmentRecords] ❌ خطأ في إنشاء معاينة:', error);
          toast.error('فشل عرض الملف');
        }
      };

      setupPreview();
    } else {
      setPreviewBlobUrl(null);
      setTempFilePath(null);
    }
  }, [previewAttachment, showAttachmentPreview]);

  const handleOpenExternal = async () => {
    const electronAPI = (window as any).electronAPI;
    if (tempFilePath && electronAPI?.openPdfExternal) {
      try {
        console.log('[VetShipmentRecords] 📂 فتح PDF في تطبيق خارجي');
        await electronAPI.openPdfExternal(tempFilePath);
        toast.success('تم فتح الملف في التطبيق الافتراضي');
      } catch (error) {
        console.error('[VetShipmentRecords] ❌ فشل فتح الملف:', error);
        toast.error('فشل فتح الملف في التطبيق الخارجي');
      }
    }
  };

  const loadShipments = async () => {
    setLoading(true);
    try {
      const data = await vetDB.getAnimalShipments();
      setShipments(data || []);
      await loadRatings();
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast.error('حدث خطأ في تحميل الإرساليات');
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      if (window.electronAPI?.getAllShipmentRatings) {
        const ratings = await window.electronAPI.getAllShipmentRatings();
        const procedureNumbers = new Set(ratings.map((r: any) => r.procedure_number));
        setRatedProcedures(procedureNumbers);
      } else {
        const { data, error } = await supabase
          .from('shipment_ratings')
          .select('procedure_number');

        if (error) throw error;

        if (data) {
          const procedureNumbers = new Set(data.map((r: any) => r.procedure_number));
          setRatedProcedures(procedureNumbers);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل التقييمات:', error);
    }
  };

  const filteredRecords = shipments.filter(record => {
    const matchesSearch =
      record.procedure_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.importer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.origin_country || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleView = (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (shipment) {
      setSelectedShipment(shipment);
      setShowViewModal(true);
    }
  };

  const handleViewLetter = (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (shipment) {
      setSelectedShipment(shipment);
      setShowLetterModal(true);
    }
  };

  const handleEdit = (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (shipment) {
      setSelectedShipment(shipment);
      setShowEditModal(true);
    }
  };

  const handleDelete = (id: string) => {
    setShipmentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (shipmentToDelete) {
      try {
        await vetDB.deleteAnimalShipment(shipmentToDelete);

        window.dispatchEvent(new Event('shipment-data-changed'));
        window.dispatchEvent(new Event('vet-data-changed'));
        toast.success('تم حذف الإرسالية بنجاح');
        loadShipments();
      } catch (error) {
        console.error('Error deleting shipment:', error);
        toast.error('حدث خطأ في حذف الإرسالية');
      }
      setShowDeleteModal(false);
      setShipmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setShipmentToDelete(null);
  };

  const handleUpdateShipment = async (updatedShipment: AnimalShipment) => {
    try {
      await vetDB.updateAnimalShipment(updatedShipment.id, updatedShipment);

      window.dispatchEvent(new Event('shipment-data-changed'));
      window.dispatchEvent(new Event('vet-data-changed'));

      toast.success('تم تحديث الإرسالية بنجاح');
      loadShipments();
      setShowEditModal(false);
      setSelectedShipment(null);
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('حدث خطأ في تحديث الإرسالية');
    }
  };

  const handlePrintShipment = () => {
    if (!selectedShipment) return;

    const printArea = document.querySelector('.print-modal-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    const clonedContent = printArea.cloneNode(true) as HTMLElement;
    const noPrintElements = clonedContent.querySelectorAll('.no-print, button, svg');
    noPrintElements.forEach(el => el.remove());

    // Create table structure with repeating header
    const printTable = document.createElement('table');
    printTable.style.width = '100%';
    printTable.style.borderCollapse = 'collapse';

    // Create thead (will repeat on every page)
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="padding: 0;">
          <div style="text-align: center; padding: 6px 0; margin-bottom: 6px; border-bottom: 2px solid #008a40;">
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">قسم المحجر بميناء جدة الإسلامي</h1>
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">إرسالية حيوانية</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 0; margin-top: 4px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">طريقة النقل:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.transport_method}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">اسم المستورد:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.importer_name}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">التاريخ:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.procedure_date || selectedShipment.arrival_date || 'غير محدد'}</span></div>
            </div>
          </div>
        </th>
      </tr>
    `;

    // Create tbody with content
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.style.padding = '0';
    td.appendChild(clonedContent);
    tr.appendChild(td);
    tbody.appendChild(tr);

    printTable.appendChild(thead);
    printTable.appendChild(tbody);

    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container-shipment';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-shipment';
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

        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }

        th, td {
          page-break-inside: avoid !important;
        }

        .print-modal-content {
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-modal-content > div {
          page-break-inside: auto !important;
          margin-bottom: 4px !important;
        }

        .no-break,
        .grid.grid-cols-1.md\\:grid-cols-2.gap-6 > div {
          page-break-inside: avoid !important;
          padding: 8px !important;
          margin-bottom: 4px !important;
        }

        .grid.grid-cols-1.md\\:grid-cols-2.gap-6 {
          gap: 8px !important;
          margin-bottom: 8px !important;
          page-break-inside: avoid !important;
        }

        .space-y-2 {
          margin-bottom: 6px !important;
        }

        .space-y-2 > div.bg-gray-50 {
          page-break-inside: auto !important;
          margin-bottom: 3px !important;
          padding: 6px !important;
        }

        .space-y-2 > div.bg-gray-50 > div {
          page-break-inside: avoid !important;
          orphans: 2;
          widows: 2;
        }

        h3 {
          page-break-after: avoid !important;
          margin-bottom: 6px !important;
          margin-top: 8px !important;
        }

        .section {
          page-break-inside: auto !important;
        }

        body::after {
          content: "هذا الإجراء تم إنشاءه لاستخدامات القسم البيطري بميناء جدة الإسلامي • تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية • للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي" !important;
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

        body > *:not(#temp-print-container-shipment) {
          display: none !important;
        }

        #temp-print-container-shipment {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-shipment > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-shipment * {
          visibility: visible !important;
        }

        .no-print, button, svg {
          display: none !important;
        }

        h1, h2, h3 {
          page-break-after: avoid !important;
        }

        .section {
          page-break-inside: auto !important;
        }

        .sample-card {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        .print-footer,
        .footer {
          display: none !important;
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

        .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 1rem !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-shipment');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        const container = document.getElementById('temp-print-container-shipment');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-shipment');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const handlePrintLetter = () => {
    if (!selectedShipment) return;

    const printArea = document.querySelector('.letter-print-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    const clonedContent = printArea.cloneNode(true) as HTMLElement;
    const noPrintElements = clonedContent.querySelectorAll('.no-print, button, svg');
    noPrintElements.forEach(el => el.remove());

    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container-letter';
    printContainer.style.display = 'none';
    printContainer.appendChild(clonedContent);
    document.body.appendChild(printContainer);

    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-letter';
    printStyles.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 20mm !important;
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

        body > *:not(#temp-print-container-letter) {
          display: none !important;
        }

        #temp-print-container-letter {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-letter * {
          visibility: visible !important;
        }

        .no-print, button, svg {
          display: none !important;
        }

        .letter-print-content {
          padding: 0 !important;
          margin: 0 !important;
          padding-top: 2cm !important;
          font-family: 'SST Arabic', Arial, sans-serif !important;
        }

        p, div, span {
          line-height: 2 !important;
        }

        h1, h2, h3 {
          page-break-after: avoid !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-letter');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        const container = document.getElementById('temp-print-container-letter');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-letter');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const LetterModal = () => {
    if (!showLetterModal || !selectedShipment) return null;

    const relatedLabProcedure = labProcedures.find((proc: any) =>
      proc.external_procedure_number === selectedShipment.procedure_number
    );

    const addArticle = (word: string) => {
      if (!word) return 'الحيوان';

      const startsWithAl = word.startsWith('ال');
      if (startsWithAl) return word;

      const sunLetters = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'];
      const firstLetter = word.charAt(0);

      if (sunLetters.includes(firstLetter)) {
        return `ال${word}`;
      }

      return `ال${word}`;
    };

    // التحقق من وجود قرار إرجاع
    const hasReturnDecision = selectedShipment.animals?.some(animal => animal.final_decision === 'إرجاع');

    // الحصول على الحيوانات التي تم إرجاعها فقط
    const returnedAnimals = selectedShipment.animals?.filter(animal => animal.final_decision === 'إرجاع') || [];

    // الحصول على الحيوانات التي لم يتم إرجاعها (فسح/حجر)
    const nonReturnedAnimals = selectedShipment.animals?.filter(animal => animal.final_decision !== 'إرجاع') || [];

    const getTotalAnimalsText = () => {
      if (!selectedShipment.animals || selectedShipment.animals.length === 0) return '';

      const parts: string[] = [];
      selectedShipment.animals.forEach((animal, index) => {
        const count = animal.animal_count || '0';
        const typeWithArticle = addArticle(animal.animal_type || 'حيوان');

        if (index === 0) {
          parts.push(`عدد (${count}) رأس من (${typeWithArticle})`);
        } else {
          parts.push(`عدد (${count}) رأس من (${typeWithArticle})`);
        }
      });

      return parts.join(' و');
    };

    const getAnimalDecisions = () => {
      if (!selectedShipment.animals || selectedShipment.animals.length === 0) return '';

      return selectedShipment.animals.map(animal => {
        const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
        const decision = animal.final_decision;

        if (decision === 'فسح') {
          return `(${typeWithArticle}) : لا مانع من إنزال الحمولة`;
        } else if (decision === 'حجر') {
          // دعم البيانات الجديدة (quarantine_locations) والقديمة (quarantine_location)
          let locations: string[] = [];
          if (animal.quarantine_locations && animal.quarantine_locations.length > 0) {
            locations = animal.quarantine_locations;
          } else if (animal.quarantine_location) {
            // للبيانات القديمة
            locations = [animal.quarantine_location];
          } else {
            locations = ['مزرعة المستورد'];
          }

          // التحقق من وجود حجر في الخمرة مع مستوردين محددين
          const hasKhamraWithTraders = locations.includes('حجر في الخمرة') && animal.quarantine_traders && animal.quarantine_traders.length > 0;

          if (hasKhamraWithTraders) {
            // حالة خاصة: حجر في الخمرة مع مستوردين محددين
            const otherLocations = locations.filter(loc => loc !== 'حجر في الخمرة');
            const tradersText = animal.quarantine_traders!.map(trader => `(${trader})`).join('');

            if (otherLocations.length > 0) {
              // يوجد مواقع أخرى بالإضافة للخمرة
              const otherLocsText = otherLocations.map(loc => loc.replace('حجر في ', '')).join(' و');
              return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في ${otherLocsText} بإستثناء المستوردين:${tradersText} يتم حجرها في محجر الخمرة`;
            } else {
              // حجر في الخمرة فقط
              return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في محجر الخمرة للمستوردين:${tradersText}`;
            }
          } else {
            // حالة عادية: حجر بدون تخصيص مستوردين في الخمرة
            const cleanedLocations = locations.map(loc => loc.replace('حجر في ', ''));
            const locationText = cleanedLocations.join(' و');
            return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في ${locationText}`;
          }
        } else if (decision === 'إرجاع') {
          const reason = animal.return_reason ? ` - السبب: ${animal.return_reason}` : '';
          const category = animal.return_category ? ` - الفئة: ${animal.return_category}` : '';
          return `(${typeWithArticle}) : يمنع إنزال الحمولة ويتم إرجاعها${reason}${category}`;
        }
        return '';
      }).filter(text => text).join('\n');
    };

    // الحصول على نص الحيوانات المرجعة
    const getReturnedAnimalsText = () => {
      if (returnedAnimals.length === 0) return '';

      const parts: string[] = [];
      returnedAnimals.forEach(animal => {
        const count = animal.animal_count || '0';
        const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
        parts.push(`(${typeWithArticle})`);
      });

      return parts.join(' و');
    };

    // التحقق من وجود إرجاع لأسباب مرضية
    const hasMedicalReturn = returnedAnimals.some(animal => animal.return_type === 'مرضية');

    // التحقق من وجود إرجاع لأسباب إدارية
    const hasAdminReturn = returnedAnimals.some(animal => animal.return_type === 'إدارية');

    // الحصول على نص أسباب الإرجاع حسب النوع (كنقاط)
    const getReturnReasonsBulletPoints = () => {
      const bulletPoints: string[] = [];

      // الأسباب المرضية
      const medicalAnimals = returnedAnimals.filter(animal => animal.return_type === 'مرضية');
      if (medicalAnimals.length > 0) {
        medicalAnimals.forEach(animal => {
          const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
          const disease = animal.return_reason || '';
          const category = animal.return_category || '';

          if (category === 'A1') {
            if (disease === 'الحمى المالطية (البروسيلا)') {
              bulletPoints.push(`- أظهرت الفحوصات المخبرية تجاوز (${typeWithArticle}) النسبة المسموح بها لمرض ${disease} .`);
            } else if (disease === 'حمى الوادي المتصدع (RVF)') {
              const originCountry = selectedShipment.origin_country || '';
              const isSudanSawaken = originCountry.includes('السودان') && originCountry.includes('سواكن');

              if (isSudanSawaken) {
                bulletPoints.push(`- أظهرت الفحوصات المخبرية أن كفاءة التحصين ضد مرض ${disease} لم تبلغ النسبة المسموح بها في (${typeWithArticle}) .`);
              } else {
                bulletPoints.push(`- أظهرت الفحوصات المخبرية إصابة (${typeWithArticle}) بمرض ${disease} .`);
              }
            }
          } else if (category === 'A2' || category === 'B') {
            bulletPoints.push(`- تم الاشتباه بإصابة (${typeWithArticle}) بمرض ${disease} وتم جمع العينات اللازمة و المناسبة للفحص وإرسالها إلى المختبر وأظهرت النتائج إصابة (${typeWithArticle}) بمرض ${disease} .`);
          }
        });
      }

      // الأسباب الإدارية
      const adminAnimals = returnedAnimals.filter(animal => animal.return_type === 'إدارية');
      if (adminAnimals.length > 0) {
        adminAnimals.forEach(animal => {
          const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
          const reasons: string[] = [];

          if (animal.admin_return_reasons && animal.admin_return_reasons.length > 0) {
            animal.admin_return_reasons.forEach((reason: any) => {
              if (reason.type === 'أخرى' && reason.customText) {
                reasons.push(reason.customText);
              } else if (reason.type) {
                reasons.push(reason.type);
              }
            });
          }

          if (reasons.length > 0) {
            const reasonsText = reasons.join(' و ');
            bulletPoints.push(`- إرجاع (${typeWithArticle}) بسبب ${reasonsText} .`);
          }
        });
      }

      return bulletPoints;
    };

    // الحصول على نص الحيوانات المُرجعة للفقرة الأخيرة
    const getReturnRequestText = () => {
      const animals = returnedAnimals.map(animal => {
        const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
        return typeWithArticle;
      });

      if (animals.length === 1) {
        return animals[0];
      } else if (animals.length === 2) {
        return `${animals[0]} و ${animals[1]}`;
      } else {
        const lastAnimal = animals[animals.length - 1];
        const otherAnimals = animals.slice(0, -1).join(' و ');
        return `${otherAnimals} و ${lastAnimal}`;
      }
    };

    // الحصول على نص القرار النهائي حسب نوع الإرجاع
    const getFinalDecisionText = () => {
      const returnedText = getReturnedAnimalsText();
      const hasNonReturned = nonReturnedAnimals.length > 0;
      const endText = hasNonReturned ? ' والسماح بإنزال التالي :' : ' .';

      if (hasMedicalReturn && !hasAdminReturn) {
        // إرجاع مرضي فقط
        const categories = returnedAnimals
          .filter(animal => animal.return_type === 'مرضية')
          .map(animal => animal.return_category)
          .filter((category, index, self) => category && self.indexOf(category) === index)
          .join(' و');

        return `وبناء على دليل الإجراءات المحجرية الشامل وقائمة الأمراض المحجرية (${categories}) فقد تقرر إعادة حمولة الباخرة من ${returnedText} إلى مصدرها${endText}`;
      } else if (hasAdminReturn && !hasMedicalReturn) {
        // إرجاع إداري فقط
        return `وبناء على الأسباب الإدارية المذكورة أعلاه فقد تقرر إعادة حمولة الباخرة من ${returnedText} إلى مصدرها${endText}`;
      } else if (hasMedicalReturn && hasAdminReturn) {
        // إرجاع مرضي وإداري معاً
        const categories = returnedAnimals
          .filter(animal => animal.return_type === 'مرضية')
          .map(animal => animal.return_category)
          .filter((category, index, self) => category && self.indexOf(category) === index)
          .join(' و');

        if (categories) {
          return `وبناء على دليل الإجراءات المحجرية الشامل وقائمة الأمراض المحجرية (${categories}) وبناء على الأسباب الإدارية المذكورة أعلاه فقد تقرر إعادة حمولة الباخرة من ${returnedText} إلى مصدرها${endText}`;
        } else {
          return `وبناء على الأسباب الإدارية المذكورة أعلاه فقد تقرر إعادة حمولة الباخرة من ${returnedText} إلى مصدرها${endText}`;
        }
      }

      return '';
    };

    // الحصول على الفئات الفريدة للحيوانات المرجعة (بدون تكرار)
    const getUniqueReturnCategories = () => {
      if (returnedAnimals.length === 0) return '';

      const categories = returnedAnimals
        .map(animal => animal.return_category)
        .filter((category, index, self) => category && self.indexOf(category) === index);

      return categories.join(' و');
    };

    // الحصول على السبب للحيوانات المرجعة (نستخدم أول حيوان مُرجع) - للخطابات القديمة
    const getReturnReason = () => {
      if (returnedAnimals.length === 0) return '';
      return returnedAnimals[0].return_reason || '';
    };

    // الحصول على الفئة للحيوانات المرجعة (نستخدم أول حيوان مُرجع) - للخطابات القديمة
    const getReturnCategory = () => {
      if (returnedAnimals.length === 0) return '';
      return returnedAnimals[0].return_category || '';
    };

    // الحصول على قرارات الحيوانات غير المرجعة
    const getNonReturnedDecisions = () => {
      if (nonReturnedAnimals.length === 0) return '';

      return nonReturnedAnimals.map(animal => {
        const typeWithArticle = addArticle(animal.animal_type || 'حيوان');
        const decision = animal.final_decision;

        if (decision === 'فسح') {
          return `(${typeWithArticle}) : لا مانع من إنزال الحمولة`;
        } else if (decision === 'حجر') {
          // دعم البيانات الجديدة (quarantine_locations) والقديمة (quarantine_location)
          let locations: string[] = [];
          if (animal.quarantine_locations && animal.quarantine_locations.length > 0) {
            locations = animal.quarantine_locations;
          } else if (animal.quarantine_location) {
            // للبيانات القديمة
            locations = [animal.quarantine_location];
          } else {
            locations = ['مزرعة المستورد'];
          }

          // التحقق من وجود حجر في الخمرة مع مستوردين محددين
          const hasKhamraWithTraders = locations.includes('حجر في الخمرة') && animal.quarantine_traders && animal.quarantine_traders.length > 0;

          if (hasKhamraWithTraders) {
            // حالة خاصة: حجر في الخمرة مع مستوردين محددين
            const otherLocations = locations.filter(loc => loc !== 'حجر في الخمرة');
            const tradersText = animal.quarantine_traders!.map(trader => `(${trader})`).join('');

            if (otherLocations.length > 0) {
              // يوجد مواقع أخرى بالإضافة للخمرة
              const otherLocsText = otherLocations.map(loc => loc.replace('حجر في ', '')).join(' و');
              return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في ${otherLocsText} بإستثناء المستوردين:${tradersText} يتم حجرها في محجر الخمرة`;
            } else {
              // حجر في الخمرة فقط
              return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في محجر الخمرة للمستوردين:${tradersText}`;
            }
          } else {
            // حالة عادية: حجر بدون تخصيص مستوردين في الخمرة
            const cleanedLocations = locations.map(loc => loc.replace('حجر في ', ''));
            const locationText = cleanedLocations.join(' و');
            return `(${typeWithArticle}) : لا مانع من إنزال الحمولة مع الحجر في ${locationText}`;
          }
        }
        return '';
      }).filter(text => text).join('\n');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b no-print">
              <button
                onClick={() => setShowLetterModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-[#003361]">خطاب انزال حمولة</h2>
              <button
                onClick={handlePrintLetter}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#f18700' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97700'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f18700'}
              >
                <Printer className="w-5 h-5" />
                <span className="font-semibold">طباعة</span>
              </button>
            </div>

            <div className="letter-print-content text-right px-8" style={{ lineHeight: '1.3', fontSize: '14px' }}>
              <div className="mb-3 flex justify-end">
                <div className="text-center" style={{ fontSize: '11px' }}>
                  <p className="font-bold">رقم الإجراء : {selectedShipment.procedure_number || 'غير محدد'}</p>
                  <p className="font-bold mb-2">الموضوع : {hasReturnDecision ? `إعادة حمولة الباخرة ${selectedShipment.transport_method}` : `انزال حمولة الباخرة ${selectedShipment.transport_method}`}</p>
                </div>
              </div>

              {hasReturnDecision && (
                <div className="mb-1 text-center">
                  <p className="font-bold" style={{ fontSize: '11px' }}>سري</p>
                </div>
              )}

              <div className="mb-2" style={{ textAlign: 'justify', lineHeight: '1.2' }}>
                <div className="flex justify-between items-start">
                  <p className="font-bold flex-1 text-right">سعادة مدير عام هيئة الزكاة والضريبة والجمارك بميناء جدة الإسلامي</p>
                  <p className="font-bold pr-4">المحترم</p>
                </div>
                <div className="flex justify-between items-start">
                  <p className="font-bold flex-1 text-right">صورة مع التحية لسعادة قائد وحدة أمن ميناء جدة الإسلامي</p>
                  <p className="font-bold pr-4">المحترم</p>
                </div>
                <div className="flex justify-between items-start">
                  <p className="font-bold flex-1 text-right">صورة مع التحية لسعادة المدير العام التنفيذي لميناء جدة الإسلامي</p>
                  <p className="font-bold pr-4">المحترم</p>
                </div>
              </div>

              <p className="mb-1 font-bold" style={{ textAlign: 'justify', lineHeight: '1.2' }}>السلام عليكم ورحمة اللّٰه وبركاته</p>

              {hasReturnDecision ? (
                // خطاب الإرجاع
                <>
                  <p className="mb-0.5" style={{ textAlign: 'justify', lineHeight: '1.3' }}>
                    بناء على الأمر السامي الكريم رقم 7 / ب / 16377 بتاريخ 1409/11/11 هـ القاضي بمراعاة النواحي الصحية للحيوانات الواردة. وإشارة الى نظام (قانون) الحجر البيطري في دول مجلس التعاون لدول الخليج العربية ولائحته التنفيذية بالمملكة العربية السعودية الموافق عليه بقرار مجلس الوزراء رقم 109 وتاريخ 1424/04/30 هـ فقد تمت الإجراءات الصحية البيطرية لحيوانات الباخرة ({selectedShipment.transport_method}) والقادمة من ({selectedShipment.origin_country}) وعليها {getTotalAnimalsText()} والعائدة للمستوردين / {selectedShipment.importer_name} وبعد التحقق من المستندات المصاحبة للإرسالية وصعود الأطباء على الباخرة لإجراء الكشف الظاهري وسحب العينات لإجراء الفحوصات اللازمة تقرر التالي :
                  </p>

                  <div className="mb-0.5" style={{ whiteSpace: 'pre-line', lineHeight: '1.3', textAlign: 'justify' }}>
                    {getReturnReasonsBulletPoints().map((point, idx) => (
                      <div key={idx}>{point}</div>
                    ))}
                  </div>

                  <p className="mb-0.5" style={{ textAlign: 'justify', lineHeight: '1.3' }}>
                    {getFinalDecisionText()}
                  </p>

                  {nonReturnedAnimals.length > 0 && (
                    <div className="mb-0.5" style={{ whiteSpace: 'pre-line', lineHeight: '1.3', textAlign: 'justify' }}>
                      {getNonReturnedDecisions()}
                    </div>
                  )}

                  <p className="mb-0.5" style={{ textAlign: 'justify', lineHeight: '1.3' }}>
                    عليه نأمل من سعادتكم التكرم بالاطلاع وتوجيه من يلزم بإعادة {getReturnRequestText()} إلى مصدرها .
                  </p>

                  <p className="mb-1 text-center font-bold">وتقبلوا خالص تحياتي ...</p>
                </>
              ) : (
                // خطاب الفسح/الحجر
                <>
                  <p className="mb-0.5" style={{ textAlign: 'justify', lineHeight: '1.3' }}>
                    تم انهاء الإجراءات الصحية البيطرية للباخرة ({selectedShipment.transport_method}) والقادمة من ({selectedShipment.origin_country}) بتاريخ ({relatedLabProcedure?.external_procedure_date || 'غير محدد'}) وعليها {getTotalAnimalsText()} وبعد الكشف الإكلينيكي والفحص المخبري تقرر التالي :
                  </p>

                  <div className="mb-0.5" style={{ whiteSpace: 'pre-line', lineHeight: '1.3', textAlign: 'justify' }}>
                    {getAnimalDecisions()}
                  </div>

                  <p className="mb-1 text-center font-bold">وتقبلوا خالص تحياتي ...</p>
                </>
              )}

              <div className="flex justify-end mt-2" style={{ textAlign: 'justify' }}>
                <div className="text-center">
                  <p className="font-bold mb-0.5">مدير الحجر الحيواني والنباتي بميناء جدة الإسلامي</p>
                  <div className="my-6"></div>
                  <p className="font-bold">م.حسين بن محمد البكماني</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ViewModal = () => {
    if (!showViewModal || !selectedShipment) return null;

    const totalAnimals = selectedShipment.animals?.reduce((sum, animal) => sum + parseInt(animal.animal_count || '0'), 0) || 0;
    const totalDeaths = selectedShipment.animals?.reduce((sum, animal) => sum + parseInt(animal.death_count || '0'), 0) || 0;

    const relatedLabProcedure = labProcedures.find((proc: any) =>
      proc.external_procedure_number === selectedShipment.procedure_number
    );
    const labProcedureNumber = relatedLabProcedure?.internal_procedure_number || selectedShipment.procedure_number;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 print-modal-content">
            <div className="flex items-center justify-between mb-6 pb-4 print-header no-print">
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 no-print"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-1" style={{ color: '#003361' }}>قسم المحجر بميناء جدة الإسلامي</h1>
                <h2 className="text-lg font-semibold" style={{ color: '#00a651' }}>إرسالية حيوانية</h2>
              </div>
              <button
                onClick={handlePrintShipment}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#003361]/5 p-4 rounded-lg no-break">
                <h3 className="font-bold text-[#003361] mb-3 text-right">معلومات أساسية</h3>
                <div className="space-y-2 text-right">
                  <div><span className="font-semibold">رقم الإجراء البيطري:</span> {selectedShipment.procedure_number || 'غير محدد'}</div>
                  {selectedShipment.procedure_date && (
                    <div><span className="font-semibold">التاريخ:</span> {selectedShipment.procedure_date}</div>
                  )}
                  <div><span className="font-semibold">طريقة النقل:</span> {selectedShipment.transport_method}</div>
                  <div><span className="font-semibold">بلد المنشأ:</span> {selectedShipment.origin_country}</div>
                  <div><span className="font-semibold">اسم المستورد:</span> {selectedShipment.importer_name}</div>
                  <div><span className="font-semibold">وقت الوصول:</span> {selectedShipment.arrival_time}</div>
                </div>
              </div>

              <div className="bg-[#00a651]/5 p-4 rounded-lg no-break">
                <h3 className="font-bold text-[#00a651] mb-3 text-right">إحصائيات</h3>
                <div className="space-y-2 text-right">
                  <div><span className="font-semibold">إجمالي عدد الحيوانات:</span> <span className="text-[#00a651] font-bold">{totalAnimals}</span></div>
                  <div><span className="font-semibold">إجمالي عدد النافق:</span> <span className="text-red-600 font-bold">{totalDeaths}</span></div>
                  <div><span className="font-semibold">عدد الأطباء:</span> <span className="text-[#003361] font-bold">{selectedShipment.doctors?.length || 0}</span></div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-base">الحيوانات</h3>
              <div className="space-y-2">
                {selectedShipment.animals?.map((animal: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200 no-break">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-right text-sm">
                      <div>
                        <span className="text-gray-500 font-medium">نوع الحيوان:</span>
                        <div className="text-gray-900 font-semibold">{animal.animal_type}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">جنس الحيوان:</span>
                        <div className="text-gray-900">{animal.animal_gender}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">عدد الحيوانات:</span>
                        <div className="text-[#00a651] font-bold">{animal.animal_count}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">عدد النافق:</span>
                        <div className="text-red-600 font-bold">{animal.death_count}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">القرار:</span>
                        <div className={`font-bold ${
                          animal.final_decision === 'فسح' ? 'text-green-600' :
                          animal.final_decision === 'حجر' ? 'text-yellow-600' :
                          animal.final_decision === 'إرجاع' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {animal.final_decision === 'حجر' && animal.quarantine_location
                            ? `حجر في ${animal.quarantine_location}`
                            : animal.final_decision === 'إرجاع' && animal.return_reason
                            ? `إرجاع - ${animal.return_reason}${animal.return_category ? ` - الفئة: ${animal.return_category}` : ''}`
                            : (animal.final_decision || 'غير محدد')
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-base">تقرير الكشف الظاهري للإرسالية</h3>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-right">
                    <span className="font-semibold">درجة الحرارة / الأغشية المخاطية: </span>
                    <span className={selectedShipment.temperature_status === 'طبيعية' ? 'text-green-600' : 'text-red-600'}>
                      {selectedShipment.temperature_status}
                    </span>
                    {selectedShipment.temperature_details && (
                      <p className="text-gray-700 mt-2">{selectedShipment.temperature_details}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-right">
                    <span className="font-semibold">أعراض مرضية "تنفسية - هضمية - بولية - تناسلية - عضلية - غدد لمفاوية": </span>
                    <span className={selectedShipment.disease_symptoms === 'لا يوجد' ? 'text-green-600' : 'text-red-600'}>
                      {selectedShipment.disease_symptoms}
                    </span>
                    {selectedShipment.disease_symptoms_details && (
                      <p className="text-gray-700 mt-2">{selectedShipment.disease_symptoms_details}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-right">
                    <span className="font-semibold">أعراض ظاهرية بالهيكل العظمي والمفاصل: </span>
                    <span className={selectedShipment.skeleton_symptoms === 'لا يوجد' ? 'text-green-600' : 'text-red-600'}>
                      {selectedShipment.skeleton_symptoms}
                    </span>
                    {selectedShipment.skeleton_symptoms_details && (
                      <p className="text-gray-700 mt-2">{selectedShipment.skeleton_symptoms_details}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-right">
                    <span className="font-semibold">أعراض مرضية على الجلد والحوافر: </span>
                    <span className={selectedShipment.skin_symptoms === 'لا يوجد' ? 'text-green-600' : 'text-red-600'}>
                      {selectedShipment.skin_symptoms}
                    </span>
                    {selectedShipment.skin_symptoms_details && (
                      <p className="text-gray-700 mt-2">{selectedShipment.skin_symptoms_details}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-right">
                    <span className="font-semibold">الصفة التشريحية "إن وجدت": </span>
                    <span className={selectedShipment.anatomical_features === 'لا يوجد' ? 'text-green-600' : 'text-red-600'}>
                      {selectedShipment.anatomical_features}
                    </span>
                    {selectedShipment.anatomical_features_details && (
                      <p className="text-gray-700 mt-2">{selectedShipment.anatomical_features_details}</p>
                    )}
                  </div>
                </div>

                {selectedShipment.general_diagnosis && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-right">
                      <span className="font-semibold">التشخيص العام حسب الكشف الظاهري:</span>
                      <p className="text-gray-700 mt-1">{selectedShipment.general_diagnosis}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 no-break">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-base">التقارير المخبرية</h3>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-right">
                  <p className="text-gray-700 font-semibold">
                    تم إصدار تقرير قسم المختبر لهذا الإجراء برقم ({labProcedureNumber})
                  </p>
                </div>
              </div>
            </div>

            {selectedShipment.final_action && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 text-right text-base">الإجراء النهائي</h3>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="text-right">
                    <p className="text-gray-700 font-semibold mb-2">بناءً على نتيجة الكشف الظاهري ونتيجة قسم المختبرات</p>
                    <p className="text-gray-900 mt-2">{selectedShipment.final_action}</p>
                    {selectedShipment.final_decision && (
                      <div className="mt-4 pt-3 border-t border-red-300">
                        <p className="text-gray-700 font-semibold mb-2">القرار النهائي:</p>
                        <div className={`inline-block px-4 py-2 rounded-lg font-bold text-lg ${
                          selectedShipment.final_decision === 'تفسح' ? 'bg-green-500 text-white' :
                          selectedShipment.final_decision === 'تحجر' ? 'bg-yellow-500 text-white' :
                          selectedShipment.final_decision === 'إرجاع' ? 'bg-red-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {selectedShipment.final_decision}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedShipment.doctors && selectedShipment.doctors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 text-right text-base">الأطباء</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {selectedShipment.doctors.map((doctor: string, index: number) => (
                      <span key={index} className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200">
                        {doctor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedShipment.attachments && selectedShipment.attachments.length > 0 && (
              <div className="mb-6 no-print">
                <h3 className="font-bold text-gray-900 mb-3 text-right text-base">المرفقات</h3>
                <div className="space-y-2">
                  {selectedShipment.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-red-600" />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.type === 'scanner' ? 'مسح ضوئي' : 'ملف مرفوع'} • {new Date(attachment.uploadedAt).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const electronAPI = (window as any).electronAPI;
                            const isElectron = !!electronAPI;

                            if (isElectron && electronAPI.createTempPdfFile && electronAPI.openPdfExternal) {
                              try {
                                console.log('[VetShipmentRecords] 📂 فتح PDF مباشرة في التطبيق الخارجي');
                                const filePath = await electronAPI.createTempPdfFile(
                                  attachment.data,
                                  attachment.name
                                );
                                await electronAPI.openPdfExternal(filePath);
                                toast.success('تم فتح الملف في قارئ PDF');

                                setTimeout(() => {
                                  if (electronAPI.deleteTempPdfFile) {
                                    electronAPI.deleteTempPdfFile(filePath).catch((err: any) => {
                                      console.warn('[VetShipmentRecords] ⚠️  فشل حذف الملف المؤقت:', err);
                                    });
                                  }
                                }, 5000);
                              } catch (error) {
                                console.error('[VetShipmentRecords] ❌ فشل فتح الملف:', error);
                                toast.error('فشل فتح الملف');
                              }
                            } else {
                              setPreviewAttachment(attachment);
                              setShowAttachmentPreview(true);
                            }
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="معاينة المرفق"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const link = document.createElement('a');
                              link.href = attachment.data;
                              link.download = attachment.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success('تم تحميل الملف بنجاح');
                            } catch (error) {
                              console.error('[VetShipmentRecords] ❌ فشل تحميل الملف:', error);
                              toast.error('فشل تحميل الملف');
                            }
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="تحميل المرفق"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t-2 border-gray-200 print-footer">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-900 font-semibold mb-2 text-sm">
                  هذا الإجراء تم إنشاءه لاستخدامات القسم البيطري بميناء جدة الإسلامي
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
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003361] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Ship}
            title="سجل الإرساليات"
            subtitle="إدارة ومتابعة الإرساليات الحيوانية"
          />

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInputWithPaste
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="ابحث برقم الإجراء، اسم المستورد، أو بلد المنشأ..."
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ship className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد إرساليات</h3>
              <p className="text-gray-500">لم يتم العثور على أي إرساليات مطابقة للبحث</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">القرار النهائي</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">إجمالي الحيوانات</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">بلد المنشأ</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">وقت الوصول</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">اسم المستورد</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">رقم الإجراء البيطري</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const totalAnimals = record.animals?.reduce((sum, animal) => sum + parseInt(animal.animal_count || '0'), 0) || 0;
                    const totalDeaths = record.animals?.reduce((sum, animal) => sum + parseInt(animal.death_count || '0'), 0) || 0;

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-gray-100 hover:bg-[#61bf69]/5 transition-colors"
                      >
                        <td className="px-3 py-4 text-center">
                          {record.final_decision ? (
                            <span className={`inline-block px-4 py-2 rounded-lg font-bold text-sm shadow-md ${
                              record.final_decision === 'تفسح' ? 'bg-green-500 text-white' :
                              record.final_decision === 'تحجر' ? 'bg-yellow-500 text-white' :
                              record.final_decision === 'إرجاع' ? 'bg-red-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {record.final_decision}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">لم يحدد</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-center">
                          <span className="text-[#003361]">{totalAnimals}</span>
                        </td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.origin_country}</td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.arrival_time}</td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.importer_name}</td>
                        <td className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-[#003361]">{record.procedure_number}</span>
                            {ratedProcedures.has(record.procedure_number) && (
                              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" title="تم التقييم" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(record.id)}
                              className="p-2 text-[#61bf69] hover:text-white hover:bg-[#61bf69] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="معاينة الإرسالية"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(record.id)}
                              className="p-2 text-orange-600 hover:text-white hover:bg-orange-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="تعديل الإرسالية"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewLetter(record.id)}
                              className="p-2 text-[#003361] hover:text-white hover:bg-[#003361] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="خطاب انزال حمولة"
                            >
                              <File className="w-4 h-4" />
                            </button>
                            {hasPermission('delete_shipment') && (
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRecords.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredRecords.length}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {showViewModal && <ViewModal />}
      {showLetterModal && <LetterModal />}
      {showEditModal && selectedShipment && (
        <VetShipmentEditModal
          shipment={selectedShipment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedShipment(null);
          }}
          onSave={handleUpdateShipment}
        />
      )}

      {showAttachmentPreview && previewAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {tempFilePath && (window as any).electronAPI?.openPdfExternal && (
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                    title="فتح في تطبيق خارجي"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>فتح خارجياً</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewAttachment.data;
                    link.download = previewAttachment.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('تم تحميل الملف بنجاح');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                  title="تحميل المرفق"
                >
                  <Download className="w-5 h-5" />
                  <span>تحميل</span>
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-800">{previewAttachment.name}</h3>
              <button
                onClick={() => {
                  setShowAttachmentPreview(false);
                  setPreviewAttachment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {tempFilePath ? (
                <div className="flex flex-col items-center justify-center h-[600px] bg-white rounded-lg">
                  <svg className="w-24 h-24 text-blue-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">معاينة PDF جاهزة</h4>
                  <p className="text-gray-600 mb-6 text-center px-8">
                    للمعاينة الكاملة، اضغط على زر "فتح خارجياً" أعلاه لفتح الملف في قارئ PDF المفضل لديك
                  </p>
                  <button
                    onClick={handleOpenExternal}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-3 text-lg font-semibold shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    فتح في قارئ PDF
                  </button>
                </div>
              ) : previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title={previewAttachment.name}
                  className="w-full h-full min-h-[600px] rounded-lg border-0 bg-white"
                  style={{ minHeight: '600px', width: '100%', height: '100%' }}
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              ) : (
                <div className="flex items-center justify-center h-[600px]">
                  <p className="text-gray-500">جاري تحميل الملف...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-3">
                هل أنت متأكد من حذف هذه الإرسالية؟
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                <p className="text-red-800 font-semibold text-sm mb-1">تحذير:</p>
                <p className="text-red-700 text-sm">
                  سيتم حذف جميع بيانات الإرسالية الحيوانية نهائياً من قاعدة البيانات.
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
    </div>
  );
}
