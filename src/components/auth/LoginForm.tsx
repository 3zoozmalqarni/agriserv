import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Microscope, ArrowRight, Cat } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';


const loginSchema = z.object({
  email: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginFormProps {
  userType: 'beneficiary' | 'lab' | 'vet';
  onBack: () => void;
}

export default function LoginForm({ userType, onBack }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  if (!auth) {
    return <div>Loading...</div>;
  }

  const { signIn, loading } = auth;

  const onSubmit = async (data: LoginForm) => {
    await signIn(data.email, data.password, userType);
  };

  const getUserTypeTitle = () => {
    switch (userType) {
      case 'beneficiary':
        return 'دخول المستفيدين';
      case 'lab':
        return 'دخول موظفي قسم المختبر';
      case 'vet':
        return 'دخول موظفي القسم البيطري';
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: '#f8f9fa' }}>
      <div className="w-full py-3 px-6" style={{ background: '#61bf69' }}>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative z-10">
        <div className="w-full max-w-6xl h-full flex items-center justify-center gap-12">
          <div className="flex-1 max-w-xl">
            <div className="group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(97,191,105,0.4)] text-right w-full"
              style={{
                background: 'linear-gradient(135deg, #61bf69 0%, #4da855 100%)',
                boxShadow: '0 10px 30px rgba(97, 191, 105, 0.3)'
              }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:rotate-6 transition-all duration-300">
                      {userType === 'vet' ? (
                        <Cat className="w-12 h-12 text-white" />
                      ) : userType === 'beneficiary' ? (
                        <User className="w-12 h-12 text-white" />
                      ) : (
                        <Microscope className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>

                  <p className="text-2xl font-bold text-white">
                    {getUserTypeTitle()}
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-right text-white">
                      اسم المستخدم
                    </label>
                    <input
                      {...register('email')}
                      className="w-full px-4 h-[50px] border-0 rounded-lg text-right transition-all duration-300 focus:ring-2 focus:ring-white/50 focus:outline-[#61bf69] bg-white/90 backdrop-blur-sm font-medium text-gray-800 placeholder:text-gray-400"
                      placeholder="أدخل اسم المستخدم"
                      autoComplete="username"
                    />
                    {errors.email && (
                      <p className="text-red-200 text-sm mt-1 text-right bg-red-500/20 px-3 py-1 rounded-lg">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-right text-white">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className="w-full px-4 pl-12 h-[50px] border-0 rounded-lg text-right transition-all duration-300 focus:ring-2 focus:ring-white/50 focus:outline-[#61bf69] bg-white/90 backdrop-blur-sm font-medium text-gray-800 placeholder:text-gray-400"
                        placeholder="أدخل كلمة المرور"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-all duration-300 p-2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-200 text-sm mt-1 text-right bg-red-500/20 px-3 py-1 rounded-lg">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-white rounded-xl font-bold text-lg focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 relative overflow-hidden group bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    {loading ? (
                      <div className="flex items-center justify-center gap-3 relative z-10">
                        <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                        <span>جاري تسجيل الدخول...</span>
                      </div>
                    ) : (
                      <span className="relative z-10">
                        تسجيل الدخول
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full h-12 rounded-xl font-bold text-lg focus:outline-none transition-all duration-300 mt-3 relative overflow-hidden group bg-white/90 hover:bg-white flex items-center justify-center"
                    style={{ color: '#61bf69' }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 group-hover:gap-3 transition-all duration-300">
                      <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                      <span>رجوع</span>
                    </span>
                  </button>
                </form>

                <div className="text-center mt-5 pt-4 border-t-2 border-white/20">
                  <p className="text-xs font-semibold text-white/80">
                    © 2025 خدمات محجر ميناء جدة الإسلامي
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