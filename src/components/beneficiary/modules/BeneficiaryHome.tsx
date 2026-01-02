import { Award, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export default function BeneficiaryHome() {
  const auth = useAuth();

  return (
    <div className="min-h-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-[#003361]">
              خدمات المستفيدين بمحجر ميناء جدة الإسلامي
            </h1>
          </div>
          <p className="text-gray-600 text-base mb-2">الخدمات البيطرية</p>
          <div className="mb-3">
            <span className="text-sm font-bold" style={{ color: '#61bf69' }}>
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#61bf69' }}>
            مرحباً بك {auth?.user?.name || 'مستخدم النظام'}
          </p>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-lg" style={{ background: '#458ac9' }}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#458ac9' }}>خدماتنا المقدمة</h2>
            <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(to left, #458ac9, transparent)' }}></div>
          </div>

          <div className="relative overflow-hidden border-2 border-[#003361] rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
            <div className="relative overflow-hidden bg-white rounded-3xl py-8 px-10">
              {/* Animated badge */}
              <div className="absolute top-6 right-6 bg-[#f18700] text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-sm">جديد</span>
              </div>

              <div className="relative z-10">
                {/* Main text */}
                <div className="text-center pt-4">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#008a40] mb-3 leading-relaxed">
                    عزيزي المستفيد يمكنك الآن تتبع حالة إرسالياتك الحيوانية
                  </h3>
                  <p className="text-lg text-[#61bf69] leading-relaxed font-semibold">
                    تابع كل تفاصيل التقدم والإنجاز
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
