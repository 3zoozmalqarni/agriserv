import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { localDB } from '../lib/localDatabase';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  password?: string;
  role: string;
  is_active: boolean;
  profile_image?: string | null;
  created_at: string;
  last_login: string | null;
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
  role: string;
  profile_image?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (): Promise<void> => {
    setLoading(true);
    try {
      const allUsers = await localDB.getUsers();
      const formattedUsers = allUsers.map(u => ({
        ...u,
        email: u.email || null,
        last_login: u.last_login || null,
        profile_image: u.profile_image || null,
      }));
      setUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: CreateUserData): Promise<User> => {
    try {
      const allUsers = await localDB.getUsers();

      // التحقق من عدم تكرار اسم المستخدم
      const existingUsername = allUsers.find(u => u.username === userData.username);
      if (existingUsername) {
        toast.error('اسم المستخدم موجود مسبقاً، الرجاء اختيار اسم آخر');
        throw new Error('Username already exists');
      }

      // التحقق من عدم وجود مدير برنامج مسبقاً
      if (userData.role === 'program_manager') {
        const existingProgramManager = allUsers.find(u => u.role === 'program_manager');
        if (existingProgramManager) {
          toast.error('لا يمكن إنشاء أكثر من حساب واحد لمدير البرنامج');
          throw new Error('Program manager already exists');
        }
      }

      const newUser = await localDB.createUser({
        name: userData.name,
        username: userData.username,
        email: null,
        password: userData.password,
        role: userData.role as any,
        is_active: true,
        profile_image: userData.profile_image || null,
        last_login: null,
      });

      await fetchUsers();
      toast.success('تم إضافة المستخدم بنجاح');
      return newUser;
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة المستخدم');
      throw error;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    try {
      const allUsers = await localDB.getUsers();

      // التحقق من عدم تكرار اسم المستخدم عند التعديل
      if (updates.username) {
        const existingUsername = allUsers.find(u => u.username === updates.username && u.id !== id);
        if (existingUsername) {
          toast.error('اسم المستخدم موجود مسبقاً، الرجاء اختيار اسم آخر');
          throw new Error('Username already exists');
        }
      }

      // التحقق عند تغيير الدور إلى مدير برنامج
      if (updates.role === 'program_manager') {
        const existingProgramManager = allUsers.find(u => u.role === 'program_manager' && u.id !== id);
        if (existingProgramManager) {
          toast.error('لا يمكن إنشاء أكثر من حساب واحد لمدير البرنامج');
          throw new Error('Program manager already exists');
        }
      }

      const updateData: any = { ...updates };
      delete updateData.id;
      delete updateData.created_at;

      if (updateData.password === '') {
        delete updateData.password;
      }

      await localDB.updateUser(id, updateData);
      await fetchUsers();
      toast.success('تم تحديث المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث المستخدم');
      throw error;
    }
  };

  const deleteUser = async (id: string): Promise<void> => {
    try {
      // التحقق من عدم حذف مدير البرنامج
      const allUsers = await localDB.getUsers();
      const userToDelete = allUsers.find(u => u.id === id);
      if (userToDelete?.role === 'program_manager') {
        toast.error('لا يمكن حذف حساب مدير البرنامج');
        throw new Error('Cannot delete program manager');
      }

      const success = await localDB.deleteUser(id);
      if (!success) {
        throw new Error('لم يتم العثور على المستخدم');
      }

      await fetchUsers();
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف المستخدم');
      throw error;
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      // التحقق من عدم تعطيل مدير البرنامج
      const allUsers = await localDB.getUsers();
      const userToToggle = allUsers.find(u => u.id === id);
      if (userToToggle?.role === 'program_manager' && currentStatus === true) {
        toast.error('لا يمكن تعطيل حساب مدير البرنامج');
        throw new Error('Cannot deactivate program manager');
      }

      await localDB.updateUser(id, { is_active: !currentStatus });
      await fetchUsers();
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم`);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث حالة المستخدم');
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
}
