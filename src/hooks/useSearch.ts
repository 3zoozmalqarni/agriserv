import { useState, useEffect } from 'react';
import { localDB } from '../lib/localDatabase';
import { vetDB } from '../lib/vetDatabase';
import { useAuth } from './useAuth';

export interface SearchResult {
  id: string;
  type: 'procedure' | 'sample' | 'user' | 'test_result' | 'dilution' | 'inventory' | 'vet_procedure' | 'report' | 'print_result' | 'approval';
  title: string;
  subtitle: string;
  metadata?: string;
  date?: string;
  data?: any;
}

const USERS_STORAGE_KEY = 'lab_users';

export function useSearch() {
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2 || !auth) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const results: SearchResult[] = [];

      try {
        const { hasPermission } = auth;

        // جلب جميع البيانات مرة واحدة
        const [
          savedSamples,
          samples,
          testResults,
          inventoryItems,
          users,
          vetProcedures
        ] = await Promise.all([
          localDB.getSavedSamples(),
          localDB.getSamples(),
          localDB.getTestResults(),
          localDB.getInventoryItems(),
          localDB.getUsers(),
          vetDB.getAllProcedures()
        ]);

        // دالة مساعدة لتحويل أي قيمة إلى نص قابل للبحث
        const toSearchableText = (obj: any): string => {
          if (!obj) return '';
          if (typeof obj === 'string') return obj;
          if (typeof obj === 'number') return obj.toString();
          if (Array.isArray(obj)) return obj.map(toSearchableText).join(' ');
          if (typeof obj === 'object') {
            return Object.values(obj)
              .filter(v => v !== null && v !== undefined)
              .map(toSearchableText)
              .join(' ');
          }
          return '';
        };

        // 1. البحث في الإجراءات المحفوظة
        if (hasPermission('add_lab_procedures') || hasPermission('view_all')) {
          savedSamples
            .filter(proc => toSearchableText(proc).toLowerCase().includes(query))
            .slice(0, 5)
            .forEach(proc => {
              results.push({
                id: proc.id,
                type: 'procedure',
                title: proc.internal_procedure_number,
                subtitle: proc.client_name,
                metadata: proc.country_port || '',
                date: proc.reception_date,
                data: proc
              });
            });
        }

        // 2. البحث في العينات
        if (hasPermission('add_lab_procedures') || hasPermission('view_all')) {
          samples
            .filter(sample => {
              const savedSample = savedSamples.find(s => s.id === sample.saved_sample_id);
              const combined = { ...sample, ...savedSample };
              return toSearchableText(combined).toLowerCase().includes(query);
            })
            .slice(0, 5)
            .forEach(sample => {
              const savedSample = savedSamples.find(s => s.id === sample.saved_sample_id);
              results.push({
                id: sample.id,
                type: 'sample',
                title: `عينة رقم ${sample.sample_number}`,
                subtitle: sample.requested_test,
                metadata: savedSample?.client_name || '',
                date: sample.created_at,
                data: { sample, savedSample }
              });
            });
        }

        // 3. البحث في المستخدمين
        if (hasPermission('manage_lab_users')) {
          const roleNames: Record<string, string> = {
            'program_manager': 'مدير النظام',
            'lab_manager': 'مدير المختبر',
            'section_supervisor': 'مشرف القسم',
            'lab_specialist': 'أخصائي مختبر',
            'admin': 'مدير النظام',
            'technician': 'فني'
          };

          users
            .filter((user: any) => toSearchableText(user).toLowerCase().includes(query))
            .slice(0, 5)
            .forEach((user: any) => {
              results.push({
                id: user.id,
                type: 'user',
                title: user.name,
                subtitle: roleNames[user.role] || user.role,
                metadata: user.email || user.username,
                data: user
              });
            });
        }

        // 4. البحث في نتائج الفحوصات
        if (hasPermission('add_lab_results') || hasPermission('edit_lab_results') || hasPermission('view_all')) {
          testResults
            .filter(result => {
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;
              const combined = { ...result, ...sample, ...savedSample };
              return toSearchableText(combined).toLowerCase().includes(query);
            })
            .slice(0, 5)
            .forEach(result => {
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;

              results.push({
                id: result.id,
                type: 'test_result',
                title: result.test_method,
                subtitle: result.test_result,
                metadata: savedSample?.client_name || '',
                date: result.test_date,
                data: { result, sample, savedSample }
              });
            });
        }

        // 5. البحث في المخزون
        if (hasPermission('add_inventory_item') || hasPermission('edit_inventory_item') ||
            hasPermission('delete_inventory_item') || hasPermission('withdraw_inventory_item')) {
          inventoryItems
            .filter(item => toSearchableText(item).toLowerCase().includes(query))
            .slice(0, 5)
            .forEach(item => {
              const statusLabel = item.quantity <= item.minimum_quantity
                ? 'يحتاج إعادة طلب'
                : item.quantity <= item.minimum_quantity * 1.5
                ? 'مخزون منخفض'
                : 'متوفر';

              results.push({
                id: item.id,
                type: 'inventory',
                title: item.item_name,
                subtitle: `الكمية: ${item.quantity} ${item.unit} - ${statusLabel}`,
                metadata: `الفئة: ${item.category} - الموقع: ${item.location || 'غير محدد'}`,
                date: item.last_updated,
                data: item
              });
            });
        }

        // 6. البحث في الإجراءات البيطرية
        if (hasPermission('view_vet_procedures') || hasPermission('view_all')) {
          vetProcedures
            .filter(proc => toSearchableText(proc).toLowerCase().includes(query))
            .slice(0, 5)
            .forEach(proc => {
              results.push({
                id: proc.id,
                type: 'vet_procedure',
                title: `إجراء رقم ${proc.procedure_number}`,
                subtitle: proc.client_name,
                metadata: proc.country_port || '',
                date: proc.reception_date,
                data: proc
              });
            });
        }

        // 7. البحث في النتائج المعتمدة (للطباعة)
        if (hasPermission('print_results') || hasPermission('view_all')) {
          testResults
            .filter(result => {
              if (result.status !== 'approved') return false;
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;
              const combined = { ...result, ...sample, ...savedSample };
              return toSearchableText(combined).toLowerCase().includes(query);
            })
            .slice(0, 3)
            .forEach(result => {
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;

              results.push({
                id: result.id,
                type: 'print_result',
                title: `نتيجة معتمدة - ${result.test_method}`,
                subtitle: result.test_result,
                metadata: savedSample?.client_name || '',
                date: result.approval_date,
                data: { result, sample, savedSample }
              });
            });
        }

        // 8. البحث في النتائج المعلقة (للاعتماد)
        if (hasPermission('approve_results') || hasPermission('view_all')) {
          testResults
            .filter(result => {
              if (result.status !== 'pending') return false;
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;
              const combined = { ...result, ...sample, ...savedSample };
              return toSearchableText(combined).toLowerCase().includes(query);
            })
            .slice(0, 3)
            .forEach(result => {
              const sample = samples.find(s => s.id === result.sample_id);
              const savedSample = sample ? savedSamples.find(s => s.id === sample.saved_sample_id) : undefined;

              results.push({
                id: result.id,
                type: 'approval',
                title: `نتيجة معلقة - ${result.test_method}`,
                subtitle: result.test_result,
                metadata: savedSample?.client_name || '',
                date: result.test_date,
                data: { result, sample, savedSample }
              });
            });
        }

        // البحث في صفحة إدخال النتائج
        const resultsEntryKeywords = ['إدخال', 'نتائج', 'تسجيل نتائج', 'results entry', 'نتيجة', 'فحص'];
        if (resultsEntryKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          if (hasPermission('add_lab_results') || hasPermission('edit_lab_results') || hasPermission('view_all')) {
            results.push({
              id: 'results-entry-page',
              type: 'test_result',
              title: 'إدخال النتائج',
              subtitle: 'صفحة إدخال وتعديل نتائج الفحوصات المخبرية',
              metadata: 'إدخال النتائج'
            });
          }
        }

        // البحث في صفحة اعتماد النتائج
        const approvalKeywords = ['اعتماد', 'اعتماد النتائج', 'approval', 'معلق', 'pending', 'نتائج معلقة'];
        if (approvalKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          if (hasPermission('approve_results') || hasPermission('view_all')) {
            results.push({
              id: 'results-approval-page',
              type: 'approval',
              title: 'اعتماد النتائج',
              subtitle: 'صفحة اعتماد النتائج المعلقة',
              metadata: 'اعتماد النتائج'
            });
          }
        }

        // البحث في صفحة طباعة النتائج
        const printKeywords = ['طباعة', 'طباعة النتائج', 'print', 'معتمد', 'approved'];
        if (printKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          if (hasPermission('print_results') || hasPermission('view_all')) {
            results.push({
              id: 'print-results-page',
              type: 'print_result',
              title: 'طباعة النتائج',
              subtitle: 'صفحة طباعة النتائج المعتمدة',
              metadata: 'طباعة النتائج'
            });
          }
        }

        // البحث في صفحة المخزون
        const inventoryKeywords = ['مخزون', 'inventory', 'مواد', 'معدات', 'صرف', 'إضافة مواد'];
        if (inventoryKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          if (hasPermission('add_inventory_item') || hasPermission('edit_inventory_item') ||
              hasPermission('delete_inventory_item') || hasPermission('withdraw_inventory_item')) {
            results.push({
              id: 'inventory-page',
              type: 'inventory',
              title: 'إدارة المخزون',
              subtitle: 'صفحة إدارة المواد والمعدات المخبرية',
              metadata: 'إدارة المخزون'
            });
          }
        }

        // البحث في التقارير
        const reportKeywords = ['تقرير', 'تقارير', 'report', 'reports', 'إحصائيات', 'statistics'];
        if (reportKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          if (hasPermission('view_reports') || hasPermission('view_all')) {
            results.push({
              id: 'reports',
              type: 'report',
              title: 'التقارير والإحصائيات',
              subtitle: 'عرض التقارير والإحصائيات المخبرية',
              metadata: 'تقارير شاملة'
            });
          }
        }

        // البحث في حاسبة التخفيفات
        const dilutionKeywords = ['تخفيف', 'conjugate', 'غسيل', 'wash', 'حجم', 'حاسبة', 'calculator'];
        if (dilutionKeywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          results.push({
            id: 'dilution-calculator',
            type: 'dilution',
            title: 'حاسبة التخفيفات',
            subtitle: 'حساب تخفيفات المواد والمحاليل المخبرية',
            metadata: 'أداة حساب التخفيفات'
          });
        }

        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('خطأ في البحث:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, auth]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showResults,
    setShowResults,
    clearSearch
  };
}
