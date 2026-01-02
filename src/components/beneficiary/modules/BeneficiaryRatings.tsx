import { Star, ChevronDown, ChevronUp, MessageSquare, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import PageHeader from '../../shared/PageHeader';
import toast from 'react-hot-toast';
import type { ElectronAPI } from '../../../types/electron';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface Rating {
  id: string;
  procedure_number: string;
  service_satisfaction: number;
  experience_satisfaction: number;
  transaction_completion: number;
  procedures_clarity: number;
  comment: string | null;
  created_at: string;
}

export default function BeneficiaryRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [averageRatings, setAverageRatings] = useState({
    service_satisfaction: 0,
    experience_satisfaction: 0,
    transaction_completion: 0,
    procedures_clarity: 0,
    overall: 0
  });

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getAllShipmentRatings) {
        const data = await window.electronAPI.getAllShipmentRatings();
        if (data && data.length > 0) {
          setRatings(data);
          calculateAverages(data);
        } else {
          setRatings([]);
        }
      } else {
        const { data, error } = await supabase
          .from('shipment_ratings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setRatings(data);
          calculateAverages(data);
        } else {
          setRatings([]);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل التقييمات:', error);
      toast.error('فشل في تحميل التقييمات');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAverages = (ratingsData: Rating[]) => {
    if (ratingsData.length === 0) {
      setAverageRatings({
        service_satisfaction: 0,
        experience_satisfaction: 0,
        transaction_completion: 0,
        procedures_clarity: 0,
        overall: 0
      });
      return;
    }

    const totals = ratingsData.reduce((acc, rating) => ({
      service_satisfaction: acc.service_satisfaction + rating.service_satisfaction,
      experience_satisfaction: acc.experience_satisfaction + rating.experience_satisfaction,
      transaction_completion: acc.transaction_completion + rating.transaction_completion,
      procedures_clarity: acc.procedures_clarity + rating.procedures_clarity
    }), {
      service_satisfaction: 0,
      experience_satisfaction: 0,
      transaction_completion: 0,
      procedures_clarity: 0
    });

    const count = ratingsData.length;
    const avgService = totals.service_satisfaction / count;
    const avgExperience = totals.experience_satisfaction / count;
    const avgTransaction = totals.transaction_completion / count;
    const avgClarity = totals.procedures_clarity / count;
    const overall = (avgService + avgExperience + avgTransaction + avgClarity) / 4;

    setAverageRatings({
      service_satisfaction: avgService,
      experience_satisfaction: avgExperience,
      transaction_completion: avgTransaction,
      procedures_clarity: avgClarity,
      overall
    });
  };


  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Star}
            title="متابعة التقييمات"
            subtitle="عرض تقييمات العملاء للخدمات المقدمة"
          />

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#61bf69] mx-auto mb-4"></div>
              <p className="text-gray-500 text-lg">جاري التحميل...</p>
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                لا توجد تقييمات حالياً
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md border-2 border-blue-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl shadow-lg bg-[#458ac9]">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#458ac9]">متوسط التقييمات</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <StatCard
                    title="التقييم العام"
                    value={averageRatings.overall}
                    isOverall
                  />
                  <StatCard
                    title="رضا الخدمات"
                    value={averageRatings.service_satisfaction}
                  />
                  <StatCard
                    title="رضا التجربة"
                    value={averageRatings.experience_satisfaction}
                  />
                  <StatCard
                    title="إنجاز المعاملة"
                    value={averageRatings.transaction_completion}
                  />
                  <StatCard
                    title="وضوح الإجراءات"
                    value={averageRatings.procedures_clarity}
                  />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    إجمالي التقييمات: <span className="font-bold text-[#458ac9]">{ratings.length}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div
                    key={rating.id}
                    className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === rating.id ? null : rating.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-right">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                          رقم الإجراء: {rating.procedure_number}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(rating.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-lg font-bold text-gray-800">
                            {((rating.service_satisfaction + rating.experience_satisfaction + rating.transaction_completion + rating.procedures_clarity) / 4).toFixed(1)}
                          </span>
                        </div>
                        {expandedId === rating.id ? (
                          <ChevronUp className="w-6 h-6 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {expandedId === rating.id && (
                      <div className="px-6 py-6 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <RatingDetail
                            label="رضا الخدمات"
                            value={rating.service_satisfaction}
                          />
                          <RatingDetail
                            label="رضا التجربة"
                            value={rating.experience_satisfaction}
                          />
                          <RatingDetail
                            label="إنجاز المعاملة"
                            value={rating.transaction_completion}
                          />
                          <RatingDetail
                            label="وضوح الإجراءات"
                            value={rating.procedures_clarity}
                          />
                        </div>

                        {rating.comment && (
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                  ملاحظات العميل:
                                </p>
                                <p className="text-sm text-blue-800">
                                  {rating.comment}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, isOverall = false }: { title: string; value: number; isOverall?: boolean }) {
  const getRatingText = (val: number) => {
    if (val >= 4.5) return 'ممتاز';
    if (val >= 3.5) return 'جيد';
    if (val >= 2.5) return 'مقبول';
    if (val >= 1.5) return 'سيء';
    return 'سيء جداً';
  };

  const getRatingColor = (val: number) => {
    if (val >= 4.5) return 'text-green-600';
    if (val >= 3.5) return 'text-blue-600';
    if (val >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = (val: number) => {
    if (val >= 4.5) return 'bg-green-50 border-green-300';
    if (val >= 3.5) return 'bg-blue-50 border-blue-300';
    if (val >= 2.5) return 'bg-yellow-50 border-yellow-300';
    return 'bg-red-50 border-red-300';
  };

  return (
    <div className={`${isOverall ? getBgColor(value) : 'bg-white border-gray-200'} border-2 rounded-xl p-4 text-center`}>
      <p className={`text-sm font-medium mb-2 ${isOverall ? 'text-gray-700' : 'text-gray-600'}`}>
        {title}
      </p>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Star className={`w-5 h-5 fill-yellow-400 text-yellow-400`} />
        <span className={`text-2xl font-bold ${isOverall ? getRatingColor(value) : 'text-gray-800'}`}>
          {value.toFixed(1)}
        </span>
      </div>
      {isOverall && (
        <p className={`text-xs font-semibold ${getRatingColor(value)}`}>
          {getRatingText(value)}
        </p>
      )}
    </div>
  );
}

function RatingDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-600 mb-2">{label}</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">{value}/5</p>
    </div>
  );
}
