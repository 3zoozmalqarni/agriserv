import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Eye, X, Ship, Plus, Trash2, CreditCard as Edit, ChevronDown, Truck, FileText, Copy } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import toast from 'react-hot-toast';
import PageHeader from '../../shared/PageHeader';
import { vetDB } from '../../../lib/vetDatabase';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import Pagination from '../../shared/Pagination';

import { AnimalShipment, TraderEntry } from './quarantine/quarantine-types';
import TruckStatementModal from './quarantine/TruckStatementModal';
import SingleTruckModalWrapper from './quarantine/SingleTruckModal';

export default function VetQuarantineRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<AnimalShipment | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDataEntryModal, setShowDataEntryModal] = useState(false);
  const [shipments, setShipments] = useState<AnimalShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [showCustomReason, setShowCustomReason] = useState(false);
  const [traderEntries, setTraderEntries] = useState<TraderEntry[]>([]);
  const [showTruckStatementModal, setShowTruckStatementModal] = useState(false);
  const [selectedTraderForTruck, setSelectedTraderForTruck] = useState<TraderEntry | null>(null);
  const [showSingleTruckModal, setShowSingleTruckModal] = useState(false);
  const [selectedTraderForSingleTruck, setSelectedTraderForSingleTruck] = useState<TraderEntry | null>(null);
  const [customReasonEntry, setCustomReasonEntry] = useState<{[key: string]: boolean}>({});
  const [customReasonInputs, setCustomReasonInputs] = useState<{[key: string]: string}>({});
  const [singleTruckData, setSingleTruckData] = useState<{[key: string]: {driverName: string; plateNumber: string; departureDateTime: string; trucksCount: string; animalCount: string; animalType: string;}}>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSaveSingleTruckData = useCallback((traderId: string, data: {driverName: string; plateNumber: string; departureDateTime: string; trucksCount: string; animalCount: string; animalType: string;}) => {
    setSingleTruckData(prev => ({
      ...prev,
      [traderId]: data
    }));
  }, []);

  const reasonOptions = [
    'تحصين FMD',
    'تحصين PPR',
    'أخرى'
  ];

  const auth = useAuth();
  const { hasPermission } = auth || {};

  useEffect(() => {
    loadQuarantineShipments();

    const handleDataChanged = () => {
      loadQuarantineShipments();
    };

    window.addEventListener('procedures-data-changed', handleDataChanged);
    window.addEventListener('shipment-data-changed', handleDataChanged);
    window.addEventListener('vet-data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('procedures-data-changed', handleDataChanged);
      window.removeEventListener('shipment-data-changed', handleDataChanged);
      window.removeEventListener('vet-data-changed', handleDataChanged);
    };
  }, []);

  const loadQuarantineShipments = async () => {
    setLoading(true);
    try {
      const allShipments = await vetDB.getAnimalShipments();

      // فلترة الإرساليات التي تحتوي على حيوانات قرارها "حجر"
      const quarantineShipments = allShipments.filter(shipment =>
        shipment.animals?.some(animal => animal.final_decision === 'حجر')
      );

      setShipments(quarantineShipments || []);
    } catch (error) {
      console.error('Error loading quarantine shipments:', error);
      toast.error('حدث خطأ في تحميل سجل الحجر');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = shipments.filter(record => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      record.procedure_number.toLowerCase().includes(searchLower) ||
      record.importer_name.toLowerCase().includes(searchLower) ||
      (record.origin_country || '').toLowerCase().includes(searchLower);

    // البحث في بيانات المستوردين (رقم الإذن ورقم البيان)
    const quarantinedAnimals = record.animals?.filter(animal => animal.final_decision === 'حجر') || [];
    if (quarantinedAnimals.length > 0 && window.electronAPI?.getQuarantineTradersByShipmentId) {
      // سنبحث في البيانات المحفوظة
      // ولكن لأسباب أداء، سنبحث فقط في الحقول الأساسية
    }

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

  const handleDataEntry = async (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (shipment) {
      setSelectedShipment(shipment);
      setShowDataEntryModal(true);
      setSelectedReasons([]);
      setCustomReason('');

      // تحميل بيانات المستوردين المحفوظة من SQLite
      if (window.electronAPI?.getQuarantineTradersByShipmentId) {
        try {
          const data = await window.electronAPI.getQuarantineTradersByShipmentId(shipment.procedure_number);

          if (data && data.length > 0) {
            const loadedEntries: TraderEntry[] = data.map(trader => ({
              id: trader.id,
              importer_name: trader.importer_name,
              permit_number: trader.permit_number,
              statement_number: trader.statement_number,
              animal_count: trader.animal_count,
              animal_type: trader.animal_type,
              quarantine_location: trader.quarantine_location,
              quarantine_location_custom: trader.quarantine_location_custom || '',
              notes: trader.notes || '',
              reasons: trader.reasons || []
            }));
            setTraderEntries(loadedEntries);
          } else {
            setTraderEntries([]);
          }
        } catch (error) {
          console.error('Error loading trader data:', error);
          setTraderEntries([]);
        }
      } else {
        setTraderEntries([]);
      }
    }
  };

  const handleAddTrader = () => {
    const newEntry: TraderEntry = {
      id: crypto.randomUUID(),
      importer_name: '',
      permit_number: '',
      statement_number: '',
      animal_count: '',
      animal_type: '',
      quarantine_location: '',
      quarantine_location_custom: '',
      notes: '',
      reasons: []
    };
    setTraderEntries([...traderEntries, newEntry]);
  };

  const handleRemoveTrader = (id: string) => {
    setTraderEntries(traderEntries.filter(entry => entry.id !== id));
  };

  const handleTraderChange = (id: string, field: keyof TraderEntry, value: string | string[]) => {
    setTraderEntries(traderEntries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };

        // تنظيف الحقل المخصص عند تغيير مكان الحجر من "أخرى" إلى خيار آخر
        if (field === 'quarantine_location' && value !== 'أخرى') {
          updated.quarantine_location_custom = '';
        }

        // تعبئة مكان الحجر تلقائياً حسب نوع الحيوان
        if (field === 'animal_type' && typeof value === 'string' && selectedShipment) {
          const animal = selectedShipment.animals?.find(a => a.animal_type === value && a.final_decision === 'حجر');
          if (animal) {
            // دعم البيانات الجديدة (quarantine_locations) والقديمة (quarantine_location)
            if (animal.quarantine_locations && animal.quarantine_locations.length > 0) {
              // استخدام أول موقع من المصفوفة كقيمة افتراضية
              const firstLocation = animal.quarantine_locations[0];
              if (firstLocation === 'حجر في مزرعة المستورد') {
                updated.quarantine_location = 'مزرعة المستورد';
              } else if (firstLocation === 'حجر في الخمرة') {
                updated.quarantine_location = 'الخمرة';
              } else {
                updated.quarantine_location = 'أخرى';
                updated.quarantine_location_custom = firstLocation;
              }
            } else if (animal.quarantine_location) {
              updated.quarantine_location = animal.quarantine_location;
            }
          }
        }

        return updated;
      }
      return entry;
    }));
  };

  const handleReasonToggle = (reason: string) => {
    if (!selectedReasons.includes(reason)) {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const removeReason = (reason: string) => {
    setSelectedReasons(selectedReasons.filter(r => r !== reason));
  };

  const addCustomReason = (reason: string) => {
    if (reason && !selectedReasons.includes(reason)) {
      setSelectedReasons([...selectedReasons, reason]);
      setCustomReason('');
      setShowCustomReason(false);
    }
  };

  const handlePrintTradersList = () => {
    if (!selectedShipment) return;

    const printArea = document.querySelector('.traders-print-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    // الحصول على العناصر الأصلية قبل الاستنساخ
    const originalSelects = printArea.querySelectorAll('select');
    const originalInputs = printArea.querySelectorAll('input[type="text"]');

    // حفظ القيم من العناصر الأصلية
    const selectValues: { value: string; text: string }[] = [];
    originalSelects.forEach((select) => {
      const selectEl = select as HTMLSelectElement;
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      selectValues.push({
        value: selectEl.value,
        text: selectedOption && selectedOption.value !== '' ? selectedOption.text : ''
      });
    });

    const inputValues: string[] = [];
    originalInputs.forEach((input) => {
      const inputEl = input as HTMLInputElement;
      inputValues.push(inputEl.value || '');
    });

    const clonedContent = printArea.cloneNode(true) as HTMLElement;

    // استبدال عناصر select بالقيمة المختارة
    const clonedSelects = clonedContent.querySelectorAll('select');
    clonedSelects.forEach((select, index) => {
      if (selectValues[index]) {
        const span = document.createElement('span');
        span.textContent = selectValues[index].text;
        span.style.cssText = 'display: block; text-align: center; padding: 2px; font-size: 10px; line-height: 1.4;';
        select.parentNode?.replaceChild(span, select);
      }
    });

    // استبدال عناصر input بالقيمة المدخلة
    const clonedInputs = clonedContent.querySelectorAll('input[type="text"]');
    clonedInputs.forEach((input, index) => {
      if (inputValues[index] !== undefined) {
        const span = document.createElement('span');
        span.textContent = inputValues[index];
        span.style.cssText = 'display: block; text-align: center; padding: 2px; font-size: 10px; line-height: 1.4;';
        input.parentNode?.replaceChild(span, input);
      }
    });

    // إزالة العناصر غير المطلوبة للطباعة
    const noPrintElements = clonedContent.querySelectorAll('button, .no-print');
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
            <h1 style="color: #003361 !important; font-size: 15px; font-weight: bold; margin: 0 0 2px 0;">القسم البيطري بمحجر ميناء جدة الإسلامي</h1>
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0 0 6px 0;">أسماء المستوردين الذين تمت الموافقة لهم بتحميل المواشي</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 0; margin-top: 6px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px; min-height: 32px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">اسم المستورد:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.importer_name}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">التاريخ:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.procedure_date || selectedShipment.arrival_date || new Date().toLocaleDateString('en-GB')}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">بلد المنشأ:</span> <span style="font-weight: 600; color: #111827;">${selectedShipment.origin_country || 'غير محدد'}</span></div>
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
    printContainer.id = 'temp-print-container-traders';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-traders';
    printStyles.textContent = `
      @media print {
        @page {
          size: A4 landscape;
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

        body::after {
          content: "\u0647\u0630\u0627 \u0627\u0644\u0628\u064a\u0627\u0646 \u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0627\u062a \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0628\u064a\u0637\u0631\u064a \u0628\u0645\u062d\u062c\u0631 \u0645\u064a\u0646\u0627\u0621 \u062c\u062f\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a \u2022 \u062a\u0639\u062a\u0628\u0631 \u0647\u0630\u0647 \u0627\u0644\u0648\u062b\u064a\u0642\u0629 \u0633\u0631\u064a\u0629 \u0648\u063a\u064a\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u062f\u0627\u0648\u0644 \u0648\u064a\u0639\u0631\u0636\u0643 \u062a\u062f\u0627\u0648\u0644\u0647\u0627 \u0623\u0648 \u062a\u0635\u0648\u064a\u0631\u0647\u0627 \u0644\u0644\u0645\u0633\u0627\u0626\u0644\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u2022 \u0644\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0625\u062f\u0627\u0631\u0629 \u0645\u062d\u062c\u0631 \u0645\u064a\u0646\u0627\u0621 \u062c\u062f\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a" !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          text-align: center !important;
          font-size: 6.5px !important;
          padding: 8px 10px !important;
          background: white !important;
          border-top: 2px solid #008a40 !important;
          color: #374151 !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          z-index: 9999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body > *:not(#temp-print-container-traders) {
          display: none !important;
        }

        #temp-print-container-traders {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-traders > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-traders * {
          visibility: visible !important;
        }

        .no-print,
        button,
        svg {
          display: none !important;
        }
        input, select {
          display: none !important;
        }

        h1, h2, h3 {
          page-break-after: avoid !important;
        }

        h1 { color: #003361 !important; }
        h2 { color: #00a651 !important; }
        h3 { color: #6b7280 !important; }

        .text-gray-900 { color: #111827 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }

        .traders-print-content {
          padding: 0 !important;
          margin: 0 !important;
        }

        .traders-print-content > div {
          page-break-inside: auto !important;
          margin-bottom: 8px !important;
        }

        .traders-print-content table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: none !important;
          overflow: hidden !important;
        }

        .traders-print-content thead th {
          background: #f5f5f5 !important;
          color: #003361 !important;
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          padding: 6px 4px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          line-height: 1.3 !important;
          height: 32px !important;
          vertical-align: middle !important;
          text-align: center !important;
        }

        .traders-print-content tbody tr {
          height: 26px !important;
        }

        .traders-print-content tbody tr:nth-child(even) {
          background: linear-gradient(to right, #f8fafc 0%, #f1f5f9 100%) !important;
        }

        .traders-print-content tbody tr:nth-child(odd) {
          background: white !important;
        }

        .traders-print-content tbody td {
          border: none !important;
          border-bottom: 0.5px solid #e5e7eb !important;
          padding: 4px 2px !important;
          font-size: 10.5px !important;
          line-height: 1.3 !important;
          min-height: 20px !important;
          vertical-align: middle !important;
          text-align: center !important;
          color: #003361 !important;
        }

        .traders-print-content tbody tr:last-child td {
          border-bottom: none !important;
        }

        .traders-print-content tbody td span {
          color: #003361 !important;
          text-align: center !important;
        }

        .traders-print-content tbody td div {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 18px !important;
        }

        .traders-print-content .bg-blue-50 {
          background: rgba(0, 51, 97, 0.15) !important;
          border: 0.5px solid #003361 !important;
          border-radius: 8px !important;
          padding: 8px !important;
        }

        .traders-print-content .totals-section table {
          border: none !important;
        }

        .traders-print-content .totals-section h3 {
          font-size: 15px !important;
          font-weight: bold !important;
        }

        .traders-print-content .totals-section tbody td {
          padding: 4px 2px !important;
          text-align: center !important;
          vertical-align: middle !important;
          min-height: 20px !important;
        }

        .traders-print-content .totals-section thead th {
          padding: 8px 4px !important;
          text-align: center !important;
          vertical-align: middle !important;
        }

        .traders-print-content .traders-basic-info {
          margin-bottom: 16px !important;
        }

        .traders-print-content .traders-data-section {
          margin-bottom: 16px !important;
        }

        .traders-print-content .traders-section-title {
          margin-bottom: 16px !important;
        }

        .traders-print-content .overflow-x-auto {
          margin-bottom: 16px !important;
        }

        .traders-print-content .traders-totals-wrapper {
          margin-top: 16px !important;
        }

        .traders-print-content .traders-totals-title {
          margin-bottom: 16px !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-traders');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-traders');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-traders');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  const handleSaveDataEntry = async () => {
    if (traderEntries.length === 0) {
      toast.error('يجب إضافة تاجر واحد على الأقل');
      return;
    }

    // التحقق من أن جميع الحقول المطلوبة تم ملؤها
    const hasEmptyFields = traderEntries.some(entry => {
      if (!entry.importer_name?.trim() || !entry.permit_number?.trim() || !entry.statement_number?.trim() ||
          !entry.animal_count?.trim() || !entry.animal_type?.trim() || !entry.quarantine_location?.trim()) {
        return true;
      }

      // التحقق من أن مكان الحجر المخصص تم ملؤه عند اختيار "أخرى"
      if (entry.quarantine_location === 'أخرى' && !entry.quarantine_location_custom?.trim()) {
        return true;
      }

      return false;
    });

    if (hasEmptyFields) {
      toast.error('يجب تعبئة جميع الحقول المطلوبة');
      return;
    }

    if (!selectedShipment) {
      toast.error('لم يتم تحديد الإجراء');
      return;
    }

    if (!window.electronAPI?.saveQuarantineTraders) {
      toast.error('غير متاح في المتصفح');
      return;
    }

    try {
      // حفظ البيانات في SQLite
      await window.electronAPI.saveQuarantineTraders(
        selectedShipment.procedure_number,
        traderEntries
      );

      // عرض رسالة نجاح بدون إغلاق النافذة
      toast.success('تم حفظ البيانات بنجاح');
    } catch (error) {
      console.error('Error saving trader data:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const ViewModal = () => {
    if (!showViewModal || !selectedShipment) return null;

    // الحصول على الحيوانات المحجورة فقط
    const quarantinedAnimals = selectedShipment.animals?.filter(animal => animal.final_decision === 'حجر') || [];
    const totalQuarantineAnimals = quarantinedAnimals.reduce((sum, animal) => sum + parseInt(animal.animal_count || '0'), 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-1" style={{ color: '#003361' }}>تفاصيل الإجراء المحجور</h1>
                <h2 className="text-lg font-semibold" style={{ color: '#f18700' }}>سجل الحجر البيطري</h2>
              </div>
              <div className="w-10"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#003361]/5 p-4 rounded-lg">
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

              <div className="bg-[#f18700]/5 p-4 rounded-lg border-2 border-[#f18700]/30">
                <h3 className="font-bold text-[#f18700] mb-3 text-right">إحصائيات الحجر</h3>
                <div className="space-y-2 text-right">
                  <div><span className="font-semibold">عدد الحيوانات المحجورة:</span> <span className="text-[#f18700] font-bold">{totalQuarantineAnimals}</span></div>
                  <div><span className="font-semibold">عدد أنواع الحيوانات:</span> <span className="text-[#f18700] font-bold">{quarantinedAnimals.length}</span></div>
                  <div><span className="font-semibold">عدد الأطباء:</span> <span className="text-[#003361] font-bold">{selectedShipment.doctors?.length || 0}</span></div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-base">الحيوانات المحجورة</h3>
              <div className="space-y-2">
                {quarantinedAnimals.map((animal: any, index: number) => {
                  // دعم البيانات الجديدة (quarantine_locations) والقديمة (quarantine_location)
                  let locations: string[] = [];
                  if (animal.quarantine_locations && animal.quarantine_locations.length > 0) {
                    locations = animal.quarantine_locations;
                  } else if (animal.quarantine_location) {
                    // التوافق مع البيانات القديمة
                    locations = [animal.quarantine_location];
                  }
                  const locationDisplay = locations.length > 0
                    ? locations.map(loc => {
                        if (loc === 'حجر في الخمرة' && animal.quarantine_traders && animal.quarantine_traders.length > 0) {
                          return `${loc} (المستوردين: ${animal.quarantine_traders.join(', ')})`;
                        }
                        return loc;
                      }).join(' و ')
                    : 'غير محدد';

                  return (
                    <div key={index} className="bg-yellow-50 rounded-lg p-3 border-2 border-yellow-300">
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
                          <div className="text-[#f18700] font-bold">{animal.animal_count}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">عدد النافق:</span>
                          <div className="text-red-600 font-bold">{animal.death_count}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">مكان الحجر:</span>
                          <div className="text-yellow-700 font-bold">
                            {locationDisplay}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-right text-base">تقرير الكشف الظاهري</h3>
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

            <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <div className="bg-yellow-50 rounded-lg p-4 text-center border-2 border-yellow-300">
                <p className="text-gray-900 font-semibold mb-2 text-sm">
                  هذا السجل خاص بالحيوانات المحجورة في ميناء جدة الإسلامي
                </p>
                <p className="text-yellow-700 font-medium mb-2 text-xs">
                  تعتبر هذه الوثيقة سرية وغير قابلة للتداول
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
          <p className="text-gray-600">جاري تحميل سجل الحجر...</p>
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
            title="سجل الحجر البيطري"
            subtitle="إدارة ومتابعة الحيوانات المحجورة"
          />

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInputWithPaste
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="ابحث برقم الإجراء، اسم المستورد، بلد المنشأ، رقم الإذن، أو رقم البيان..."
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ship className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد إرساليات محجورة</h3>
              <p className="text-gray-500">لم يتم العثور على أي إرساليات تحتوي على حيوانات محجورة</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">عدد الحيوانات المحجورة</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">أنواع الحيوانات</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">بلد المنشأ</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">التاريخ</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">اسم المستورد</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">رقم الإجراء البيطري</th>
                    <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const quarantinedAnimals = record.animals?.filter(animal => animal.final_decision === 'حجر') || [];
                    const totalQuarantineAnimals = quarantinedAnimals.reduce((sum, animal) => sum + parseInt(animal.animal_count || '0'), 0);
                    const animalTypes = quarantinedAnimals.map(a => a.animal_type).join(' - ');

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-gray-100 hover:bg-[#61bf69]/5 transition-colors"
                      >
                        <td className="px-3 py-4 text-center">
                          <span className="text-[#61bf69] font-bold">{totalQuarantineAnimals}</span>
                        </td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">({animalTypes})</td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.origin_country}</td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.procedure_date || record.arrival_date || 'غير محدد'}</td>
                        <td className="px-3 py-4 text-center text-sm text-gray-700">{record.importer_name}</td>
                        <td className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(record.procedure_number);
                                toast.success('تم نسخ رقم الإجراء');
                              }}
                              className="p-1.5 text-[#003361] hover:text-white hover:bg-[#003361] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="نسخ رقم الإجراء"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-[#003361]">{record.procedure_number}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDataEntry(record.id)}
                              className="p-2 text-orange-600 hover:text-white hover:bg-orange-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="إدخال بيانات"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleView(record.id)}
                              className="p-2 text-[#61bf69] hover:text-white hover:bg-[#61bf69] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="معاينة التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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

      {showDataEntryModal && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 traders-print-content">
              <div className="flex items-center justify-between mb-6 pb-4 border-b no-print">
                <button
                  onClick={() => setShowDataEntryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-center" style={{ color: '#003361' }}>
                  أسماء المستوردين الذين تمت الموافقة لهم بتحميل المواشي
                </h1>
                <div className="w-10"></div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 traders-basic-info">
                <h3 className="font-bold text-[#003361] mb-2 text-center text-sm">البيانات الأساسية</h3>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div>
                    <span className="text-gray-600 block">رقم الإجراء:</span>
                    <span className="font-bold text-gray-900">{selectedShipment.procedure_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">التاريخ:</span>
                    <span className="font-bold text-gray-900">{selectedShipment.procedure_date || selectedShipment.arrival_date || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">اسم الباخرة:</span>
                    <span className="font-bold text-gray-900">{selectedShipment.transport_method}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">بلد المنشأ:</span>
                    <span className="font-bold text-gray-900">{selectedShipment.origin_country}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">نوع الحيوان:</span>
                    <span className="font-bold text-gray-900">
                      {selectedShipment.animals
                        ?.filter(a => a.final_decision === 'حجر')
                        .map(a => a.animal_type)
                        .join(' - ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="traders-data-section mt-4">
                <h3 className="font-bold text-gray-900 text-center text-lg traders-section-title mb-2">بيانات المستوردين</h3>
                <div className="flex justify-start mb-2">
                  <button
                    onClick={handleAddTrader}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>إضافة مستورد</span>
                  </button>
                </div>

                {traderEntries.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">لم يتم إضافة أي مستوردين بعد</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse table-fixed">
                      <thead>
                        <tr className="bg-[#003361]/10 border-b-2 border-[#003361]/20">
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-24 no-print">إجراءات</th>
                          <th className="px-2 py-3 text-center font-bold text-[#003361] text-xs w-48">اسم المستورد</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-20">رقم الإذن</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-20">رقم البيان</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-24">عدد الحيوانات</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-28">نوع الحيوان</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-28">مكان الحجر</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-32">السبب</th>
                          <th className="px-1 py-3 text-center font-bold text-[#003361] text-xs w-32">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traderEntries.map((entry) => (
                          <React.Fragment key={entry.id}>
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-1 py-2 no-print">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedTraderForTruck(entry);
                                    setShowTruckStatementModal(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="بيان شاحنات متجهة إلى محجر الخمرة"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTraderForSingleTruck(entry);
                                    setShowSingleTruckModal(true);
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="بيان شاحنة متجهة إلى محجر الخمرة"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveTrader(entry.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={entry.importer_name}
                                onChange={(e) => handleTraderChange(entry.id, 'importer_name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                              >
                                <option value="">اختر المستورد</option>
                                {(() => {
                                  const uniqueImporters = new Set<string>();
                                  selectedShipment.animals
                                    ?.filter(animal =>
                                      animal.final_decision === 'حجر' &&
                                      animal.quarantine_locations?.includes('حجر في الخمرة') &&
                                      animal.quarantine_traders?.length > 0
                                    )
                                    .forEach(animal => {
                                      animal.quarantine_traders?.forEach(trader => {
                                        uniqueImporters.add(trader);
                                      });
                                    });
                                  return Array.from(uniqueImporters).map((importerName, idx) => (
                                    <option key={idx} value={importerName}>
                                      {importerName}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="text"
                                value={entry.permit_number}
                                onChange={(e) => handleTraderChange(entry.id, 'permit_number', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                placeholder="رقم الإذن"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="text"
                                value={entry.statement_number}
                                onChange={(e) => handleTraderChange(entry.id, 'statement_number', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                placeholder="رقم البيان"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="text"
                                value={entry.animal_count}
                                onChange={(e) => handleTraderChange(entry.id, 'animal_count', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                placeholder="عدد الحيوانات"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <select
                                value={entry.animal_type}
                                onChange={(e) => handleTraderChange(entry.id, 'animal_type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                              >
                                <option value="">اختر النوع</option>
                                {selectedShipment.animals
                                  ?.filter(a => a.final_decision === 'حجر')
                                  .map((animal, idx) => (
                                    <option key={idx} value={animal.animal_type}>
                                      {animal.animal_type}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-1 py-2">
                              {entry.quarantine_location === 'أخرى' ? (
                                <input
                                  type="text"
                                  value={entry.quarantine_location_custom || ''}
                                  onChange={(e) => handleTraderChange(entry.id, 'quarantine_location_custom', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                  placeholder="اكتب مكان الحجر..."
                                  autoFocus
                                  onBlur={(e) => {
                                    if (!e.target.value.trim()) {
                                      handleTraderChange(entry.id, 'quarantine_location', '');
                                    }
                                  }}
                                />
                              ) : (
                                <select
                                  value={entry.quarantine_location}
                                  onChange={(e) => handleTraderChange(entry.id, 'quarantine_location', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                >
                                  <option value="">اختر المكان</option>
                                  <option value="مزرعة المستورد">مزرعة المستورد</option>
                                  <option value="الخمرة">الخمرة</option>
                                  <option value="أخرى">أخرى</option>
                                </select>
                              )}
                            </td>
                              <td className="px-1 py-2">
                                {!customReasonEntry[entry.id] ? (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value === 'أخرى') {
                                        setCustomReasonEntry({ ...customReasonEntry, [entry.id]: true });
                                      } else if (e.target.value) {
                                        const currentReasons = entry.reasons || [];
                                        if (!currentReasons.includes(e.target.value)) {
                                          handleTraderChange(entry.id, 'reasons', [...currentReasons, e.target.value]);
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                  >
                                    <option value="">اختر سبب...</option>
                                    {reasonOptions.filter(r => !entry.reasons?.includes(r)).map((reason) => (
                                      <option key={reason} value={reason}>
                                        {reason}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex gap-0.5 items-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const inputValue = customReasonInputs[entry.id] || '';
                                        if (inputValue.trim()) {
                                          const currentReasons = entry.reasons || [];
                                          handleTraderChange(entry.id, 'reasons', [...currentReasons, inputValue.trim()]);
                                          setCustomReasonInputs({ ...customReasonInputs, [entry.id]: '' });
                                          setCustomReasonEntry({ ...customReasonEntry, [entry.id]: false });
                                        }
                                      }}
                                      className="bg-green-600 text-white px-1.5 py-1 rounded hover:bg-green-700 transition-colors text-[10px] flex-shrink-0"
                                    >
                                      +
                                    </button>
                                    <input
                                      type="text"
                                      value={customReasonInputs[entry.id] || ''}
                                      onChange={(e) => setCustomReasonInputs({ ...customReasonInputs, [entry.id]: e.target.value })}
                                      className="w-20 px-1 py-1 border border-gray-300 rounded text-right text-[10px]"
                                      placeholder="اكتب..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomReasonEntry({ ...customReasonEntry, [entry.id]: false });
                                        setCustomReasonInputs({ ...customReasonInputs, [entry.id]: '' });
                                      }}
                                      className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            <td className="px-1 py-2">
                              <input
                                type="text"
                                value={entry.notes || ''}
                                onChange={(e) => handleTraderChange(entry.id, 'notes', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                placeholder="ملاحظات..."
                              />
                            </td>
                            </tr>
                            {entry.reasons && entry.reasons.length > 0 && (
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <td className="no-print"></td>
                                <td colSpan={8} className="px-2 py-1">
                                  <div className="flex flex-wrap gap-1 justify-end items-center">
                                    <span className="text-[10px] text-gray-600 font-semibold ml-2">الأسباب:</span>
                                    {entry.reasons.map((reason, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newReasons = entry.reasons?.filter((r, i) => i !== idx) || [];
                                            handleTraderChange(entry.id, 'reasons', newReasons);
                                          }}
                                          className="text-gray-400 hover:text-red-600 transition-colors no-print"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {traderEntries.length > 0 && (
                <div className="traders-totals-wrapper mt-8">
                  <h3 className="font-bold text-gray-900 text-center traders-totals-title mb-6">الإجمالي</h3>
                  <div className="totals-section mb-8">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-green-300">
                          <th className="px-3 py-2 text-center font-bold text-gray-700 text-sm">نوع الحيوان</th>
                          <th className="px-3 py-2 text-center font-bold text-gray-700 text-sm">إجمالي العدد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(
                          traderEntries.reduce((acc, entry) => {
                            if (entry.animal_type) {
                              const current = acc.get(entry.animal_type) || 0;
                              acc.set(entry.animal_type, current + parseInt(entry.animal_count || '0'));
                            }
                            return acc;
                          }, new Map<string, number>())
                        ).map(([animalType, total]) => (
                          <tr key={animalType} className="border-b border-green-200">
                            <td className="px-3 py-2 text-center font-semibold">{animalType}</td>
                            <td className="px-3 py-2 text-center font-bold text-green-700">{total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end no-print">
                <button
                  onClick={handlePrintTradersList}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  طباعة البيان
                </button>
                <button
                  onClick={() => setShowDataEntryModal(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveDataEntry}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  حفظ البيانات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTruckStatementModal && selectedTraderForTruck && selectedShipment && (
        <TruckStatementModal
          trader={selectedTraderForTruck}
          shipment={selectedShipment}
          onClose={() => {
            setShowTruckStatementModal(false);
            setSelectedTraderForTruck(null);
          }}
        />
      )}

      {showSingleTruckModal && selectedTraderForSingleTruck && selectedShipment && (
        <SingleTruckModalWrapper
          trader={selectedTraderForSingleTruck}
          shipment={selectedShipment}
          savedData={singleTruckData[selectedTraderForSingleTruck.id]}
          onClose={() => {
            setShowSingleTruckModal(false);
            setSelectedTraderForSingleTruck(null);
          }}
          onSaveData={handleSaveSingleTruckData}
        />
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
                تم حفظ بيانات المستوردين بنجاح
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

