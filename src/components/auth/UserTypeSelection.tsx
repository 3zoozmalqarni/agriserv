import { Users, Microscope, Cat } from 'lucide-react';

interface UserTypeSelectionProps {
  onSelectType: (type: 'beneficiary' | 'lab' | 'vet') => void;
}

export default function UserTypeSelection({ onSelectType }: UserTypeSelectionProps) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#f8f9fa' }}>
      <div className="w-full py-4 px-6" style={{ background: '#61bf69' }}>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-center mb-24">
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-6 whitespace-nowrap" style={{ color: '#003361' }}>
                بوابة الدخول إلى خدمات محجر ميناء جدة الإسلامي
              </h1>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            <button
              onClick={() => onSelectType('beneficiary')}
              className="group relative overflow-hidden rounded-3xl p-10 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(97,191,105,0.4)] hover:-translate-y-2 hover:scale-105 text-right"
              style={{
                background: 'linear-gradient(135deg, #61bf69 0%, #4da855 100%)',
                boxShadow: '0 10px 30px rgba(97, 191, 105, 0.3)'
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative flex flex-col items-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:rotate-6 transition-all duration-300">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                  المستفيدين
                </h2>
              </div>
            </button>

            <button
              onClick={() => onSelectType('lab')}
              className="group relative overflow-hidden rounded-3xl p-10 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(97,191,105,0.4)] hover:-translate-y-2 hover:scale-105 text-right"
              style={{
                background: 'linear-gradient(135deg, #61bf69 0%, #4da855 100%)',
                boxShadow: '0 10px 30px rgba(97, 191, 105, 0.3)'
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative flex flex-col items-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:rotate-6 transition-all duration-300">
                  <Microscope className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                  قسم المختبرات
                </h2>
              </div>
            </button>

            <button
              onClick={() => onSelectType('vet')}
              className="group relative overflow-hidden rounded-3xl p-10 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(97,191,105,0.4)] hover:-translate-y-2 hover:scale-105 text-right"
              style={{
                background: 'linear-gradient(135deg, #61bf69 0%, #4da855 100%)',
                boxShadow: '0 10px 30px rgba(97, 191, 105, 0.3)'
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative flex flex-col items-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:rotate-6 transition-all duration-300">
                  <Cat className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                  القسم البيطري
                </h2>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
