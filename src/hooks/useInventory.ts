import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDatabase';
import toast from 'react-hot-toast';

export interface InventoryItem {
  id: string;
  name: string;
  item_name?: string;
  quantity: number;
  minimum_quantity?: number;
  type: 'diagnostic' | 'tools';
  unit: 'carton' | 'bag' | 'box';
  size?: string;
  section: 'bacteriology' | 'Virology' | 'parasitology' | 'poultry' | 'Molecular biology';
  category?: string;
  location?: string;
  entry_date: string;
  expiry_date?: string;
  last_updated?: string;
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

let cachedItems: InventoryItem[] | null = null;
let cachedTransactions: InventoryTransaction[] | null = null;
let inventoryCacheTimestamp: number = 0;
const INVENTORY_CACHE_DURATION = 30000;

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(cachedItems || []);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(cachedTransactions || []);
  const [loading, setLoading] = useState(!cachedItems);

  const fetchItems = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh && cachedItems && (now - inventoryCacheTimestamp) < INVENTORY_CACHE_DURATION) {
      setItems(cachedItems);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await localDB.getInventoryItems();
      cachedItems = data.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      inventoryCacheTimestamp = now;
      setItems(cachedItems);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      toast.error('خطأ في تحميل المخزون');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh && cachedTransactions && (now - inventoryCacheTimestamp) < INVENTORY_CACHE_DURATION) {
      setTransactions(cachedTransactions);
      return;
    }

    try {
      const data = await localDB.getInventoryTransactions();
      cachedTransactions = data.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTransactions(cachedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  }, []);

  const addItem = async (itemData: Partial<InventoryItem>) => {
    try {
      console.log('Adding item with data:', itemData);

      const newItem = await localDB.createInventoryItem({
        ...itemData,
        entry_date: new Date().toISOString().split('T')[0],
        created_by: 'local_user'
      });

      console.log('Item added successfully:', newItem);

      await localDB.createInventoryTransaction({
        item_id: newItem.id,
        quantity: itemData.quantity,
        type: 'addition',
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: 'local_user'
      });

      await fetchItems(true);
      await fetchTransactions(true);
      toast.success('تم إضافة الصنف بنجاح');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('خطأ في إضافة الصنف');
      throw error;
    }
  };

  const withdrawItem = async (itemId: string, quantity: number, specialistName: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) {
        toast.error('لم يتم العثور على الصنف');
        return;
      }

      if (quantity > item.quantity) {
        toast.error('الكمية المطلوبة أكبر من المتوفرة');
        return;
      }

      await localDB.updateInventoryItem(itemId, { quantity: item.quantity - quantity });

      await localDB.createInventoryTransaction({
        item_id: itemId,
        quantity: quantity,
        type: 'withdrawal',
        specialist_name: specialistName,
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: 'local_user'
      });

      const newQuantity = item.quantity - quantity;
      if (newQuantity <= 10) {
        toast(`تنبيه: الصنف "${item.name}" أصبح بكمية ${newQuantity} فقط`, {
          icon: '⚠️',
          duration: 5000
        });
      }

      await fetchItems(true);
      await fetchTransactions(true);
      toast.success('تم سحب الصنف بنجاح');
    } catch (error) {
      console.error('Error withdrawing item:', error);
      toast.error('خطأ في سحب الصنف');
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await localDB.deleteInventoryItem(itemId);
      await fetchItems(true);
      await fetchTransactions(true);
      toast.success('تم حذف الصنف بنجاح');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('خطأ في حذف الصنف');
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      await localDB.updateInventoryItem(itemId, updates);
      await fetchItems(true);
      toast.success('تم تحديث الصنف بنجاح');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('خطأ في تحديث الصنف');
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchTransactions()]);
    };
    loadData();
  }, [fetchItems, fetchTransactions]);

  return {
    items,
    transactions,
    loading,
    addItem,
    withdrawItem,
    deleteItem,
    updateItem,
    refetch: fetchItems
  };
}
