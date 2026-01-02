import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import AuthContainer from './components/auth/AuthContainer';
import VetDashboard from './components/vet/VetDashboard';
import LabDashboard from './components/lab/LabDashboard';
import BeneficiaryDashboard from './components/beneficiary/BeneficiaryDashboard';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const __PROJECT_COPYRIGHT__ = btoa(encodeURIComponent('هذا المشروع من افكار وتنفيذ برمجي : عبدالعزيز محمد القرني - وبدعم مادي من : فهد عبدالله الغامدي و شاكر سفر الثبيتي'));

function ErrorFallback({ error }: { error: Error }) {
  console.error('Dashboard Error:', error);
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ في التطبيق</h1>
        <p className="text-gray-600 mb-2">{error.message}</p>
        <pre className="text-xs text-left bg-gray-100 p-4 rounded mt-4 overflow-auto">
          {error.stack}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const auth = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('AppContent mounted');
    console.log('Auth object:', auth);
    if (auth) {
      console.log('User:', auth.user);
      console.log('Loading:', auth.loading);
    }
    setIsReady(true);
  }, [auth]);

  useEffect(() => {
    if (auth && auth.user) {
      console.log('User changed:', auth.user);
    }
  }, [auth?.user]);

  if (!auth) {
    console.error('Auth context is undefined!');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ في تهيئة التطبيق</h1>
          <p className="text-gray-600">لم يتم تهيئة نظام المصادقة بشكل صحيح</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    console.log('App not ready yet...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const { user, loading } = auth;

  console.log('Rendering decision - user:', user, 'loading:', loading);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      ) : user ? (
        <>
          {console.log('Rendering Dashboard for user:', user)}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {user.userType === 'lab' ? <LabDashboard /> : user.userType === 'beneficiary' ? <BeneficiaryDashboard /> : <VetDashboard />}
          </ErrorBoundary>
        </>
      ) : (
        <>
          {console.log('Rendering AuthContainer - no user')}
          <AuthContainer />
        </>
      )}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            color: 'white',
            fontWeight: 'bold',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'SST Arabic, sans-serif',
          },
          success: {
            style: {
              background: '#61bf69',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#61bf69',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
            duration: 3000,
            iconTheme: {
              primary: 'white',
              secondary: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('App initialized');
    console.log('Electron API available:', window.electronAPI !== undefined);
    if (typeof window !== 'undefined') {
      (window as any).__cr__ = __PROJECT_COPYRIGHT__;
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;