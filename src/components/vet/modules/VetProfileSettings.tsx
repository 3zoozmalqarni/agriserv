import { useState } from 'react';
import { User, Lock, Image, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { vetDB } from '../../../lib/vetDatabase';
import toast from 'react-hot-toast';

export default function VetProfileSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'password' | 'image'>('password');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      const users = await vetDB.getUsers();
      const currentUser = users.find(u => u.id === user.id);

      if (!currentUser) {
        toast.error('المستخدم غير موجود');
        return;
      }

      if (currentUser.password !== oldPassword) {
        toast.error('كلمة المرور القديمة غير صحيحة');
        return;
      }

      if (newPassword.length < 6) {
        toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('كلمة المرور الجديدة غير متطابقة');
        return;
      }

      await vetDB.updateUser(user.id, { password: newPassword });

      const savedUser = localStorage.getItem('current_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.password = newPassword;
        localStorage.setItem('current_user', JSON.stringify(userData));
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSave = async () => {
    if (!selectedImage) {
      toast.error('يرجى اختيار صورة أولاً');
      return;
    }

    setIsUploadingImage(true);

    try {
      await vetDB.updateUser(user.id, { profile_image: selectedImage });

      const savedUser = localStorage.getItem('current_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.profile_image = selectedImage;
        localStorage.setItem('current_user', JSON.stringify(userData));
      }

      toast.success('تم تحديث الصورة الشخصية بنجاح');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('حدث خطأ أثناء تحديث الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageRemove = async () => {
    setIsUploadingImage(true);

    try {
      await vetDB.updateUser(user.id, { profile_image: null });

      const savedUser = localStorage.getItem('current_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.profile_image = null;
        localStorage.setItem('current_user', JSON.stringify(userData));
      }

      setSelectedImage(null);
      toast.success('تم إزالة الصورة الشخصية بنجاح');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('حدث خطأ أثناء إزالة الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#61bf69] to-[#4fa856] px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <User className="w-7 h-7" />
              إعدادات الملف الشخصي
            </h2>
            <p className="text-white/90 mt-2">قم بتحديث معلومات حسابك الشخصية</p>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'password'
                    ? 'bg-white text-[#61bf69] border-b-3 border-[#61bf69]'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Lock className="w-5 h-5 inline-block ml-2" />
                تغيير كلمة المرور
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'image'
                    ? 'bg-white text-[#61bf69] border-b-3 border-[#61bf69]'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Image className="w-5 h-5 inline-block ml-2" />
                الصورة الشخصية
              </button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">كلمة المرور الحالية</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                      placeholder="أدخل كلمة المرور الحالية"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                      placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent text-right"
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-gradient-to-r from-[#61bf69] to-[#4fa856] text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      حفظ كلمة المرور الجديدة
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'image' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    {selectedImage || user.profile_image ? (
                      <img
                        src={selectedImage || user.profile_image}
                        alt="صورة شخصية"
                        className="w-40 h-40 rounded-full object-cover border-4 border-[#61bf69] shadow-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-gray-300">
                        <User className="w-20 h-20 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-md space-y-4">
                    <label className="block">
                      <div className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg cursor-pointer text-center transition-all border-2 border-dashed border-gray-300 hover:border-[#61bf69]">
                        <Image className="w-6 h-6 inline-block ml-2" />
                        اختر صورة جديدة
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {selectedImage && (
                      <div className="flex gap-3">
                        <button
                          onClick={handleImageSave}
                          disabled={isUploadingImage}
                          className="flex-1 bg-gradient-to-r from-[#61bf69] to-[#4fa856] text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isUploadingImage ? (
                            <>
                              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                              جاري الحفظ...
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5" />
                              حفظ الصورة
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {user.profile_image && !selectedImage && (
                      <button
                        onClick={handleImageRemove}
                        disabled={isUploadingImage}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isUploadingImage ? (
                          <>
                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الإزالة...
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5" />
                            إزالة الصورة الحالية
                          </>
                        )}
                      </button>
                    )}

                    <p className="text-sm text-gray-500 text-center">
                      الحد الأقصى لحجم الملف: 5 ميجابايت
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
