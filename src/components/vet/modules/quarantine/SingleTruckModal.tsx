import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimalShipment, TraderEntry, SingleTruckData } from './quarantine-types';

interface SingleTruckModalWrapperProps {
  trader: TraderEntry;
  shipment: AnimalShipment;
  onClose: () => void;
  savedData?: SingleTruckData;
  onSaveData: (traderId: string, data: SingleTruckData) => void;
}

function SingleTruckModalWrapper({ trader, shipment, onClose, savedData, onSaveData }: SingleTruckModalWrapperProps) {
  const handleSaveData = useCallback((data: {driverName: string; plateNumber: string; departureDateTime: string; trucksCount: string; animalCount: string; animalType: string;}) => {
    onSaveData(trader.id, data);
  }, [trader.id, onSaveData]);

  return (
    <SingleTruckStatementModal
      trader={trader}
      shipment={shipment}
      onClose={onClose}
      savedData={savedData}
      onSaveData={handleSaveData}
    />
  );
}

interface SingleTruckStatementModalProps {
  trader: TraderEntry;
  shipment: AnimalShipment;
  onClose: () => void;
  savedData?: {driverName: string; plateNumber: string; departureDateTime: string; trucksCount: string; animalCount: string; animalType: string;};
  onSaveData: (data: {driverName: string; plateNumber: string; departureDateTime: string; trucksCount: string; animalCount: string; animalType: string;}) => void;
}

function SingleTruckStatementModal({ trader, shipment, onClose, savedData, onSaveData }: SingleTruckStatementModalProps) {
  const [driverName, setDriverName] = useState(savedData?.driverName || '');
  const [plateNumber, setPlateNumber] = useState(savedData?.plateNumber || '');
  const [departureDateTime, setDepartureDateTime] = useState(savedData?.departureDateTime || '');
  const [trucksCount, setTrucksCount] = useState(savedData?.trucksCount || '');
  const [animalCount, setAnimalCount] = useState(savedData?.animalCount || trader.animal_count || '');
  const [animalType, setAnimalType] = useState(savedData?.animalType || trader.animal_type || '');

  useEffect(() => {
    if (!savedData) {
      setAnimalCount(trader.animal_count || '');
      setAnimalType(trader.animal_type || '');
    }
  }, [trader.animal_count, trader.animal_type, savedData]);

  useEffect(() => {
    onSaveData({
      driverName,
      plateNumber,
      departureDateTime,
      trucksCount,
      animalCount,
      animalType
    });
  }, [driverName, plateNumber, departureDateTime, trucksCount, animalCount, animalType]);

  const handlePrintSingleTruck = () => {
    const printArea = document.querySelector('.single-truck-print-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    const originalInputs = printArea.querySelectorAll('input[type="text"], input[type="number"]');
    const inputValues: string[] = [];
    originalInputs.forEach((input) => {
      const inputEl = input as HTMLInputElement;
      inputValues.push(inputEl.value || '');
    });

    const clonedContent = printArea.cloneNode(true) as HTMLElement;

    const clonedInputs = clonedContent.querySelectorAll('input[type="text"], input[type="number"]');
    clonedInputs.forEach((input, index) => {
      if (inputValues[index] !== undefined) {
        const span = document.createElement('span');
        span.textContent = inputValues[index];
        span.style.cssText = 'display: block; text-align: center; padding: 8px; font-size: 11px; line-height: 1.3; color: #111827; font-weight: 600;';
        input.parentNode?.replaceChild(span, input);
      }
    });

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
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">بيان شاحنة متجهة إلى محجر الخمرة</h2>
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 0; margin-top: 4px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">رقم الإجراء:</span> <span style="font-weight: 600; color: #111827;">${shipment.procedure_number || 'غير محدد'}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">اسم المستورد:</span> <span style="font-weight: 600; color: #111827;">${trader.importer_name}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">التاريخ:</span> <span style="font-weight: 600; color: #111827;">${shipment.procedure_date || shipment.arrival_date || new Date().toLocaleDateString('en-GB')}</span></div>
              <div style="font-size: 7px; display: flex; align-items: center; gap: 3px;"><span style="font-weight: 700; color: #6b7280;">بلد المنشأ:</span> <span style="font-weight: 600; color: #111827;">${shipment.origin_country || 'غير محدد'}</span></div>
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
    printContainer.id = 'temp-print-container-single';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-single';
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

        body::after {
          content: "هذا البيان تم إنشاءه لاستخدامات القسم البيطري بمحجر ميناء جدة الإسلامي • تعتبر هذه الوثيقة سرية وغير قابلة للتداول ويعرضك تداولها أو تصويرها للمسائلة القانونية • للملاحظات والاستفسارات التواصل مع إدارة محجر ميناء جدة الإسلامي" !important;
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

        body > *:not(#temp-print-container-single) {
          display: none !important;
        }

        #temp-print-container-single {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-single > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-single * {
          visibility: visible !important;
        }

        .no-print,
        button,
        svg {
          display: none !important;
        }
        input {
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

        .single-truck-print-content {
          padding: 0 !important;
          margin: 0 !important;
        }

        .single-truck-print-content > div {
          page-break-inside: auto !important;
        }

        .single-truck-print-content .bg-blue-50 {
          background: rgba(0, 51, 97, 0.15) !important;
          border: 0.5px solid #003361 !important;
          border-radius: 8px !important;
          padding: 12px !important;
          margin-bottom: 10px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          min-height: 70px !important;
        }

        .single-truck-print-content .bg-blue-50 h3 {
          margin: 0 0 10px 0 !important;
          padding: 0 !important;
          font-size: 11px !important;
        }

        .single-truck-print-content .bg-blue-50 .grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 12px !important;
          align-items: start !important;
          justify-content: center !important;
          margin: 0 !important;
        }

        .single-truck-print-content .bg-blue-50 .grid > div {
          padding: 4px 0 !important;
        }

        .single-truck-print-content .bg-blue-50 .grid span.block {
          display: block !important;
          margin-bottom: 3px !important;
          font-size: 8px !important;
        }

        .single-truck-print-content .bg-blue-50 .grid span.font-bold {
          font-size: 9px !important;
          line-height: 1.3 !important;
        }

        .single-truck-print-content .single-truck-data-section {
          margin-top: 8px !important;
        }

        .single-truck-print-content .single-truck-data-section h3 {
          background: #f5f5f5 !important;
          border: 0.5px solid #d1d5db !important;
          border-radius: 8px !important;
          padding: 10px !important;
          margin: 0 0 8px 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
        }

        .single-truck-print-content .single-truck-data-section .p-6 {
          padding: 0 !important;
          margin-top: 12px !important;
        }

        .single-truck-print-content table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: none !important;
          overflow: hidden !important;
        }

        .single-truck-print-content tbody tr {
          height: 50px !important;
          min-height: 50px !important;
          max-height: 50px !important;
        }

        .single-truck-print-content tbody td {
          background: white !important;
          border: none !important;
          border-bottom: 0.5px solid #e5e7eb !important;
          padding: 0 8px !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          text-align: center !important;
          vertical-align: middle !important;
          height: 50px !important;
          display: table-cell !important;
        }

        .single-truck-print-content tbody td:first-child {
          background: #f5f5f5 !important;
          color: #003361 !important;
          font-weight: bold !important;
          width: 35% !important;
        }

        .single-truck-print-content tbody td:last-child {
          color: #111827 !important;
          font-weight: 600 !important;
        }

        .single-truck-print-content tbody td span {
          display: inline-block !important;
          vertical-align: middle !important;
          text-align: center !important;
          width: 100% !important;
        }

        .single-truck-print-content tbody tr:first-child td {
          border-top: none !important;
        }

        .single-truck-print-content tbody tr:last-child td {
          border-bottom: none !important;
        }

        .single-truck-print-content .mt-12 {
          margin-top: 48px !important;
          page-break-inside: avoid !important;
        }

        .single-truck-print-content .mt-12 .text-right {
          text-align: right !important;
          display: block !important;
        }

        .single-truck-print-content .mt-12 p {
          font-size: 13px !important;
          font-weight: bold !important;
          color: #003361 !important;
          margin-bottom: 4px !important;
          text-align: right !important;
        }

        .single-truck-print-content .mt-12 .h-20 {
          height: 80px !important;
          width: 256px !important;
          margin-right: 0 !important;
          margin-left: auto !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-single');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-single');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-single');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#003361] to-[#004280] p-6 flex justify-between items-center no-print">
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-white">بيان شاحنة متجهة إلى محجر الخمرة</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 single-truck-print-content">
          <div className="text-center mb-4 no-print">
            <h2 className="text-xl font-bold text-[#003361]">بيان شاحنة متجهة إلى محجر الخمرة</h2>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
            <h3 className="text-sm font-bold text-[#003361] mb-3 text-center">البيانات الأساسية</h3>
            <div className="grid grid-cols-4 gap-4 text-xs text-center">
              <div className="py-2">
                <span className="text-gray-600 block mb-1">اسم الباخرة:</span>
                <span className="font-bold text-gray-900">{shipment.transport_method || 'غير محدد'}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">رقم الإجراء:</span>
                <span className="font-bold text-gray-900">{shipment.procedure_number}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">وقت الوصول:</span>
                <span className="font-bold text-gray-900">{shipment.arrival_time}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">اسم المستورد:</span>
                <span className="font-bold text-gray-900">{trader.importer_name}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">بلد المنشأ:</span>
                <span className="font-bold text-gray-900">{shipment.origin_country}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">عدد ونوع الحيوانات:</span>
                <span className="font-bold text-gray-900">{animalCount || trader.animal_count} - {animalType || trader.animal_type}</span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 block mb-1">التاريخ:</span>
                <span className="font-bold text-gray-900">{shipment.procedure_date || shipment.arrival_date || new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          <div className="single-truck-data-section">
            <h3 className="text-lg font-bold text-[#003361] bg-gray-50 p-4 border-b-2 border-gray-200 text-center">بيانات الشاحنة</h3>
            <div className="p-6">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">اسم السائق</td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل اسم السائق"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">رقم اللوحة</td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل رقم اللوحة"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">عدد الحيوانات</td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={animalCount}
                        onChange={(e) => setAnimalCount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل عدد الحيوانات"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">نوع الحيوان</td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={animalType}
                        onChange={(e) => setAnimalType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل نوع الحيوان"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">وقت وتاريخ مغادرة الميناء</td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={departureDateTime}
                        onChange={(e) => setDepartureDateTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل الوقت والتاريخ"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-bold text-[#003361] text-center bg-[#003361]/10 w-1/3">عدد الشاحنات المرسلة</td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={trucksCount}
                        onChange={(e) => setTrucksCount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        placeholder="أدخل عدد الشاحنات"
                        min="1"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer section with signature */}
            <div className="mt-12 flex justify-end">
              <div className="text-right">
                <p className="text-gray-900 font-bold text-base mb-1">طبيب القسم البيطري بمحجر ميناء جدة الإسلامي</p>
                <div className="h-20 w-64"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end no-print">
          <button
            onClick={handlePrintSingleTruck}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة البيان
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default SingleTruckModalWrapper;
