import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimalShipment, TraderEntry, TruckEntry } from './quarantine-types';

interface TruckStatementModalProps {
  trader: TraderEntry;
  shipment: AnimalShipment;
  onClose: () => void;
}

function TruckStatementModal({ trader, shipment, onClose }: TruckStatementModalProps) {
  const [truckEntries, setTruckEntries] = useState<TruckEntry[]>([]);

  useEffect(() => {
    const entries: TruckEntry[] = [];
    for (let i = 0; i < 20; i++) {
      entries.push({
        id: `truck-${i}`,
        driver_name: '',
        plate_number: '',
        animal_count: 0
      });
    }
    setTruckEntries(entries);
  }, []);

  const handleTruckChange = (id: string, field: keyof TruckEntry, value: string | number) => {
    setTruckEntries(prev => prev.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handlePrintTruckStatement = () => {
    const printArea = document.querySelector('.truck-statement-print-content');
    if (!printArea) {
      toast.error('خطأ في العثور على المحتوى للطباعة');
      return;
    }

    const clonedContent = printArea.cloneNode(true) as HTMLElement;
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
            <h2 style="color: #00a651 !important; font-size: 13px; font-weight: 600; margin: 0;">بيان شاحنات متجهة إلى محجر الخمرة</h2>
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
    printContainer.id = 'temp-print-container-truck';
    printContainer.style.display = 'none';
    printContainer.appendChild(printTable);
    document.body.appendChild(printContainer);

    const printStyles = document.createElement('style');
    printStyles.id = 'dynamic-print-styles-truck';
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

        body > *:not(#temp-print-container-truck) {
          display: none !important;
        }

        #temp-print-container-truck {
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #temp-print-container-truck > * {
          margin: 0 !important;
          padding: 0 !important;
        }

        #temp-print-container-truck * {
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

        .truck-statement-print-content {
          padding: 0 !important;
          margin: 0 !important;
        }

        .truck-statement-print-content > div {
          page-break-inside: auto !important;
        }

        .truck-statement-print-content .bg-blue-50 {
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

        .truck-statement-print-content .bg-blue-50 h3 {
          margin: 0 0 10px 0 !important;
          padding: 0 !important;
          font-size: 11px !important;
        }

        .truck-statement-print-content .bg-blue-50 .grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 12px !important;
          align-items: start !important;
          justify-content: center !important;
          margin: 0 !important;
        }

        .truck-statement-print-content .bg-blue-50 .grid > div {
          padding: 4px 0 !important;
        }

        .truck-statement-print-content .bg-blue-50 .grid span.block {
          display: block !important;
          margin-bottom: 3px !important;
          font-size: 8px !important;
        }

        .truck-statement-print-content .bg-blue-50 .grid span.font-bold {
          font-size: 9px !important;
          line-height: 1.3 !important;
        }

        .truck-statement-print-content .bg-amber-50 {
          background: #fffbeb !important;
          border: 0.5px solid #f59e0b !important;
          border-radius: 8px !important;
          padding: 10px !important;
          margin-bottom: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
        }

        .truck-statement-print-content .truck-data-section {
          margin-top: 12px !important;
        }

        .truck-statement-print-content .truck-data-section h3 {
          background: #f5f5f5 !important;
          border: 0.5px solid #003361 !important;
          border-radius: 8px !important;
          padding: 10px !important;
          margin: 0 0 12px 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
        }

        .truck-statement-print-content .overflow-x-auto {
          margin-top: 12px !important;
        }

        .truck-statement-print-content table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: none !important;
          overflow: hidden !important;
        }

        .truck-statement-print-content thead th {
          background: #f5f5f5 !important;
          color: #003361 !important;
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          padding: 8px 4px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          line-height: 1.3 !important;
          height: 32px !important;
          vertical-align: middle !important;
          text-align: center !important;
        }

        .truck-statement-print-content tbody tr {
          height: 26px !important;
        }

        .truck-statement-print-content tbody tr:nth-child(even) {
          background: linear-gradient(to right, #f8fafc 0%, #f1f5f9 100%) !important;
        }

        .truck-statement-print-content tbody tr:nth-child(odd) {
          background: white !important;
        }

        .truck-statement-print-content tbody td {
          border: none !important;
          border-bottom: 0.5px solid #e5e7eb !important;
          padding: 8px 4px !important;
          font-size: 10.5px !important;
          line-height: 1.4 !important;
          height: 26px !important;
          vertical-align: middle !important;
          text-align: center !important;
          color: #003361 !important;
        }

        .truck-statement-print-content tbody tr:last-child td {
          border-bottom: none !important;
        }

        .truck-statement-print-content tbody td span {
          color: #003361 !important;
        }
      }
    `;

    const oldStyles = document.getElementById('dynamic-print-styles-truck');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(printStyles);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const container = document.getElementById('temp-print-container-truck');
        if (container) container.remove();
        const styles = document.getElementById('dynamic-print-styles-truck');
        if (styles) styles.remove();
      }, 1000);
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#003361] to-[#004280] p-6 flex justify-between items-center no-print">
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-white">بيان شاحنات متجهة إلى محجر الخمرة</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 truck-statement-print-content">
          <div className="text-center mb-4 no-print">
            <h2 className="text-xl font-bold text-[#003361]">بيان شاحنات متجهة إلى محجر الخمرة</h2>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
            <h3 className="text-sm font-bold text-[#003361] mb-2 text-center">البيانات الأساسية</h3>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              <div>
                <span className="text-gray-600 block">اسم الباخرة:</span>
                <span className="font-bold text-gray-900">{shipment.transport_method || 'غير محدد'}</span>
              </div>
              <div>
                <span className="text-gray-600 block">رقم الإجراء:</span>
                <span className="font-bold text-gray-900">{shipment.procedure_number}</span>
              </div>
              <div>
                <span className="text-gray-600 block">وقت الوصول:</span>
                <span className="font-bold text-gray-900">{shipment.arrival_time}</span>
              </div>
              <div>
                <span className="text-gray-600 block">اسم المستورد:</span>
                <span className="font-bold text-gray-900">{trader.importer_name}</span>
              </div>
              <div>
                <span className="text-gray-600 block">بلد المنشأ:</span>
                <span className="font-bold text-gray-900">{shipment.origin_country}</span>
              </div>
              <div>
                <span className="text-gray-600 block">عدد ونوع الحيوانات:</span>
                <span className="font-bold text-gray-900">{trader.animal_count} - {trader.animal_type}</span>
              </div>
              <div>
                <span className="text-gray-600 block">التاريخ:</span>
                <span className="font-bold text-gray-900">{shipment.procedure_date || shipment.arrival_date || new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {trader.reasons && trader.reasons.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 mb-6 border-2 border-amber-200">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#003361]">السبب:</span>
                <span className="font-semibold text-gray-900">{trader.reasons.join(' - ')}</span>
              </div>
            </div>
          )}

          <div className="truck-data-section">
            <h3 className="text-lg font-bold text-[#003361] bg-gray-50 p-4 border-b-2 border-gray-200 text-center">بيانات الشاحنات</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#003361]/10 border-b-2 border-[#003361]/20">
                    <th className="px-4 py-3 text-center font-bold text-[#003361] text-sm w-20">الرقم</th>
                    <th className="px-4 py-3 text-center font-bold text-[#003361] text-sm">اسم السائق</th>
                    <th className="px-4 py-3 text-center font-bold text-[#003361] text-sm">رقم اللوحة</th>
                    <th className="px-4 py-3 text-center font-bold text-[#003361] text-sm w-32">عدد الحيوانات</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 15 }).map((_, index) => {
                    const entry = truckEntries[index];
                    return (
                      <tr key={entry?.id || `empty-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={entry?.driver_name || ''}
                            onChange={(e) => entry && handleTruckChange(entry.id, 'driver_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                            placeholder="اسم السائق"
                            disabled={!entry}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={entry?.plate_number || ''}
                            onChange={(e) => entry && handleTruckChange(entry.id, 'plate_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                            placeholder="رقم اللوحة"
                            disabled={!entry}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={entry?.animal_count || ''}
                            onChange={(e) => entry && handleTruckChange(entry.id, 'animal_count', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                            placeholder="عدد الحيوانات"
                            min="0"
                            disabled={!entry}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer section with signature */}
            <div className="mt-8 flex justify-center">
              <div className="text-center">
                <p className="vet-signature text-gray-900 font-semibold text-lg mb-20"></p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end no-print">
          <button
            onClick={handlePrintTruckStatement}
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

export default TruckStatementModal;
