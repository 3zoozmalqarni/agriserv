import { useState, useEffect } from 'react';

interface VetImporter {
  id: string;
  importer_name: string;
  farm_location: string | null;
  phone_number: string | null;
  technical_report_expiry_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useVetImporters() {
  const [importers, setImporters] = useState<VetImporter[]>([]);
  const [loading, setLoading] = useState(true);

  const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
  };

  const fetchImporters = async () => {
    try {
      setLoading(true);

      if (isElectron() && window.electronAPI?.getVetImporters) {
        const data = await window.electronAPI.getVetImporters();
        setImporters(data || []);
      } else {
        console.warn('Electron API not available - importers feature requires Electron');
        setImporters([]);
      }
    } catch (error) {
      console.error('Error fetching importers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImporters();

    const handleDataChanged = () => {
      fetchImporters();
    };

    window.addEventListener('vet-importers-data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('vet-importers-data-changed', handleDataChanged);
    };
  }, []);

  const createImporter = async (importerData: Omit<VetImporter, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (isElectron() && window.electronAPI?.createVetImporter) {
        const newImporter = {
          id: crypto.randomUUID(),
          ...importerData
        };

        await window.electronAPI.createVetImporter(newImporter);
        window.dispatchEvent(new CustomEvent('vet-importers-data-changed'));
        return true;
      } else {
        throw new Error('Electron API not available - importers feature requires Electron');
      }
    } catch (error) {
      console.error('Error creating importer:', error);
      throw error;
    }
  };

  const updateImporter = async (id: string, updates: Partial<VetImporter>) => {
    try {
      if (isElectron() && window.electronAPI?.updateVetImporter) {
        await window.electronAPI.updateVetImporter(id, updates);
        window.dispatchEvent(new CustomEvent('vet-importers-data-changed'));
        return true;
      } else {
        throw new Error('Electron API not available - importers feature requires Electron');
      }
    } catch (error) {
      console.error('Error updating importer:', error);
      throw error;
    }
  };

  const deleteImporter = async (id: string) => {
    try {
      if (isElectron() && window.electronAPI?.deleteVetImporter) {
        await window.electronAPI.deleteVetImporter(id);
        window.dispatchEvent(new CustomEvent('vet-importers-data-changed'));
        return true;
      } else {
        throw new Error('Electron API not available - importers feature requires Electron');
      }
    } catch (error) {
      console.error('Error deleting importer:', error);
      throw error;
    }
  };

  return {
    importers,
    loading,
    createImporter,
    updateImporter,
    deleteImporter,
    refreshImporters: fetchImporters
  };
}
