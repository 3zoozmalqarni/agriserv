import { useState, useEffect } from 'react';
import { beneficiariesDB } from '../lib/beneficiariesDatabase';
import toast from 'react-hot-toast';

export interface BeneficiaryUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile_image?: string;
  last_login?: string;
}

export interface CreateBeneficiaryUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  profile_image?: string;
}

export interface UpdateBeneficiaryUserData {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  profile_image?: string | null;
}

export function useBeneficiariesUsers() {
  const [users, setUsers] = useState<BeneficiaryUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await beneficiariesDB.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching beneficiaries users:', error);
      toast.error('فشل في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async (userData: CreateBeneficiaryUserData) => {
    try {
      // Generate UUID in browser-compatible way
      const id = crypto.randomUUID();

      const newUser = {
        id,
        email: userData.email,
        password_hash: userData.password,
        full_name: userData.full_name,
        role: userData.role,
        profile_image: userData.profile_image || null,
      };

      const created = await beneficiariesDB.createUser(newUser);
      setUsers(prev => [created, ...prev]);
      toast.success('تم إضافة المستخدم بنجاح');
      return created;
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        toast.error('اسم المستخدم موجود بالفعل');
      } else {
        toast.error('فشل في إضافة المستخدم');
      }
      throw error;
    }
  };

  const updateUser = async (id: string, updates: UpdateBeneficiaryUserData) => {
    try {
      const updateData: any = {};

      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.profile_image !== undefined) updateData.profile_image = updates.profile_image;
      if (updates.password) updateData.password_hash = updates.password;

      const updated = await beneficiariesDB.updateUser(id, updateData);
      setUsers(prev => prev.map(user => user.id === id ? updated : user));
      toast.success('تم تحديث المستخدم بنجاح');
      return updated;
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        toast.error('اسم المستخدم موجود بالفعل');
      } else {
        toast.error('فشل في تحديث المستخدم');
      }
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await beneficiariesDB.deleteUser(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('فشل في حذف المستخدم');
      throw error;
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await beneficiariesDB.updateUser(id, {
        is_active: currentStatus ? 0 : 1
      });
      setUsers(prev => prev.map(user => user.id === id ? updated : user));
      toast.success(currentStatus ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('فشل في تغيير حالة المستخدم');
      throw error;
    }
  };

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    refreshUsers: fetchUsers,
  };
}
