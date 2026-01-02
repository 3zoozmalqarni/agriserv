// قاعدة بيانات محلية منفصلة لنظام المحجر
import type { ElectronAPI } from '../types/electron';
import { createAlertForNew } from './vetAlerts';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// مفتاح localStorage المنفصل لبيانات المحجر
const VET_STORAGE_KEY = 'agriserv_vet_db';

// واجهة قاعدة بيانات المحجر
interface VetDBData {
  users: VetUser[];
  procedures: VetProcedure[];
  testResults: VetTestResult[];
  animalShipments: AnimalShipment[];
}

export type StageStatus = 'pending' | 'in_progress' | 'completed';

export interface StageTimings {
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
}

export interface ProcedureStageStatus {
  transaction_received?: StageStatus;
  inspection_sampling?: StageStatus;
  samples_delivered?: StageStatus;
  testing?: StageStatus;
  clearance_procedures?: StageStatus;
}

export interface ProcedureStageTimings {
  transaction_received?: StageTimings;
  inspection_sampling?: StageTimings;
  samples_delivered?: StageTimings;
  testing?: StageTimings;
  clearance_procedures?: StageTimings;
}

export interface AnimalShipment {
  id: string;
  procedure_number: string;
  procedure_date?: string;
  client_name?: string;
  animal_count?: number;
  shipment_date?: string;
  transport_method: string;
  origin_country: string;
  importer_name: string;
  arrival_time: string;
  animals: any[];
  temperature_status: string;
  temperature_details: string;
  disease_symptoms: string;
  disease_symptoms_details: string;
  skeleton_symptoms: string;
  skeleton_symptoms_details: string;
  skin_symptoms: string;
  skin_symptoms_details: string;
  anatomical_features: string;
  anatomical_features_details: string;
  general_diagnosis: string;
  final_action: string;
  final_decision: string;
  doctors: string[];
  attachments?: any[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VetTestResult {
  id: string;
  procedure_number: string;
  sample_number: string;
  test_type: string;
  positive_samples: number;
  result: string;
  created_at: string;
  updated_at: string;
  confirmed_positive_samples?: number;
  confirmatory_test_method?: string;
}

export interface VetProcedure {
  id: string;
  procedure_number: string;
  client_name: string;
  reception_date: string;
  procedure_date?: string;
  country_port: string;
  receiver_name: string;
  sampling_doctors: string[];
  sample_groups: SampleGroup[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_new?: boolean;
  stage_status?: ProcedureStageStatus;
  stage_timings?: ProcedureStageTimings;
}

export interface SampleGroup {
  id: string;
  animal_type: string;
  animal_gender: string;
  sample_count: number;
  samples: VetSample[];
}

export interface VetSample {
  id: string;
  sample_number: string;
  required_test: string;
  sample_type: string;
}

export interface VetUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  password: string;
  role: 'program_manager' | 'quarantine_general_supervisor' | 'vet_manager' | 'vet_section_supervisor' | 'veterinarian' | 'vet_assistant';
  is_active: boolean;
  profile_image: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

// دالة للحصول على البيانات من localStorage
function getVetData(): VetDBData {
  try {
    const data = localStorage.getItem(VET_STORAGE_KEY);

    if (data) {
      const parsedData = JSON.parse(data);

      // التأكد من وجود حقل testResults (للتوافق مع البيانات القديمة)
      if (!parsedData.testResults) {
        parsedData.testResults = [];
        saveVetData(parsedData);
      }

      // التأكد من وجود حقل animalShipments (للتوافق مع البيانات القديمة)
      if (!parsedData.animalShipments) {
        parsedData.animalShipments = [];
        saveVetData(parsedData);
      }

      return parsedData;
    }
  } catch (error) {
    console.error('Error reading vet data:', error);
  }

  // البيانات الافتراضية للمحجر
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];

  const defaultData: VetDBData = {
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
    procedures: [
      {
        id: crypto.randomUUID(),
        procedure_number: `0001-${currentYear}-Q`,
        client_name: 'شركة التجارة الدولية',
        reception_date: today,
        country_port: 'البرازيل',
        receiver_name: 'فحص الحيوانات',
        sample_groups: [
          {
            id: crypto.randomUUID(),
            animal_type: 'أبقار',
            sample_type: 'دم',
            sample_count: 5,
            requested_tests: ['الحمى المالطية (البروسيلا)', 'الحمى القلاعية (FMD)'],
            notes: 'إجراء تجريبي للاختبار'
          }
        ],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    testResults: [],
    animalShipments: []
  };

  saveVetData(defaultData);
  return defaultData;
}

// دالة لحفظ البيانات في localStorage
function saveVetData(data: VetDBData): void {
  try {
    localStorage.setItem(VET_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing vet data to localStorage:', error);
  }
}

class VetDatabase {
  // التحقق من توفر Electron API
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  // استدعاء Electron API
  private async callElectronAPI(method: string, ...args: any[]): Promise<any> {
    if (this.isElectron()) {
      try {
        return await window.electronAPI[method](...args);
      } catch (error) {
        console.error(`Electron API error (${method}):`, error);
        return null;
      }
    }
    return null;
  }

  // إعادة تعيين قاعدة البيانات (مسح البيانات القديمة وإنشاء المستخدم الافتراضي)
  resetDatabase(): void {
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    const defaultData: VetDBData = {
      users: [
        {
          id: crypto.randomUUID(),
          username: 'qadmin',
          password: 'qadmin123',
          name: 'مدير المحجر',
          email: null,
          role: 'vet_manager',
          is_active: true,
          profile_image: null,
          last_login: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      procedures: [
        {
          id: crypto.randomUUID(),
          procedure_number: `0001-${currentYear}-Q`,
          client_name: 'شركة التجارة الدولية',
          reception_date: today,
          country_port: 'البرازيل',
          receiver_name: 'فحص الحيوانات',
          sample_groups: [
            {
              id: crypto.randomUUID(),
              animal_type: 'أبقار',
              sample_type: 'دم',
              sample_count: 5,
              requested_tests: ['الحمى المالطية (البروسيلا)', 'الحمى القلاعية (FMD)'],
              notes: 'إجراء تجريبي للاختبار'
            }
          ],
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      testResults: [],
      animalShipments: []
    };
    saveVetData(defaultData);
    console.log('Vet database reset with new credentials');
  }

  // تهيئة المستخدمين الافتراضيين
  initializeDefaultUser(): void {
    const data = getVetData();

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

    saveVetData(data);
  }

  // التحقق من بيانات تسجيل الدخول
  async authenticateUser(usernameOrEmail: string, password: string): Promise<VetUser | null> {
    const data = getVetData();

    const userIndex = data.users.findIndex(
      u => (u.username === usernameOrEmail || u.email === usernameOrEmail)
        && u.password === password
        && u.is_active
    );

    if (userIndex !== -1) {
      // تحديث آخر تسجيل دخول
      data.users[userIndex].last_login = new Date().toISOString();
      saveVetData(data);
      return data.users[userIndex];
    }

    return null;
  }

  // الحصول على جميع المستخدمين
  async getUsers(): Promise<VetUser[]> {
    const data = getVetData();
    return data.users || [];
  }

  // إضافة مستخدم جديد
  async addUser(userData: Omit<VetUser, 'id' | 'created_at' | 'updated_at'>): Promise<VetUser> {
    const data = getVetData();

    const newUser: VetUser = {
      ...userData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.users.push(newUser);
    saveVetData(data);

    return newUser;
  }

  // تحديث مستخدم
  async updateUser(id: string, updates: Partial<VetUser>): Promise<void> {
    const data = getVetData();
    const userIndex = data.users.findIndex(u => u.id === id);

    if (userIndex !== -1) {
      data.users[userIndex] = {
        ...data.users[userIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveVetData(data);
    }
  }

  // حذف مستخدم
  async deleteUser(id: string): Promise<void> {
    const data = getVetData();
    data.users = data.users.filter(u => u.id !== id);
    saveVetData(data);
  }

  // تبديل حالة المستخدم
  async toggleUserStatus(id: string): Promise<void> {
    const data = getVetData();
    const user = data.users.find(u => u.id === id);

    if (user) {
      user.is_active = !user.is_active;
      user.updated_at = new Date().toISOString();
      saveVetData(data);
    }
  }

  // تغيير كلمة المرور
  async changePassword(id: string, newPassword: string): Promise<void> {
    const data = getVetData();
    const user = data.users.find(u => u.id === id);

    if (user) {
      user.password = newPassword;
      user.updated_at = new Date().toISOString();
      saveVetData(data);
    }
  }

  // تحديث آخر تسجيل دخول بناءً على اسم المستخدم
  async updateUserLastLogin(username: string): Promise<void> {
    const data = getVetData();
    const userIndex = data.users.findIndex(u => u.username === username);

    if (userIndex !== -1) {
      data.users[userIndex].last_login = new Date().toISOString();
      data.users[userIndex].updated_at = new Date().toISOString();
      saveVetData(data);
    }
  }



  // حفظ إجراء جديد
  async saveProcedure(procedureData: any): Promise<VetProcedure> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('createQuarantineProcedure', {
        procedure_number: procedureData.procedure_number,
        client_name: procedureData.client_name,
        reception_date: procedureData.reception_date,
        country_port: procedureData.country_port || '',
        receiver_name: procedureData.receiver_name || '',
        sampling_doctors: procedureData.sampling_doctors || [],
        sample_groups: procedureData.sample_groups.map((group: any) => ({
          id: crypto.randomUUID(),
          animal_type: group.animal_type,
          animal_gender: group.animal_gender,
          sample_count: group.sample_count,
          samples: group.samples.map((sample: any) => ({
            id: crypto.randomUUID(),
            sample_number: sample.sample_number,
            required_test: sample.required_test,
            sample_type: sample.sample_type,
          })),
        })),
        created_by: null,
      });
      if (result !== null) {
        // تتبع التقدم
        // ملاحظة: localStorage - التتبع يعمل فقط في Electron
        return result;
      }
    }

    const data = getVetData();

    const now = new Date().toISOString();
    const newProcedure: VetProcedure = {
      id: crypto.randomUUID(),
      procedure_number: procedureData.procedure_number,
      client_name: procedureData.client_name,
      reception_date: procedureData.reception_date,
      country_port: procedureData.country_port || '',
      receiver_name: procedureData.receiver_name || '',
      sampling_doctors: procedureData.sampling_doctors || [],
      sample_groups: procedureData.sample_groups.map((group: any) => ({
        id: crypto.randomUUID(),
        animal_type: group.animal_type,
        animal_gender: group.animal_gender,
        sample_count: group.sample_count,
        samples: group.samples.map((sample: any) => ({
          id: crypto.randomUUID(),
          sample_number: sample.sample_number,
          required_test: sample.required_test,
          sample_type: sample.sample_type,
        })),
      })),
      created_at: now,
      updated_at: now,
      created_by: null,
      is_new: true, // وضع علامة على الإجراء كجديد
    };

    if (!data.procedures) {
      data.procedures = [];
    }

    data.procedures.push(newProcedure);
    saveVetData(data);

    // إنشاء تنبيه للمختبر
    await createAlertForNew(newProcedure.procedure_number);

    // تتبع التقدم - إنشاء إجراء محجر جديد
    // ملاحظة: localStorage - التتبع يعمل فقط في Electron

    return newProcedure;
  }

  // الحصول على جميع الإجراءات
  async getAllProcedures(): Promise<VetProcedure[]> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getQuarantineProcedures');
      if (result !== null) return result;
    }

    // جلب من localStorage
    const data = getVetData();
    const procedures = data.procedures || [];

    // ترتيب عكسي حسب رقم الإجراء (الأحدث في الأعلى)
    return procedures.sort((a, b) => {
      const numA = parseInt(a.procedure_number.split('-')[0]) || 0;
      const numB = parseInt(b.procedure_number.split('-')[0]) || 0;
      return numB - numA; // ترتيب تنازلي
    });
  }

  // حذف إجراء بيطري وجميع الإرساليات المرتبطة
  async deleteProcedure(id: string): Promise<void> {
    console.log(`[vetDatabase.ts deleteProcedure] 🗑️  بدء حذف الإجراء: ${id}`);

    // الحصول على رقم الإجراء قبل الحذف
    let procedureNumber: string | undefined;

    // في Electron: نحصل على رقم الإجراء من قاعدة البيانات
    if (this.isElectron()) {
      try {
        const procedureFromDB = await this.callElectronAPI('getQuarantineProcedureById', id);
        procedureNumber = procedureFromDB?.procedure_number;
        console.log(`[vetDatabase.ts]   - رقم الإجراء من Electron DB: ${procedureNumber}`);
      } catch (error) {
        console.error('[vetDatabase.ts] ❌ خطأ في الحصول على رقم الإجراء:', error);
      }
    } else {
      // في المتصفح: نحصل عليه من localStorage
      const data = getVetData();
      const procedure = data.procedures?.find(p => p.id === id);
      procedureNumber = procedure?.procedure_number;
      console.log(`[vetDatabase.ts]   - رقم الإجراء من localStorage: ${procedureNumber}`);
    }

    console.log(`[vetDatabase.ts]   - البيئة: ${this.isElectron() ? 'Electron' : 'Web'}`);

    // حذف من Electron DB إذا كان متاحاً
    if (this.isElectron()) {
      console.log(`[vetDatabase.ts]   - استدعاء deleteQuarantineProcedure في Electron...`);
      try {
        const result = await this.callElectronAPI('deleteQuarantineProcedure', id);
        console.log(`[vetDatabase.ts] ✅ تم حذف الإجراء ${procedureNumber} من Electron DB`);
        console.log(`[vetDatabase.ts]   - نتيجة الحذف:`, result);
      } catch (error) {
        console.error('[vetDatabase.ts] ❌ خطأ في حذف الإجراء من Electron DB:', error);
      }
    }

    // حذف من localStorage (مزامنة)
    const data = getVetData();
    if (data.procedures) {
      // حذف الإجراء
      data.procedures = data.procedures.filter(p => p.id !== id);

      // حذف الإرساليات الحيوانية المرتبطة بنفس رقم الإجراء من قاعدة البيانات
      let hadShipment = false;
      if (procedureNumber && data.animalShipments) {
        const shipmentsToDelete = data.animalShipments.filter(
          s => s.procedure_number === procedureNumber
        );
        hadShipment = shipmentsToDelete.length > 0;

        data.animalShipments = data.animalShipments.filter(
          s => s.procedure_number !== procedureNumber
        );

        console.log(`✅ تم حذف ${shipmentsToDelete.length} إرسالية مرتبطة برقم الإجراء ${procedureNumber} من localStorage`);
      }

      // حذف بيانات التجار المرتبطة بنفس رقم الإجراء
      if (procedureNumber && (data as any).quarantineTradersData) {
        const tradersToDelete = (data as any).quarantineTradersData.filter(
          (t: any) => t.shipment_id === procedureNumber
        );

        (data as any).quarantineTradersData = (data as any).quarantineTradersData.filter(
          (t: any) => t.shipment_id !== procedureNumber
        );

        console.log(`✅ تم حذف ${tradersToDelete.length} سجل تاجر مرتبط برقم الإجراء ${procedureNumber} من localStorage`);
      }

      saveVetData(data);

      // إطلاق حدث لإعلام الواجهة بالتغيير
      window.dispatchEvent(new CustomEvent('procedures-data-changed'));
      window.dispatchEvent(new CustomEvent('shipment-data-changed'));
      window.dispatchEvent(new CustomEvent('vet-data-changed'));

      console.log(`✅ تم حذف الإجراء ${procedureNumber} نهائياً من قاعدة البيانات${hadShipment ? ' وجميع الإرساليات المرتبطة' : ''}`);
    }
  }

  // تحديث إجراء
  async updateProcedure(id: string, updates: Partial<VetProcedure>): Promise<void> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('updateQuarantineProcedure', id, updates);
      if (result !== null) return;
    }

    const data = getVetData();
    if (data.procedures) {
      const procedureIndex = data.procedures.findIndex(p => p.id === id);
      if (procedureIndex !== -1) {
        const oldProcedure = data.procedures[procedureIndex];
        const oldProcedureNumber = oldProcedure.procedure_number;

        data.procedures[procedureIndex] = {
          ...oldProcedure,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        saveVetData(data);

        // تحديث الإجراء في المختبر إذا كان موجوداً
        this.updateProcedureInLab(oldProcedureNumber, data.procedures[procedureIndex]);
      }
    }
  }

  // تم حذف دوال التتبع

  // تحديث الإجراء في المختبر
  private updateProcedureInLab(oldProcedureNumber: string, updatedProcedure: VetProcedure): void {
    try {
      const labData = localStorage.getItem('agriserv_lab_db');
      if (labData) {
        const labDatabase = JSON.parse(labData);
        const savedSamples = labDatabase.saved_samples || [];

        // البحث عن الإجراء في المختبر باستخدام رقم الإجراء
        const labProcedureIndex = savedSamples.findIndex((p: any) =>
          p.external_procedure_number === oldProcedureNumber
        );

        if (labProcedureIndex !== -1) {
          // تحديث بيانات الإجراء في المختبر (اسم العميل، تاريخ الإجراء، المنفذ/البلد فقط)
          savedSamples[labProcedureIndex] = {
            ...savedSamples[labProcedureIndex],
            client_name: updatedProcedure.client_name,
            external_procedure_date: updatedProcedure.reception_date,
            country_port: updatedProcedure.country_port,
            updated_at: new Date().toISOString(),
          };

          labDatabase.saved_samples = savedSamples;
          localStorage.setItem('agriserv_lab_db', JSON.stringify(labDatabase));
        }
      }
    } catch (error) {
      console.error('Error updating procedure in lab:', error);
    }
  }

  // الحصول على رقم الإجراء التالي
  async getNextProcedureNumber(): Promise<string> {
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getNextQuarantineProcedureNumber');
      if (result !== null) return result;
    }

    const data = getVetData();
    const currentYear = new Date().getFullYear();

    // البحث عن أرقام الإجراءات للسنة الحالية
    const currentYearProcedures = data.procedures?.filter(procedure => {
      const match = procedure.procedure_number.match(/^(\d{4})-(\d{4})-Q$/);
      if (match) {
        const [, _number, year] = match;
        return parseInt(year) === currentYear;
      }
      return false;
    }) || [];

    // إيجاد أكبر رقم
    let maxNumber = 0;
    currentYearProcedures.forEach(procedure => {
      const match = procedure.procedure_number.match(/^(\d{4})-(\d{4})-Q$/);
      if (match) {
        const number = parseInt(match[1]);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    // الرقم التالي
    const nextNumber = maxNumber + 1;
    return `${nextNumber.toString().padStart(4, '0')}-${currentYear}-Q`;
  }

  // الحصول على آخر رقم إجراء (للتوافق مع الأكواد القديمة)
  async getLastProcedureNumber(): Promise<string> {
    const data = getVetData();
    if (data.procedures && data.procedures.length > 0) {
      const lastProcedure = data.procedures[data.procedures.length - 1];
      return lastProcedure.procedure_number;
    }
    const currentYear = new Date().getFullYear();
    return `0000-${currentYear}-Q`;
  }

  // حفظ نتيجة مختبر جديدة
  async saveTestResult(resultData: Omit<VetTestResult, 'id' | 'created_at' | 'updated_at'>): Promise<VetTestResult> {
    const data = getVetData();

    const newResult: VetTestResult = {
      ...resultData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!data.testResults) {
      data.testResults = [];
    }

    data.testResults.push(newResult);
    saveVetData(data);

    return newResult;
  }

  // الحصول على جميع نتائج المختبر
  async getAllTestResults(): Promise<VetTestResult[]> {
    const data = getVetData();
    return data.testResults || [];
  }

  // الحصول على نتائج المختبر لإجراء معين
  async getTestResultsByProcedureNumber(procedureNumber: string): Promise<VetTestResult[]> {
    try {
      const data = getVetData();
      if (!data.testResults) {
        return [];
      }
      return data.testResults.filter(result => result.procedure_number === procedureNumber);
    } catch (error) {
      console.error('Error getting test results:', error);
      return [];
    }
  }

  // حذف نتيجة مختبر
  async deleteTestResult(id: string): Promise<void> {
    const data = getVetData();
    if (data.testResults) {
      data.testResults = data.testResults.filter(r => r.id !== id);
      saveVetData(data);
    }
  }

  // تحديث نتيجة مختبر
  async updateTestResult(id: string, updates: Partial<VetTestResult>): Promise<void> {
    const data = getVetData();
    if (data.testResults) {
      const resultIndex = data.testResults.findIndex(r => r.id === id);
      if (resultIndex !== -1) {
        data.testResults[resultIndex] = {
          ...data.testResults[resultIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
        saveVetData(data);
      }
    }
  }

  // ==================== Animal Shipments Management ====================

  async getAnimalShipments(): Promise<AnimalShipment[]> {
    console.log('[VetDatabase] 📋 جلب الإرساليات...');

    if (this.isElectron()) {
      const result = await this.callElectronAPI('getAnimalShipments');
      if (result !== null) {
        console.log(`[VetDatabase] ✅ تم جلب ${result.length} إرسالية من Electron DB`);
        return result;
      }
    }

    // جلب من localStorage
    const data = getVetData();
    const shipments = data.animalShipments || [];
    console.log(`[VetDatabase] ✅ تم جلب ${shipments.length} إرسالية من localStorage`);

    // ترتيب عكسي حسب رقم الإجراء (الأحدث في الأعلى)
    return shipments.sort((a, b) => {
      const numA = parseInt(a.procedure_number.split('-')[0]) || 0;
      const numB = parseInt(b.procedure_number.split('-')[0]) || 0;
      return numB - numA; // ترتيب تنازلي
    });
  }

  async getAnimalShipmentById(id: string): Promise<AnimalShipment | null> {
    // في Electron: استخدام SQLite فقط
    if (this.isElectron()) {
      const result = await this.callElectronAPI('getAnimalShipmentById', id);
      if (result !== null) {
        return result;
      }
    }

    // في المتصفح: استخدام localStorage فقط
    const data = getVetData();
    return data.animalShipments?.find(s => s.id === id) || null;
  }

  async createAnimalShipment(shipment: Omit<AnimalShipment, 'id' | 'created_at' | 'updated_at'>): Promise<AnimalShipment> {
    const newShipment: AnimalShipment = {
      ...shipment,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // في Electron: استخدام SQLite فقط (مصدر واحد للحقيقة)
    if (this.isElectron()) {
      try {
        const result = await this.callElectronAPI('createAnimalShipment', newShipment);
        console.log('✅ تم حفظ الإرسالية في Electron DB (SQLite)');
        return result || newShipment; // إنهاء الدالة - لا حاجة لـ localStorage في Electron
      } catch (error) {
        console.error('❌ خطأ في حفظ الإرسالية في Electron DB:', error);
        throw error; // رفع الخطأ للتعامل معه في الواجهة
      }
    }

    // في المتصفح: استخدام localStorage فقط
    const data = getVetData();
    if (!data.animalShipments) {
      data.animalShipments = [];
    }
    data.animalShipments.push(newShipment);

    // تحديث الإجراء البيطري لتحديد أنه تم تسجيل الإرسالية
    const procedureIndex = data.procedures.findIndex(p => p.procedure_number === shipment.procedure_number);
    if (procedureIndex !== -1) {
      data.procedures[procedureIndex] = {
        ...data.procedures[procedureIndex],
        shipment_registered: true,
        updated_at: new Date().toISOString()
      } as any;
    }

    saveVetData(data);

    return newShipment;
  }

  async updateAnimalShipment(id: string, updates: Partial<AnimalShipment>): Promise<void> {
    console.log(`[VetDatabase] 📝 بدء تحديث الإرسالية: ID=${id}`);

    // في Electron: استخدام SQLite فقط (مصدر واحد للحقيقة)
    if (this.isElectron()) {
      try {
        await this.callElectronAPI('updateAnimalShipment', id, {
          ...updates,
          updated_at: new Date().toISOString()
        });
        console.log('[VetDatabase] ✅ تم تحديث الإرسالية في Electron DB (SQLite)');
        return; // إنهاء الدالة - لا حاجة لـ localStorage في Electron
      } catch (error) {
        console.error('[VetDatabase] ❌ خطأ في تحديث الإرسالية في Electron DB:', error);
        throw error; // رفع الخطأ للتعامل معه في الواجهة
      }
    }

    // في المتصفح: استخدام localStorage فقط
    const data = getVetData();
    if (data.animalShipments) {
      const shipmentIndex = data.animalShipments.findIndex(s => s.id === id);
      if (shipmentIndex !== -1) {
        data.animalShipments[shipmentIndex] = {
          ...data.animalShipments[shipmentIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
        saveVetData(data);
        console.log('[VetDatabase] ✅ تم تحديث الإرسالية في localStorage');
      } else {
        console.log('[VetDatabase] ✗ الإرسالية غير موجودة في localStorage');
        throw new Error('الإرسالية غير موجودة');
      }
    }
  }

  async deleteAnimalShipment(id: string): Promise<void> {
    console.log(`[VetDatabase] 🗑️  بدء حذف إرسالية: ID=${id}`);

    // في Electron: استخدام SQLite فقط (مصدر واحد للحقيقة)
    if (this.isElectron()) {
      try {
        const result = await this.callElectronAPI('deleteAnimalShipment', id);
        console.log(`[VetDatabase] ✅ تم حذف الإرسالية من Electron DB (SQLite)، النتيجة: ${result}`);

        // إطلاق حدث تحديث البيانات
        window.dispatchEvent(new Event('procedures-data-changed'));
        window.dispatchEvent(new Event('shipment-data-changed'));
        return; // إنهاء الدالة - لا حاجة لـ localStorage في Electron
      } catch (error) {
        console.error('[VetDatabase] ❌ خطأ في حذف الإرسالية من Electron DB:', error);
        throw error; // رفع الخطأ للتعامل معه في الواجهة
      }
    }

    // في المتصفح: استخدام localStorage فقط
    const data = getVetData();
    if (data.animalShipments) {
      const shipment = data.animalShipments.find(s => s.id === id);

      if (shipment) {
        console.log(`[VetDatabase] ✓ الإرسالية موجودة: ${shipment.procedure_number}`);

        if (shipment.attachments && shipment.attachments.length > 0) {
          console.log(`Deleting ${shipment.attachments.length} attachments for shipment ${shipment.procedure_number}`);
        }

        // حذف بيانات التجار المرتبطة بهذه الإرسالية من localStorage
        if ((data as any).quarantineTradersData) {
          const traderCountBefore = (data as any).quarantineTradersData.length;
          (data as any).quarantineTradersData = (data as any).quarantineTradersData.filter(
            (trader: any) => trader.shipment_id !== shipment.procedure_number
          );
          const traderCountAfter = (data as any).quarantineTradersData.length;
          const deletedTradersCount = traderCountBefore - traderCountAfter;
          if (deletedTradersCount > 0) {
            console.log(`[VetDatabase] ✓ تم حذف ${deletedTradersCount} سجل تاجر مرتبط من localStorage`);
          }
        }

        const countBefore = data.animalShipments.length;
        data.animalShipments = data.animalShipments.filter(s => s.id !== id);
        const countAfter = data.animalShipments.length;
        console.log(`[VetDatabase] حذف من localStorage: قبل=${countBefore}، بعد=${countAfter}`);

        // تحديث حالة الإجراء البيطري
        const procedure = data.procedures?.find((p: any) =>
          p.procedure_number === shipment.procedure_number ||
          p.veterinary_procedure_number === shipment.procedure_number
        );

        if (procedure && 'shipment_registered' in procedure) {
          (procedure as any).shipment_registered = false;
          procedure.updated_at = new Date().toISOString();
          console.log(`[VetDatabase] تم تحديث حالة الإجراء: ${procedure.procedure_number}`);
        }

        saveVetData(data);
        console.log('[VetDatabase] ✅ تم حفظ التغييرات في localStorage');

        window.dispatchEvent(new Event('procedures-data-changed'));
        window.dispatchEvent(new Event('shipment-data-changed'));
        window.dispatchEvent(new Event('vet-data-changed'));
      } else {
        console.log(`[VetDatabase] ✗ الإرسالية غير موجودة: ID=${id}`);
        throw new Error('الإرسالية غير موجودة');
      }
    } else {
      console.log('[VetDatabase] ✗ لا توجد إرساليات في البيانات');
      throw new Error('لا توجد إرساليات في البيانات');
    }
  }
}

export const vetDB = new VetDatabase();
export const vetDatabase = vetDB;
