import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Worker {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
  category?: Category;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  date: string;
  status: 'present' | 'absent' | 'halfday';
  category_id?: string;
  subcategory_id?: string;
  amount?: number;
  narration?: string;
  created_at: string;
  worker?: Worker;
  category?: Category;
  subcategory?: Subcategory;
}

export interface Payment {
  id: string;
  worker_id: string;
  amount: number;
  date: string;
  payment_mode: string;
  narration?: string;
  created_at: string;
  worker?: Worker;
}

export interface BalanceAudit {
  id: string;
  worker_id: string;
  old_balance: number;
  new_balance: number;
  change_reason: string;
  created_at: string;
}