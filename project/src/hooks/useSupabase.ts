import { useState, useEffect } from 'react';
import { supabase, Worker, Category, Subcategory, AttendanceRecord, Payment } from '../lib/supabase';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setWorkers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workers');
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert([worker])
        .select()
        .single();
      
      if (error) throw error;
      setWorkers(prev => [...prev, data]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add worker';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateWorker = async (id: string, updates: Partial<Worker>) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setWorkers(prev => prev.map(w => w.id === id ? data : w));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update worker';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setWorkers(prev => prev.filter(w => w.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete worker';
      setError(message);
      return { success: false, error: message };
    }
  };

  return {
    workers,
    loading,
    error,
    addWorker,
    updateWorker,
    deleteWorker,
    refetch: fetchWorkers
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          category:categories(*)
        `)
        .order('name');
      
      if (error) throw error;
      setSubcategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subcategories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name }])
        .select()
        .single();
      
      if (error) throw error;
      setCategories(prev => [...prev, data]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add category';
      return { success: false, error: message };
    }
  };

  const addSubcategory = async (categoryId: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert([{ category_id: categoryId, name }])
        .select(`
          *,
          category:categories(*)
        `)
        .single();
      
      if (error) throw error;
      setSubcategories(prev => [...prev, data]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add subcategory';
      return { success: false, error: message };
    }
  };

  return {
    categories,
    subcategories,
    loading,
    error,
    addCategory,
    addSubcategory,
    refetch: () => {
      fetchCategories();
      fetchSubcategories();
    }
  };
}

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceRecords = async (workerId?: string, startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          worker:workers(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .order('date', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert([record])
        .select(`
          *,
          worker:workers(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .single();
      
      if (error) throw error;
      setRecords(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add attendance record';
      return { success: false, error: message };
    }
  };

  return {
    records,
    loading,
    error,
    fetchAttendanceRecords,
    addAttendanceRecord
  };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async (workerId?: string, startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('payments')
        .select(`
          *,
          worker:workers(*)
        `)
        .order('date', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (payment: Omit<Payment, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select(`
          *,
          worker:workers(*)
        `)
        .single();
      
      if (error) throw error;
      setPayments(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add payment';
      return { success: false, error: message };
    }
  };

  return {
    payments,
    loading,
    error,
    fetchPayments,
    addPayment
  };
}

export async function calculateWorkerBalance(workerId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_worker_balance', {
      worker_uuid: workerId
    });
    
    if (error) throw error;
    return data || 0;
  } catch (err) {
    console.error('Failed to calculate worker balance:', err);
    return 0;
  }
}