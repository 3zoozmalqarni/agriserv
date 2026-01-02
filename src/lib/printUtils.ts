export function getCommonPrintStyles(): string {
  return `
    <style>
      @page {
        size: A4;
        margin: 10mm;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        direction: rtl;
        text-align: right;
        font-size: 10pt;
        line-height: 1.4;
        color: #000;
        background: #fff;
      }

      .print-container {
        max-width: 100%;
        margin: 0 auto;
        padding: 10px;
      }

      .header {
        text-align: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
      }

      .header h1 {
        font-size: 16pt;
        font-weight: bold;
        margin-bottom: 5px;
        color: #003361;
      }

      .header h2 {
        font-size: 14pt;
        font-weight: bold;
        margin-bottom: 3px;
        color: #61bf69;
      }

      .header p {
        font-size: 9pt;
        color: #666;
      }

      .section {
        margin-bottom: 10px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f9f9f9;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: 11pt;
        font-weight: bold;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid #ddd;
        color: #003361;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-bottom: 6px;
      }

      .info-item {
        padding: 4px 6px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 2px;
      }

      .info-label {
        font-weight: bold;
        color: #555;
        font-size: 9pt;
      }

      .info-value {
        color: #000;
        font-size: 9pt;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        font-size: 9pt;
      }

      table th,
      table td {
        border: 1px solid #333;
        padding: 4px 6px;
        text-align: right;
      }

      table th {
        background-color: #003361;
        color: #fff;
        font-weight: bold;
        font-size: 9pt;
      }

      table tbody tr:nth-child(even) {
        background-color: #f9f9f9;
      }

      .footer {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 2px solid #333;
        text-align: center;
        font-size: 8pt;
        color: #666;
      }

      .signature-section {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-top: 30px;
        page-break-inside: avoid;
      }

      .signature-box {
        text-align: center;
        padding: 10px;
        border: 1px solid #ddd;
      }

      .signature-line {
        border-top: 1px solid #000;
        width: 150px;
        margin: 30px auto 5px;
      }

      .barcode-container {
        text-align: center;
        margin: 10px 0;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .page-break {
          page-break-after: always;
        }

        .no-print {
          display: none !important;
        }
      }
    </style>
  `;
}

export function generatePrintHeader(title: string, subtitle?: string): string {
  return `
    <div class="header">
      <h1>نظام إدارة المختبرات البيطرية</h1>
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
    </div>
  `;
}

export function generatePrintFooter(): string {
  return `
    <div class="footer">
      <p>نظام إدارة المختبرات البيطرية - AgriServ</p>
      <p>تم الإنشاء بواسطة نظام إدارة المختبرات البيطرية</p>
    </div>
  `;
}

export function createPrintWindow(htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);
  }
}
