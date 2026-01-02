import { useState, useEffect } from 'react';
import { Activity, Search, AlertCircle, ScanSearch } from 'lucide-react';
import { useProcedures } from '../../../hooks/useProcedures';
import { useTestResults } from '../../../hooks/useTestResults';
import PageHeader from '../../shared/PageHeader';
import SearchInputWithPaste from '../../shared/SearchInputWithPaste';
import Pagination from '../../shared/Pagination';

export default function VetLabStatus() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { procedures, loading: proceduresLoading } = useProcedures();
  const { results } = useTestResults();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getProcedureStatus = (procedure: any) => {
    const procedureSamples = procedure.samples || [];

    if (procedureSamples.length === 0) {
      return { status: 'no_samples', label: 'لا توجد عينات', color: 'gray' };
    }

    const samplesWithResults = procedureSamples.filter((sample: any) =>
      results.some(r => r.sample_id === sample.id)
    );

    if (samplesWithResults.length === 0) {
      return { status: 'in_testing', label: 'العينات في الفحص', color: 'blue' };
    } else if (samplesWithResults.length < procedureSamples.length) {
      return { status: 'partially_complete', label: 'مكتمل جزئياً', color: 'yellow' };
    } else {
      return { status: 'complete', label: 'مكتمل', color: 'green' };
    }
  };

  if (proceduresLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#61bf69] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const filteredProcedures = procedures
    .filter((procedure) => {
      const countryPort = procedure.country_port?.trim().toLowerCase();

      if (countryPort === 'المملكة العربية السعودية'.toLowerCase() ||
          countryPort === 'السعودية'.toLowerCase()) {
        return false;
      }

      // إخفاء الإجراءات المكتملة (نسبة الاكتمال 100%)
      const statusInfo = getProcedureStatus(procedure);
      if (statusInfo.status === 'complete') {
        return false;
      }

      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase().trim();
      return (
        procedure.internal_procedure_number?.toLowerCase().includes(query) ||
        procedure.external_procedure_number?.toLowerCase().includes(query) ||
        procedure.client_name?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // ترتيب عكسي حسب رقم الإجراء الخارجي (الأحدث في الأعلى)
      const numA = parseInt(a.external_procedure_number?.split('-')[0] || '0') || 0;
      const numB = parseInt(b.external_procedure_number?.split('-')[0] || '0') || 0;
      return numB - numA; // ترتيب تنازلي
    });

  const totalPages = Math.ceil(filteredProcedures.length / itemsPerPage);
  const paginatedProcedures = filteredProcedures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={ScanSearch}
            title="تتبع حالة الفحوصات"
            subtitle="متابعة حالة الفحوصات المخبرية للإجراءات"
          />

          <div className="mb-6">
            <SearchInputWithPaste
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="ابحث برقم الإجراء أو اسم العميل..."
            />
          </div>

          <div className="space-y-4">
            {paginatedProcedures.map((procedure) => {
              const statusInfo = getProcedureStatus(procedure);
              const procedureSamples = procedure.samples || [];
              const samplesWithResults = procedureSamples.filter((sample: any) =>
                results.some(r => r.sample_id === sample.id)
              );
              const percentage = procedureSamples.length > 0
                ? Math.round((samplesWithResults.length / procedureSamples.length) * 100)
                : 0;

              return (
                <div
                  key={procedure.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex-1 flex flex-col items-start gap-3">
                      {statusInfo.status !== 'no_samples' && (
                        <div className="w-full max-w-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">
                              {samplesWithResults.length} / {procedureSamples.length}
                            </span>
                            <span className={`text-lg font-bold ${
                              percentage === 100 ? 'text-green-600' :
                              percentage > 0 ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage === 100 ? 'bg-green-600' :
                                percentage > 0 ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {procedure.external_procedure_number || '-'}
                      </h3>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <span>{procedure.internal_procedure_number}</span>
                        <span>•</span>
                        <span>{procedure.client_name}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-end">
                      <span
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold ${
                          statusInfo.color === 'green'
                            ? 'bg-green-100 text-green-800'
                            : statusInfo.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : statusInfo.color === 'blue'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between gap-x-6 text-sm">
                      <div className="text-left whitespace-nowrap">
                        <span className="font-semibold text-gray-700">مستلم العينات في المختبر: </span>
                        <span className="text-gray-900">{procedure.receiver_name}</span>
                      </div>
                      <div className="text-center whitespace-nowrap">
                        <span className="font-semibold text-gray-700">البلد/الميناء: </span>
                        <span className="text-gray-900">{procedure.country_port || '-'}</span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-semibold text-gray-700">تاريخ استلام العينات في المختبر: </span>
                        <span className="text-gray-900">{procedure.reception_date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProcedures.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredProcedures.length}
              />
            </div>
          )}

          {filteredProcedures.length === 0 && !proceduresLoading && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'لا توجد نتائج مطابقة لعملية البحث' : 'لا توجد إجراءات'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
