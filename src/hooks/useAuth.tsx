import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { localDB } from '../lib/localDatabase';
import { vetDB } from '../lib/vetDatabase';
import { beneficiariesDB } from '../lib/beneficiariesDatabase';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  profile_image?: string;
  userType?: 'lab' | 'vet' | 'beneficiary';
}

export interface AuthContextType {
  user: User | null;
  signIn: (usernameOrEmail: string, password: string, userType: 'lab' | 'vet' | 'beneficiary') => Promise<void>;
  signOut: () => void;
  loading: boolean;
  isOnlineMode: boolean;
  hasPermission: (action: string) => boolean;
}

const rolePermissions: Record<string, string[]> = {
  // ============================================
  // الأدوار الشاملة (للقسمين معاً)
  // ============================================

  // مدير البرنامج - جميع الصلاحيات في القسمين (حساب واحد فقط)
  program_manager: [
    'view_all',
    'edit_all',
    'manage_users',
    'manage_lab_users',
    'manage_vet_users',
    'view_reports',
    'use_search',
    // صلاحيات المختبر
    'delete_lab_procedure',
    'delete_lab_result',
    'add_inventory_item',
    'edit_inventory_item',
    'delete_inventory_item',
    'withdraw_inventory_item',
    'approve_results',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results',
    // صلاحيات القسم البيطري
    'delete_vet_procedure',
    'delete_shipment',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // مشرف عام المحجر - جميع الصلاحيات في القسمين (حساب واحد فقط)
  quarantine_general_supervisor: [
    'view_all',
    'edit_all',
    'manage_users',
    'manage_lab_users',
    'manage_vet_users',
    'view_reports',
    'use_search',
    // صلاحيات المختبر
    'delete_lab_procedure',
    'delete_lab_result',
    'add_inventory_item',
    'edit_inventory_item',
    'delete_inventory_item',
    'withdraw_inventory_item',
    'approve_results',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results',
    // صلاحيات القسم البيطري
    'delete_vet_procedure',
    'delete_shipment',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // ============================================
  // قسم المختبر
  // ============================================

  // مدير قسم المختبر - جميع الصلاحيات (حساب واحد)
  lab_manager: [
    'view_all',
    'edit_all',
    'manage_lab_users',
    'view_reports',
    'use_search',
    'delete_lab_procedure',
    'delete_lab_result',
    'add_inventory_item',
    'edit_inventory_item',
    'delete_inventory_item',
    'withdraw_inventory_item',
    'approve_results',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results'
  ],

  // مشرف مجموعة (مختبر) - جميع الصلاحيات ما عدا: إدارة المستخدمين، إضافة/حذف/تعديل المخزون (فقط صرف)
  lab_section_supervisor: [
    'view_all',
    'edit_all',
    'view_reports',
    'use_search',
    'delete_lab_procedure',
    'delete_lab_result',
    'withdraw_inventory_item',
    'approve_results',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results'
  ],

  // أخصائي مختبر - جميع الصلاحيات ما عدا: حذف إجراء، حذف نتيجة، اعتماد النتائج، المخزون، إدارة المستخدمين
  lab_specialist: [
    'view_all',
    'view_reports',
    'use_search',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results'
  ],

  // ============================================
  // القسم البيطري
  // ============================================

  // مدير القسم البيطري - جميع الصلاحيات (حساب واحد)
  vet_manager: [
    'view_all',
    'edit_all',
    'manage_vet_users',
    'view_reports',
    'use_search',
    'delete_vet_procedure',
    'delete_shipment',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // مشرف مجموعة (بيطري) - جميع الصلاحيات ما عدا: إدارة المستخدمين
  vet_section_supervisor: [
    'view_all',
    'edit_all',
    'view_reports',
    'use_search',
    'delete_vet_procedure',
    'delete_shipment',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // طبيب بيطري - جميع الصلاحيات ما عدا: حذف إجراء، حذف إرسالية
  veterinarian: [
    'view_all',
    'edit_all',
    'view_reports',
    'use_search',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // مساعد طبيب بيطري - جميع الصلاحيات ما عدا: حذف إجراء، حذف إرسالية
  vet_assistant: [
    'view_all',
    'edit_all',
    'view_reports',
    'use_search',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // ============================================
  // قسم المستفيدين
  // ============================================

  // مشرف عام المحجر (نفس الحساب المشترك)
  general_supervisor: [
    'view_all',
    'edit_all',
    'manage_users',
    'manage_lab_users',
    'manage_vet_users',
    'view_reports',
    'use_search',
    'delete_lab_procedure',
    'delete_lab_result',
    'add_inventory_item',
    'edit_inventory_item',
    'delete_inventory_item',
    'withdraw_inventory_item',
    'approve_results',
    'add_lab_procedures',
    'add_lab_results',
    'edit_lab_results',
    'delete_vet_procedure',
    'delete_shipment',
    'add_vet_procedures',
    'edit_vet_procedures',
    'vet_full_access'
  ],

  // مستفيد - صلاحيات محدودة (الصفحة الرئيسية وتتبع الإرساليات فقط)
  beneficiary: [
    'view_shipment_tracking'
  ]
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnlineMode] = useState(true);

  useEffect(() => {
    console.log('useAuth initialized');

    // تهيئة المستخدمين الافتراضيين عند بدء التطبيق
    try {
      localDB.initializeDefaultUser();
      vetDB.initializeDefaultUser();
      console.log('Default users initialized');
    } catch (error) {
      console.error('Error initializing default users:', error);
    }

    // استعادة جلسة المستخدم من localStorage
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('Restored user from localStorage:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error loading saved user:', error);
      }
    }

    // الاستماع لإشارة إغلاق التطبيق من Electron
    if (window.electronAPI && typeof window.electronAPI.onBeforeQuit === 'function') {
      const handleBeforeQuit = () => {
        console.log('Application closing - signing out user');
        localStorage.removeItem('current_user');
        setUser(null);
      };

      window.electronAPI.onBeforeQuit(handleBeforeQuit);
    }
  }, []);

  const signIn = async (usernameOrEmail: string, password: string, userType: 'lab' | 'vet' | 'beneficiary') => {
    setLoading(true);
    try {
      let authenticatedUser = null;

      if (userType === 'beneficiary') {
        const user = await beneficiariesDB.authenticateUser(usernameOrEmail, password);
        if (user) {
          authenticatedUser = {
            id: user.id,
            name: user.full_name,
            username: user.email,
            email: user.email,
            role: user.role
          };
        }
      } else {
        // محاولة المصادقة من قاعدة البيانات المحددة أولاً
        if (userType === 'lab') {
          authenticatedUser = await localDB.authenticateUser(usernameOrEmail, password);
        } else if (userType === 'vet') {
          authenticatedUser = await vetDB.authenticateUser(usernameOrEmail, password);
        }

        // إذا لم تنجح، والحساب قد يكون حساب شامل، جرب القاعدة الأخرى
        if (!authenticatedUser) {
          if (userType === 'lab') {
            // جرب قاعدة البيانات البيطرية للحسابات الشاملة
            const vetUser = await vetDB.authenticateUser(usernameOrEmail, password);
            if (vetUser && (vetUser.role === 'program_manager' || vetUser.role === 'quarantine_general_supervisor')) {
              authenticatedUser = vetUser;
            }
          } else if (userType === 'vet') {
            // جرب قاعدة بيانات المختبر للحسابات الشاملة
            const labUser = await localDB.authenticateUser(usernameOrEmail, password);
            if (labUser && (labUser.role === 'program_manager' || labUser.role === 'quarantine_general_supervisor')) {
              authenticatedUser = labUser;

              // تحديث last_login في قاعدة البيانات البيطرية أيضاً للحسابات الشاملة
              await vetDB.updateUserLastLogin(labUser.username);
            }
          }
        }
      }

      if (!authenticatedUser) {
        throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعل');
      }

      const userData: User = {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        username: authenticatedUser.username,
        email: authenticatedUser.email || '',
        role: authenticatedUser.role,
        profile_image: authenticatedUser.profile_image || undefined,
        userType: userType
      };

      setUser(userData);
      localStorage.setItem('current_user', JSON.stringify(userData));
      toast.success(`مرحباً ${authenticatedUser.name}`);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'خطأ في تسجيل الدخول');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(action) || false;
  };

  return {
    user,
    signIn,
    signOut,
    loading,
    isOnlineMode,
    hasPermission
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
