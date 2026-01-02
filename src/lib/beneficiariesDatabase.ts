import toast from 'react-hot-toast';
import type { ElectronAPI } from '../types/electron';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const beneficiariesDB = {
  async getUsers() {
    if (window.electronAPI?.getBeneficiariesUsers) {
      try {
        return await window.electronAPI.getBeneficiariesUsers();
      } catch (error) {
        console.error('Error getting beneficiaries users from Electron:', error);
        toast.error('فشل في تحميل المستخدمين');
        return [];
      }
    }

    toast.error('قاعدة البيانات المحلية غير متاحة');
    return [];
  },

  async getUserById(id: string) {
    if (window.electronAPI?.getBeneficiariesUserById) {
      try {
        return await window.electronAPI.getBeneficiariesUserById(id);
      } catch (error) {
        console.error('Error getting beneficiaries user from Electron:', error);
        return null;
      }
    }

    console.error('قاعدة البيانات المحلية غير متاحة');
    return null;
  },

  async createUser(user: any) {
    if (window.electronAPI?.createBeneficiariesUser) {
      try {
        return await window.electronAPI.createBeneficiariesUser(user);
      } catch (error: any) {
        console.error('Error creating beneficiaries user in Electron:', error);
        throw error;
      }
    }

    throw new Error('قاعدة البيانات المحلية غير متاحة');
  },

  async updateUser(id: string, updates: any) {
    if (window.electronAPI?.updateBeneficiariesUser) {
      try {
        return await window.electronAPI.updateBeneficiariesUser(id, updates);
      } catch (error: any) {
        console.error('Error updating beneficiaries user in Electron:', error);
        throw error;
      }
    }

    throw new Error('قاعدة البيانات المحلية غير متاحة');
  },

  async deleteUser(id: string) {
    if (window.electronAPI?.deleteBeneficiariesUser) {
      try {
        await window.electronAPI.deleteBeneficiariesUser(id);
        return;
      } catch (error: any) {
        console.error('Error deleting beneficiaries user in Electron:', error);
        throw error;
      }
    }

    throw new Error('قاعدة البيانات المحلية غير متاحة');
  },

  async authenticateUser(email: string, password: string) {
    if (window.electronAPI?.authenticateBeneficiariesUser) {
      try {
        return await window.electronAPI.authenticateBeneficiariesUser(email, password);
      } catch (error) {
        console.error('Error authenticating beneficiaries user in Electron:', error);
        return null;
      }
    }

    console.error('قاعدة البيانات المحلية غير متاحة');
    return null;
  }
};
