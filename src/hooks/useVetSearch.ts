import { useState, useEffect } from 'react';
import { vetDB } from '../lib/vetDatabase';
import { localDB } from '../lib/localDatabase';
import { useAuth } from './useAuth';

export interface VetSearchResult {
  id: string;
  type: 'vet_procedure' | 'animal_shipment' | 'lab_procedure' | 'lab_result' | 'quarantine_trader';
  title: string;
  subtitle: string;
  metadata?: string;
  date?: string;
  data?: any;
  targetTab?: string;
}

export function useVetSearch() {
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VetSearchResult[]>([]);
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
      const results: VetSearchResult[] = [];

      try {
        // جلب جميع البيانات مرة واحدة
        const [
          vetProcedures,
          animalShipments,
          labProcedures,
          testResults,
          quarantineTraders
        ] = await Promise.all([
          vetDB.getAllProcedures(),
          vetDB.getAnimalShipments(),
          localDB.getSavedSamples(),
          localDB.getTestResultsWithSampleInfo(),
          (window as any).electronAPI?.getAllQuarantineTraders?.() || Promise.resolve([])
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

        // 1. البحث في الإجراءات البيطرية (المحجر)
        vetProcedures
          .filter(proc => toSearchableText(proc).toLowerCase().includes(query))
          .slice(0, 5)
          .forEach(proc => {
            results.push({
              id: proc.id,
              type: 'vet_procedure',
              title: proc.procedure_number,
              subtitle: `${proc.client_name}`,
              metadata: `${proc.country_port || ''} - ${proc.receiver_name}`,
              date: proc.procedure_date,
              data: proc,
              targetTab: 'procedure_records_vet'
            });
          });

        // 2. البحث في سجل الإرساليات
        animalShipments
          .filter(shipment => toSearchableText(shipment).toLowerCase().includes(query))
          .slice(0, 5)
          .forEach(shipment => {
            results.push({
              id: shipment.id,
              type: 'animal_shipment',
              title: `إرسالية ${shipment.procedure_number}`,
              subtitle: shipment.client_name,
              metadata: `${shipment.animal_count} حيوان - ${shipment.destination}`,
              date: shipment.shipment_date,
              data: shipment,
              targetTab: 'shipment_records_vet'
            });
          });

        // 3. البحث في إجراءات المختبر (المرتبطة بالمحجر)
        labProcedures
          .filter(proc => {
            const countryPort = proc.country_port?.trim().toLowerCase();
            // استبعاد إجراءات السعودية
            if (countryPort === 'المملكة العربية السعودية'.toLowerCase() ||
                countryPort === 'السعودية'.toLowerCase()) {
              return false;
            }
            return toSearchableText(proc).toLowerCase().includes(query);
          })
          .slice(0, 5)
          .forEach(proc => {
            results.push({
              id: proc.id,
              type: 'lab_procedure',
              title: `${proc.external_procedure_number || proc.internal_procedure_number}`,
              subtitle: proc.client_name,
              metadata: `مختبر: ${proc.internal_procedure_number} - ${proc.country_port || ''}`,
              date: proc.reception_date,
              data: proc,
              targetTab: 'lab_status_vet'
            });
          });

        // 4. البحث في نتائج المختبر
        testResults
          .filter(result => {
            const countryPort = result.country_port?.trim().toLowerCase();
            if (countryPort === 'المملكة العربية السعودية'.toLowerCase() ||
                countryPort === 'السعودية'.toLowerCase()) {
              return false;
            }
            return toSearchableText(result).toLowerCase().includes(query);
          })
          .slice(0, 5)
          .forEach(result => {
            results.push({
              id: result.id,
              type: 'lab_result',
              title: `نتيجة ${result.external_procedure_number || result.internal_procedure_number}`,
              subtitle: `${result.test_method} - ${result.test_result}`,
              metadata: `${result.client_name} - عينة ${result.sample_number}`,
              date: result.test_date,
              data: result,
              targetTab: 'lab_results_vet'
            });
          });

        // 5. البحث في سجل الحجر البيطري
        if (quarantineTraders && Array.isArray(quarantineTraders)) {
          quarantineTraders
            .filter(trader => {
              const searchableText = toSearchableText(trader).toLowerCase();
              return searchableText.includes(query);
            })
            .slice(0, 5)
            .forEach(trader => {
              results.push({
                id: trader.id,
                type: 'quarantine_trader',
                title: `${trader.importer_name || 'مستورد'}`,
                subtitle: `إذن: ${trader.permit_number} - بيان: ${trader.statement_number}`,
                metadata: `${trader.animal_type} - ${trader.quarantine_location}`,
                date: trader.created_at,
                data: trader,
                targetTab: 'quarantine_records_vet'
              });
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
