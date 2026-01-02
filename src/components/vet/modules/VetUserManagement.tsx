import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, CreditCard as Edit, Trash2, Shield, Eye, EyeOff, Upload, X } from 'lucide-react';
import { vetDB, VetUser } from '../../../lib/vetDatabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import PageHeader from '../../shared/PageHeader';

const userSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').or(z.literal('')),
  role: z.enum(['program_manager', 'quarantine_general_supervisor', 'vet_manager', 'vet_section_supervisor', 'veterinarian', 'vet_assistant']),
});

type UserForm = z.infer<typeof userSchema>;

const roleLabels = {
  program_manager: 'مدير البرنامج',
  quarantine_general_supervisor: 'مشرف عام المحجر',
  vet_manager: 'مدير القسم البيطري',
  vet_section_supervisor: 'مشرف مجموعة',
  veterinarian: 'طبيب بيطري',
  vet_assistant: 'مساعد طبيب بيطري',
};

const rolePermissions = {
  program_manager: [],
  quarantine_general_supervisor: [],
  vet_manager: [],
  vet_section_supervisor: [],
  veterinarian: [],
  vet_assistant: [],
};

export default function VetUserManagement() {
  const [users, setUsers] = useState<VetUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<VetUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; userId: string | null }>({ show: false, userId: null });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      role: 'vet_assistant',
    },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await vetDB.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('حدث خطأ في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: UserForm) => {
    try {
      // التحقق من عدم تكرار اسم المستخدم
      const existingUsername = users.find(u =>
        u.username === data.username && (!editingUser || u.id !== editingUser.id)
      );
      if (existingUsername) {
        toast.error('اسم المستخدم موجود مسبقاً، الرجاء اختيار اسم آخر');
        return;
      }

      if (editingUser) {
        const updates: Partial<VetUser> = {
          name: data.name,
          username: data.username,
          role: data.role,
        };

        if (data.password) {
          updates.password = data.password;
        }

        if (profileImage) {
          updates.profile_image = profileImage;
        }

        await vetDB.updateUser(editingUser.id, updates);
      } else {
        await vetDB.addUser({
          name: data.name,
          username: data.username,
          password: data.password,
          role: data.role,
          email: null,
          profile_image: profileImage,
          is_active: true,
          last_login: null,
        });
      }

      setShowAddForm(false);
      setEditingUser(null);
      setProfileImage(null);
      reset();
      loadUsers();

      // التمرير إلى أعلى الصفحة
      setTimeout(() => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      // عرض modal النجاح
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('حدث خطأ في حفظ المستخدم');
    }
  };

  const handleEdit = (user: VetUser) => {
    setEditingUser(user);
    setShowAddForm(true);
    setProfileImage(user.profile_image);
    reset({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
    });
  };

  const handleDeleteClick = (userId: string) => {
    const user = users.find(u => u.id === userId);
    // منع حذف حسابات مدير البرنامج ومشرف عام المحجر
    if (user && (user.role === 'program_manager' || user.role === 'quarantine_general_supervisor')) {
      toast.error('لا يمكن حذف هذا الحساب - حساب محمي');
      return;
    }
    setDeleteConfirm({ show: true, userId });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.userId) {
      try {
        await vetDB.deleteUser(deleteConfirm.userId);
        toast.success('تم حذف المستخدم بنجاح');
        setDeleteConfirm({ show: false, userId: null });
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('حدث خطأ في حذف المستخدم');
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, userId: null });
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await vetDB.toggleUserStatus(userId);
      toast.success('تم تغيير حالة المستخدم');
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('حدث خطأ في تغيير حالة المستخدم');
    }
  };

  if (showAddForm || editingUser) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingUser(null);
                setProfileImage(null);
                setShowPassword(false);
                reset({
                  name: '',
                  username: '',
                  password: '',
                  role: 'vet_assistant',
                });
              }}
              className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
            >
              إلغاء
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-gray-300">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-secondary-600 text-white p-2 rounded-full hover:bg-secondary-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {profileImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage(null)}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                placeholder="اكتب الاسم الكامل"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم <span className="text-red-500">*</span>
              </label>
              <input
                {...register('username')}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                placeholder="اكتب اسم المستخدم"
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور {editingUser ? '(اتركه فارغاً إذا لم ترد التغيير)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right pr-12"
                  placeholder={editingUser ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : 'اكتب كلمة المرور'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصلاحية <span className="text-red-500">*</span>
              </label>
              <select
                {...register('role')}
                className="w-full px-3 h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
              >
                <option value="">اختر الصلاحية</option>
                {/* إخفاء الأدوار التي تم استخدامها (حساب واحد فقط) */}
                {(!users.some(u => u.role === 'program_manager') || (editingUser && editingUser.role === 'program_manager')) && (
                  <option value="program_manager">مدير البرنامج</option>
                )}
                {(!users.some(u => u.role === 'quarantine_general_supervisor') || (editingUser && editingUser.role === 'quarantine_general_supervisor')) && (
                  <option value="quarantine_general_supervisor">مشرف عام المحجر</option>
                )}
                {(!users.some(u => u.role === 'vet_manager') || (editingUser && editingUser.role === 'vet_manager')) && (
                  <option value="vet_manager">مدير القسم البيطري</option>
                )}
                <option value="vet_section_supervisor">مشرف مجموعة</option>
                <option value="veterinarian">طبيب بيطري</option>
                <option value="vet_assistant">مساعد طبيب بيطري</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>

            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="bg-secondary-600 text-white px-8 py-3 rounded-lg hover:bg-secondary-700 flex items-center gap-2 text-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Users}
            title="إدارة المستخدمين"
            subtitle="إدارة حسابات وصلاحيات مستخدمي المحجر"
          />

          <div className="flex items-center justify-end mb-6 mt-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-secondary-600 text-white px-4 py-2 rounded-lg hover:bg-secondary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">جاري التحميل...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            لا توجد مستخدمين. انقر على "إضافة مستخدم" للبدء.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#61bf69]/20 border-b-2 border-[#61bf69]/40">
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الحالة</th>
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">آخر دخول</th>
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">تاريخ الإنشاء</th>
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الصلاحية</th>
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الاسم</th>
                  <th className="px-3 py-4 text-center font-bold text-[#003361] text-sm whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-100 hover:bg-[#61bf69]/5 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('en-GB') : 'لم يسجل دخول'}
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-gray-700">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-secondary-100 text-secondary-800">
                          {roleLabels[user.role as keyof typeof roleLabels]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {user.profile_image ? (
                            <img
                              src={user.profile_image}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Users className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-[#61bf69] hover:text-white hover:bg-[#61bf69] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                            user.is_active
                              ? 'text-orange-600 hover:text-white hover:bg-orange-600'
                              : 'text-green-600 hover:text-white hover:bg-green-600'
                          }`}
                          title={user.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {user.id !== auth?.user?.id && (
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-md border-2 border-amber-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-bold text-gray-900">الصلاحيات والمسؤوليات</h3>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="bg-white rounded-lg px-4 py-2 border border-gray-200 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                  {label}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600">هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-8 text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">تم الحفظ بنجاح</h3>
              <p className="text-gray-600 mb-6 text-lg">
                تم حفظ بيانات المستخدم بنجاح
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-[#61bf69] text-white py-3 rounded-lg hover:bg-[#50a857] transition-colors font-bold text-lg shadow-md"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
