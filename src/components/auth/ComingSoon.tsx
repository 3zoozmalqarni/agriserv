import { ArrowRight, Construction } from 'lucide-react';

interface ComingSoonProps {
  onBack: () => void;
}

export default function ComingSoon({ onBack }: ComingSoonProps) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#f8f9fa' }}>
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
        <img
          src="/image copy copy.png"
          alt="Background Pattern"
          className="w-[600px] h-[600px] object-contain"
        />
      </div>

      <div className="w-full py-4 px-6" style={{ background: '#61bf69' }}>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: '#61bf69', opacity: 0.1 }}>
                <Construction className="w-20 h-20" style={{ color: '#61bf69' }} />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6" style={{ color: '#003361' }}>
              سيتم تطوير الصفحة قريباً
            </h1>

            <p className="text-xl text-gray-600 mb-12">
              نعمل حالياً على تطوير هذه الخدمة لتقديم أفضل تجربة لك
            </p>

            <button
              onClick={onBack}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white text-lg font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ background: '#61bf69' }}
            >
              <span>العودة للصفحة الرئيسية</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
