import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';

export default function BeneficiaryHeader() {
  const auth = useAuth();

  if (!auth) {
    return null;
  }

  const { user, signOut } = auth;

  return (
    <>
      <header className="bg-white shadow-lg border-b-2 border-gray-200 px-6 w-full flex items-center" style={{ height: '90px' }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md border border-secondary-100">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover shadow-lg border-2 border-secondary-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="text-right border-r-2 border-secondary-200 pr-3">
                <p className="text-sm font-bold text-gray-900">
                  {user?.name || 'مستخدم النظام'}
                </p>
                <p className="text-[11px] text-secondary-600 font-semibold">
                  مستفيد
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-3">
            <button
              onClick={signOut}
              className="relative group p-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
