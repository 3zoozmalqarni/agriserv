import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Scan, X, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Attachment {
  id: string;
  name: string;
  data: string;
  type: 'scanner' | 'upload';
  size: number;
  uploadedAt: string;
}

interface AttachmentsSectionProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  required?: boolean;
}

export default function AttachmentsSection({ attachments, onAttachmentsChange, required = true }: AttachmentsSectionProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewAttachment && showPreview) {
      const setupPreview = async () => {
        try {
          console.log('[AttachmentsSection] 🔍 بدء إنشاء معاينة PDF');
          console.log('[AttachmentsSection]   - حجم الملف:', previewAttachment.size);
          console.log('[AttachmentsSection]   - اسم الملف:', previewAttachment.name);

          const electronAPI = (window as any).electronAPI;
          const isElectron = !!electronAPI;

          if (isElectron && electronAPI.createTempPdfFile) {
            console.log('[AttachmentsSection] 🖥️  Electron: حفظ PDF مؤقتاً');
            try {
              const filePath = await electronAPI.createTempPdfFile(
                previewAttachment.data,
                previewAttachment.name
              );
              console.log('[AttachmentsSection] ✅ تم إنشاء ملف مؤقت:', filePath);
              setTempFilePath(filePath);

              const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
              console.log('[AttachmentsSection]   - file:// URL:', fileUrl);
              setPreviewBlobUrl(fileUrl);

              return () => {
                if (electronAPI.deleteTempPdfFile) {
                  electronAPI.deleteTempPdfFile(filePath).catch((err: any) => {
                    console.warn('[AttachmentsSection] ⚠️  فشل حذف الملف المؤقت:', err);
                  });
                }
              };
            } catch (error) {
              console.error('[AttachmentsSection] ❌ فشل إنشاء ملف مؤقت:', error);
              toast.error('فشل إنشاء معاينة PDF');
            }
          } else {
            console.log('[AttachmentsSection] 🌐 Browser: تحويل إلى blob URL');
            const base64Data = previewAttachment.data.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            console.log('[AttachmentsSection] ✅ تم إنشاء blob URL:', url);
            setPreviewBlobUrl(url);

            return () => {
              if (url) {
                URL.revokeObjectURL(url);
              }
            };
          }
        } catch (error) {
          console.error('[AttachmentsSection] ❌ خطأ في إنشاء معاينة:', error);
          toast.error('فشل عرض الملف');
        }
      };

      setupPreview();
    } else {
      setPreviewBlobUrl(null);
      setTempFilePath(null);
    }
  }, [previewAttachment, showPreview]);

  const handleOpenExternal = async () => {
    const electronAPI = (window as any).electronAPI;
    if (tempFilePath && electronAPI?.openPdfExternal) {
      try {
        console.log('[AttachmentsSection] 📂 فتح PDF في تطبيق خارجي');
        await electronAPI.openPdfExternal(tempFilePath);
        toast.success('تم فتح الملف في التطبيق الافتراضي');
      } catch (error) {
        console.error('[AttachmentsSection] ❌ فشل فتح الملف:', error);
        toast.error('فشل فتح الملف في التطبيق الخارجي');
      }
    }
  };

  const handleScanDocument = async () => {
    try {
      if (!('showOpenFilePicker' in window)) {
        toast.error('المسح الضوئي المباشر غير مدعوم في هذا المتصفح. استخدم رفع ملف بدلاً من ذلك.');
        return;
      }

      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'PDF Files',
          accept: { 'application/pdf': ['.pdf'] }
        }],
        multiple: false
      });

      const file = await fileHandle.getFile();
      await processFile(file, 'scanner');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error scanning document:', error);
        toast.error('فشل المسح الضوئي');
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('يجب أن يكون الملف بصيغة PDF فقط');
      return;
    }

    processFile(file, 'upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File, type: 'scanner' | 'upload') => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          data: base64,
          type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };

        onAttachmentsChange([...attachments, newAttachment]);
        toast.success(`تم ${type === 'scanner' ? 'المسح' : 'الرفع'} بنجاح`);
      };
      reader.onerror = () => {
        toast.error('فشل قراءة الملف');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('حدث خطأ أثناء معالجة الملف');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
    toast.success('تم حذف المرفق');
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    const electronAPI = (window as any).electronAPI;
    const isElectron = !!electronAPI;

    if (isElectron && electronAPI.createTempPdfFile && electronAPI.openPdfExternal) {
      try {
        console.log('[AttachmentsSection] 📂 فتح PDF مباشرة في التطبيق الخارجي');
        const filePath = await electronAPI.createTempPdfFile(
          attachment.data,
          attachment.name
        );
        await electronAPI.openPdfExternal(filePath);
        toast.success('تم فتح الملف في قارئ PDF');

        setTimeout(() => {
          if (electronAPI.deleteTempPdfFile) {
            electronAPI.deleteTempPdfFile(filePath).catch((err: any) => {
              console.warn('[AttachmentsSection] ⚠️  فشل حذف الملف المؤقت:', err);
            });
          }
        }, 5000);
      } catch (error) {
        console.error('[AttachmentsSection] ❌ فشل فتح الملف:', error);
        toast.error('فشل فتح الملف');
      }
    } else {
      setPreviewAttachment(attachment);
      setShowPreview(true);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isValid = !required || attachments.length > 0;

  return (
    <>
      <div className={`rounded-xl p-6 border transition-all ${
        !isValid ? 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-300' : 'bg-gradient-to-br from-blue-50/30 to-indigo-50/30 border-blue-100'
      }`}>
        <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: !isValid ? '#dc2626' : 'rgba(59, 130, 246, 0.2)' }}>
          <h3 className={`text-xl font-bold ${!isValid ? 'text-red-700' : 'text-gray-800'}`}>
            المرفقات {required && <span className="text-red-600">*</span>}
          </h3>
          {!isValid && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-4 h-4" />
              يجب إرفاق ملف واحد على الأقل
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={handleScanDocument}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Scan className="w-6 h-6" />
            المسح الضوئي المباشر
          </button>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Upload className="w-6 h-6" />
              رفع ملف PDF
            </label>
          </div>
        </div>

        {attachments.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">المرفقات المضافة ({attachments.length})</h4>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • {attachment.type === 'scanner' ? 'مسح ضوئي' : 'ملف مرفوع'} • {new Date(attachment.uploadedAt).toLocaleString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewAttachment(attachment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="معاينة"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="حذف"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white/60 rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">لم يتم إرفاق أي ملفات بعد</p>
            <p className="text-sm text-gray-400 mt-1">استخدم أحد الأزرار أعلاه لإضافة مرفقات</p>
          </div>
        )}
      </div>

      {showPreview && previewAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">{previewAttachment.name}</h3>
              <div className="flex items-center gap-2">
                {tempFilePath && (window as any).electronAPI?.openPdfExternal && (
                  <button
                    onClick={handleOpenExternal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
                    setShowPreview(false);
                    setPreviewAttachment(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
    </>
  );
}
