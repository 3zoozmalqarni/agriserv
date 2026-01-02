// قاعدة بيانات محلية باستخدام localStorage (للمتصفح) أو Electron API (للتطبيق)

import type { ElectronAPI } from '../types/electron';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// مفتاح localStorage الرئيسي
const STORAGE_KEY = 'agriserv_lab_db';

// واجهة قاعدة البيانات المحلية
interface LocalDBData {
  saved_samples: SavedSample[];
  samples: Sample[];
  test_results: TestResult[];
  inventory_items: InventoryItem[];
  inventory_transactions: InventoryTransaction[];
  users: User[];
  notifications: Notification[];
}

// دالة للحصول على البيانات من localStorage
function getLocalData(): LocalDBData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }

  // البيانات الافتراضية
  const defaultData: LocalDBData = {
    saved_samples: [],
    samples: [],
    test_results: [],
    inventory_items: [],
    inventory_transactions: [],
    users: [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'admin123',
        name: 'مدير البرنامج',
        email: null,
        role: 'program_manager',
        is_active: true,
        profile_image: null,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        username: 'admin1',
        password: '123456',
        name: 'مشرف عام المحجر',
        email: null,
        role: 'quarantine_general_supervisor',
        is_active: true,
        profile_image: null,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    notifications: []
  };

  saveLocalData(defaultData);
  return defaultData;
}

// دالة لحفظ البيانات في localStorage
function saveLocalData(data: LocalDBData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

export interface SavedSample {
  id: string;
  client_name: string;
  reception_date: string;
  internal_procedure_number: string;
  external_procedure_number: string | null;
  external_procedure_date: string | null;
  vet_procedure_id: string | null; // معرف فريد للإجراء البيطري
  country_port: string | null;
  sample_origin: string | null;
  civil_record: string | null;
  receiver_name: string;
  quality_check: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // حقول تتبع مدة الفحص
  completion_timestamps?: string[]; // مصفوفة تحتوي على تواريخ/أوقات كل مرة أصبح فيها الإجراء مكتملاً
  total_completion_duration_ms?: number; // إجمالي الوقت المستغرق بالميلي ثانية
}

export interface Sample {
  id: string;
  saved_sample_id: string;
  sample_number: string;
  department: string;
  requested_test: string;
  sample_type: string;
  animal_type: string;
  sample_count: number;
  notes: string | null;
  created_at: string;
}

export interface TestResult {
  id: string;
  sample_id: string;
  test_date: string;
  test_method: string;
  test_result: string;
  positive_samples: number;
  is_vaccination_efficiency_test?: boolean;
  vaccination_efficiency_percentage?: string;
  specialists: string[];
  confirmatory_test: any | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  status?: string;
  approval_date?: string;
  confirmed_positive_samples?: number; // عدد العينات الإيجابية بعد التأكيد
  confirmatory_test_method?: string; // طريقة الاختبار التأكيدي
}

export interface InventoryItem {
  id: string;
  name: string;
  item_name?: string;
  quantity: number;
  minimum_quantity?: number;
  type: 'diagnostic' | 'tools';
  category?: string;
  unit: 'carton' | 'bag' | 'box';
  size?: string;
  section: 'bacteriology' | 'Virology' | 'parasitology' | 'poultry' | 'Molecular biology';
  location?: string;
  entry_date: string;
  expiry_date?: string;
  serial_number?: string;
  batch_number?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  quantity: number;
  type: 'addition' | 'withdrawal';
  specialist_name?: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  password: string;
  role: 'program_manager' | 'quarantine_general_supervisor' | 'lab_manager' | 'lab_section_supervisor' | 'lab_specialist';
  is_active: boolean;
  profile_image?: string | null;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'error';
  read: boolean;
  created_at: string;
}

class LocalDatabase {
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  private async callElectronAPI(method: string, ...args: any[]): Promise<any> {
    if (this.isElectron() && window.electronAPI) {
      const api = window.electronAPI as any;
      if (api[method]) {
      try {
        return await api[method](...args);
      } catch (error) {
        console.warn('Electron API call failed, falling back to localStorage:', error);
        return null;
      }
    }
    return null;
  }
    // إذا لم تكن Electron API متاحة، نستخدم localStorage
    return null;
  }

  // Saved Samples
  async getSavedSamples(): Promise<SavedSample[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getSavedSamples');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.saved_samples.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createSavedSample(sample: Omit<SavedSample, 'id' | 'created_at' | 'updated_at'>): Promise<SavedSample> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createSavedSample', sample);
      if (result !== null) {
        return result;
      }
    }

    const data = getLocalData();
    const newSample: SavedSample = {
      ...sample,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.saved_samples.push(newSample);
    saveLocalData(data);

    return newSample;
  }

  async updateSavedSample(id: string, updates: Partial<SavedSample>): Promise<SavedSample | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateSavedSample', id, updates);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const index = data.saved_samples.findIndex(s => s.id === id);
    if (index === -1) return null;

    data.saved_samples[index] = {
      ...data.saved_samples[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalData(data);
    return data.saved_samples[index];
  }

  async deleteSavedSample(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteSavedSample', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.saved_samples.length;

    // الحصول على جميع العينات المرتبطة بالإجراء
    const sampleIds = data.samples
      .filter(s => s.saved_sample_id === id)
      .map(s => s.id);

    // حذف الإجراء
    data.saved_samples = data.saved_samples.filter(s => s.id !== id);

    // حذف العينات المرتبطة
    data.samples = data.samples.filter(s => s.saved_sample_id !== id);

    // حذف النتائج المرتبطة بالعينات
    data.test_results = data.test_results.filter(r => !sampleIds.includes(r.sample_id));

    saveLocalData(data);
    return data.saved_samples.length < initialLength;
  }

  async getNextProcedureNumber(): Promise<string> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getNextProcedureNumber');
      if (result !== null) return result;
    }

    const data = getLocalData();
    const currentYear = new Date().getFullYear();

    // البحث عن أرقام الإجراءات للسنة الحالية
    const currentYearProcedures = data.saved_samples.filter(sample => {
      const match = sample.internal_procedure_number.match(/^(\d{4})-(\d{4})-L$/);
      if (match) {
        const [, _number, year] = match;
        return parseInt(year) === currentYear;
      }
      return false;
    });

    // إيجاد أكبر رقم
    let maxNumber = 0;
    currentYearProcedures.forEach(sample => {
      const match = sample.internal_procedure_number.match(/^(\d{4})-(\d{4})-L$/);
      if (match) {
        const number = parseInt(match[1]);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    // الرقم التالي
    const nextNumber = maxNumber + 1;
    return `${nextNumber.toString().padStart(4, '0')}-${currentYear}-L`;
  }

  // Samples
  async getSamples(): Promise<Sample[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getSamples');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.samples.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getSampleById(id: string): Promise<Sample | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getSampleById', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.samples.find(s => s.id === id) || null;
  }

  async createSample(sample: Omit<Sample, 'id' | 'created_at'>): Promise<Sample> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createSample', sample);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const newSample: Sample = {
      ...sample,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    data.samples.push(newSample);
    saveLocalData(data);
    return newSample;
  }

  async updateSample(id: string, updates: Partial<Sample>, deleteResults: boolean = true): Promise<Sample | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateSample', id, updates, deleteResults);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const index = data.samples.findIndex(s => s.id === id);
    if (index === -1) return null;

    const oldSample = data.samples[index];

    // التحقق من وجود تغييرات في بيانات العينة الأساسية
    const hasChanges =
      (updates.department && updates.department !== oldSample.department) ||
      (updates.requested_test && updates.requested_test !== oldSample.requested_test) ||
      (updates.sample_type && updates.sample_type !== oldSample.sample_type) ||
      (updates.animal_type && updates.animal_type !== oldSample.animal_type);

    data.samples[index] = {
      ...data.samples[index],
      ...updates
    };

    // حذف النتائج فقط إذا تغيرت بيانات العينة الأساسية
    if (deleteResults && hasChanges) {
      data.test_results = data.test_results.filter(t => t.sample_id !== id);
    }

    saveLocalData(data);
    return data.samples[index];
  }

  async deleteSample(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteSample', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.samples.length;
    data.samples = data.samples.filter(s => s.id !== id);
    data.test_results = data.test_results.filter(t => t.sample_id !== id);
    saveLocalData(data);
    return data.samples.length < initialLength;
  }

  // Test Results
  async getTestResults(): Promise<TestResult[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getTestResults');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.test_results.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createTestResult(result: Omit<TestResult, 'id' | 'created_at'>): Promise<TestResult> {
    if (this.isElectron()) {
      const electronResult = await this.callElectronAPI('createTestResult', result);
      if (electronResult !== null) {
        // تحديث تتبع التقدم
        await this.updateProgressForTestResult(electronResult);
        return electronResult;
      }
    }

    const data = getLocalData();
    const newResult: TestResult = {
      ...result,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      approval_status: result.approval_status || 'draft'
    };
    data.test_results.push(newResult);
    saveLocalData(data);

    // تحديث تتبع التقدم
    await this.updateProgressForTestResult(newResult);

    return newResult;
  }

  // تحديث تتبع التقدم بناءً على النتائج
  private async updateProgressForTestResult(result: TestResult): Promise<void> {
    try {
      const data = getLocalData();
      const sample = data.samples.find(s => s.id === result.sample_id);
      if (!sample) return;

    } catch (error) {
      console.error('Error updating progress for test result:', error);
    }
  }

  async updateTestResult(id: string, updates: Partial<TestResult>): Promise<TestResult | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateTestResult', id, updates);
      if (result !== null) {
        return result;
      }
    }

    const data = getLocalData();
    const index = data.test_results.findIndex(r => r.id === id);
    if (index === -1) return null;

    data.test_results[index] = {
      ...data.test_results[index],
      ...updates
    };
    saveLocalData(data);

    return data.test_results[index];
  }

  async deleteTestResult(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteTestResult', id);
      if (result !== null) {
        // إطلاق حدث تحديث البيانات للواجهة
        window.dispatchEvent(new Event('procedures-data-changed'));
        console.log('🔄 تم إطلاق حدث تحديث البيانات بعد حذف النتيجة');
        return result;
      }
    }

    const data = getLocalData();

    // الحصول على النتيجة قبل حذفها لمعرفة رقم الإجراء
    const resultToDelete = data.test_results.find(r => r.id === id);
    if (!resultToDelete) return false;

    // الحصول على معلومات العينة والإجراء
    const sample = data.samples.find(s => s.id === resultToDelete.sample_id);
    if (sample) {
      const savedSample = data.saved_samples.find(ss => ss.id === sample.saved_sample_id);

      // حذف النتيجة
      const initialLength = data.test_results.length;
      data.test_results = data.test_results.filter(r => r.id !== id);
      saveLocalData(data);

      // إذا كان الإجراء من المحجر، تحديث حالة المراحل
      if (savedSample?.external_procedure_number?.endsWith('-Q')) {
        // استيراد vetDatabase لتحديث المراحل
        try {
          const vetData = localStorage.getItem('agriserv_vet_db');
          if (vetData) {
            const vetDatabase = JSON.parse(vetData);
            const procedureIndex = vetDatabase.procedures?.findIndex(
              (p: any) => p.procedure_number === savedSample.external_procedure_number
            );

            if (procedureIndex !== -1 && vetDatabase.procedures) {
              // إرجاع حالة الفحص و إجراءات الفسح إلى "قيد الإجراء"
              vetDatabase.procedures[procedureIndex] = {
                ...vetDatabase.procedures[procedureIndex],
                stage_status: {
                  transaction_received: 'completed',
                  inspection_sampling: 'completed',
                  samples_delivered: 'completed',
                  testing: 'in_progress',
                  clearance_procedures: 'in_progress'
                },
                updated_at: new Date().toISOString(),
              };

              localStorage.setItem('agriserv_vet_db', JSON.stringify(vetDatabase));

              // إطلاق حدث تحديث البيانات
              window.dispatchEvent(new Event('procedures-data-changed'));
            }
          }
        } catch (error) {
          console.error('Error updating stage status on result deletion:', error);
        }
      }

      return data.test_results.length < initialLength;
    }

    return false;
  }

  // Inventory Items
  async getInventoryItems(): Promise<InventoryItem[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getInventoryItems');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.inventory_items.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createInventoryItem', item);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const newItem: InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.inventory_items.push(newItem);
    saveLocalData(data);
    return newItem;
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateInventoryItem', id, updates);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const index = data.inventory_items.findIndex(i => i.id === id);
    if (index === -1) return null;

    data.inventory_items[index] = {
      ...data.inventory_items[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalData(data);
    return data.inventory_items[index];
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteInventoryItem', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.inventory_items.length;
    data.inventory_items = data.inventory_items.filter(i => i.id !== id);
    data.inventory_transactions = data.inventory_transactions.filter(t => t.item_id !== id);
    saveLocalData(data);
    return data.inventory_items.length < initialLength;
  }

  // Inventory Transactions
  async getInventoryTransactions(): Promise<InventoryTransaction[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getInventoryTransactions');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.inventory_transactions.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createInventoryTransaction(transaction: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<InventoryTransaction> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createInventoryTransaction', transaction);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const newTransaction: InventoryTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    data.inventory_transactions.push(newTransaction);
    saveLocalData(data);
    return newTransaction;
  }

  async deleteInventoryTransaction(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteInventoryTransaction', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.inventory_transactions.length;
    data.inventory_transactions = data.inventory_transactions.filter(t => t.id !== id);
    saveLocalData(data);
    return data.inventory_transactions.length < initialLength;
  }

  // Helper methods
  async getSavedSampleWithSamples(savedSampleId: string): Promise<(SavedSample & { samples: Sample[] }) | null> {
    const savedSamples = await this.getSavedSamples();
    const savedSample = savedSamples.find(s => s.id === savedSampleId);
    if (!savedSample) return null;

    const samples = await this.getSamples();
    const samplesList = samples.filter(s => s.saved_sample_id === savedSampleId);
    return { ...savedSample, samples: samplesList };
  }

  async getAllSavedSamplesWithSamples(): Promise<(SavedSample & { samples: Sample[] })[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getAllSavedSamplesWithSamples');
      if (result !== null) return result;
    }

    const savedSamples = await this.getSavedSamples();
    const samples = await this.getSamples();

    const proceduresWithSamples = savedSamples.map(savedSample => ({
      ...savedSample,
      samples: samples.filter(s => s.saved_sample_id === savedSample.id)
    }));

    // ترتيب عكسي حسب رقم الإجراء (الأحدث في الأعلى)
    return proceduresWithSamples.sort((a, b) => {
      const numA = parseInt(a.internal_procedure_number.split('-')[0]) || 0;
      const numB = parseInt(b.internal_procedure_number.split('-')[0]) || 0;
      return numB - numA; // ترتيب تنازلي
    });
  }

  async getTestResultsWithSampleInfo(): Promise<any[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getTestResultsWithSampleInfo');
      if (result !== null) return result;
    }

    const testResults = await this.getTestResults();
    const samples = await this.getSamples();
    const savedSamples = await this.getSavedSamples();

    const resultsWithInfo = testResults.map(result => {
      const sample = samples.find(s => s.id === result.sample_id);
      const savedSample = sample ? savedSamples.find(ss => ss.id === sample.saved_sample_id) : null;

      return {
        ...result,
        sample_number: sample?.sample_number || 'غير معروف',
        department: sample?.department || 'غير معروف',
        client_name: savedSample?.client_name || 'غير معروف',
        reception_date: savedSample?.reception_date || null,
        internal_procedure_number: savedSample?.internal_procedure_number || null
      };
    });

    // ترتيب عكسي حسب رقم الإجراء (الأحدث في الأعلى)
    return resultsWithInfo.sort((a, b) => {
      if (!a.internal_procedure_number) return 1;
      if (!b.internal_procedure_number) return -1;
      const numA = parseInt(a.internal_procedure_number.split('-')[0]) || 0;
      const numB = parseInt(b.internal_procedure_number.split('-')[0]) || 0;
      return numB - numA; // ترتيب تنازلي
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getUsers');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.users.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createUser', user);
      if (result !== null) return result;
    }

    const data = getLocalData();

    // تحقق من عدم وجود نفس اسم المستخدم
    if (data.users.some(u => u.username === user.username)) {
      throw new Error('اسم المستخدم موجود بالفعل');
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.users.push(newUser);
    saveLocalData(data);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateUser', id, updates);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    data.users[index] = {
      ...data.users[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalData(data);
    return data.users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteUser', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.users.length;
    data.users = data.users.filter(u => u.id !== id);
    saveLocalData(data);
    return data.users.length < initialLength;
  }

  async validateLogin(username: string, password: string): Promise<User | null> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('validateLogin', username, password);
      if (result !== null) return result;
    }

    const users = await this.getUsers();
    const user = users.find(u => u.username === username && u.password === password && u.is_active);

    if (user) {
      await this.updateUser(user.id, { last_login: new Date().toISOString() });
    }

    return user || null;
  }

  // نفس validateLogin لكن باسم مختلف
  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    return await this.validateLogin(usernameOrEmail, password);
  }

  // تهيئة المستخدمين الافتراضيين
  initializeDefaultUser(): void {
    if (this.isElectron()) {
      return; // Electron يديره بنفسه
    }

    const data = getLocalData();

    // التأكد من وجود مدير البرنامج
    if (!data.users.some(u => u.username === 'admin')) {
      data.users.push({
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'admin123',
        name: 'مدير البرنامج',
        email: null,
        role: 'program_manager',
        is_active: true,
        profile_image: null,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // التأكد من وجود مشرف عام المحجر
    if (!data.users.some(u => u.username === 'admin1')) {
      data.users.push({
        id: crypto.randomUUID(),
        username: 'admin1',
        password: '123456',
        name: 'مشرف عام المحجر',
        email: null,
        role: 'quarantine_general_supervisor',
        is_active: true,
        profile_image: null,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    saveLocalData(data);
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getNotifications');
      if (result !== null) return result;
    }

    const data = getLocalData();
    return data.notifications.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createNotification', notification);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString()
    };
    data.notifications.push(newNotification);
    saveLocalData(data);
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('markNotificationAsRead', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const notification = data.notifications.find(n => n.id === id);
    if (!notification) return false;

    notification.read = true;
    saveLocalData(data);
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('deleteNotification', id);
      if (result !== null) return result;
    }

    const data = getLocalData();
    const initialLength = data.notifications.length;
    data.notifications = data.notifications.filter(n => n.id !== id);
    saveLocalData(data);
    return data.notifications.length < initialLength;
  }

  async clearAllNotifications(): Promise<boolean> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('clearAllNotifications');
      if (result !== null) return result;
    }

    const data = getLocalData();
    data.notifications = [];
    saveLocalData(data);
    return true;
  }

  async cleanupOrphanedResults(): Promise<number> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('cleanupOrphanedResults');
      if (result !== null) return result;
    }

    const data = getLocalData();
    const validSampleIds = new Set(data.samples.map(s => s.id));
    const initialLength = data.test_results.length;

    data.test_results = data.test_results.filter(r => validSampleIds.has(r.sample_id));

    const deletedCount = initialLength - data.test_results.length;
    if (deletedCount > 0) {
      saveLocalData(data);
    }

    return deletedCount;
  }
}

export const localDB = new LocalDatabase();
