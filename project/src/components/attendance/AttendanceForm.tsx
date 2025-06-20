import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, DollarSign, FileText } from 'lucide-react';
import { useWorkers, useCategories, useAttendance, calculateWorkerBalance } from '../../hooks/useSupabase';
import { format, parseISO } from 'date-fns';

interface AttendanceFormData {
  worker_id: string;
  date: string;
  status: 'present' | 'absent' | 'halfday';
  category_id: string;
  subcategory_id: string;
  amount: number;
  narration: string;
}

export default function AttendanceForm() {
  const { workers, loading: workersLoading } = useWorkers();
  const { categories, subcategories, loading: categoriesLoading } = useCategories();
  const { addAttendanceRecord } = useAttendance();
  
  const [formData, setFormData] = useState<AttendanceFormData>({
    worker_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'present',
    category_id: '',
    subcategory_id: '',
    amount: 0,
    narration: ''
  });
  
  const [balanceInfo, setBalanceInfo] = useState({
    previousBalance: 0,
    currentWage: 0,
    updatedBalance: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<AttendanceFormData>>({});

  const availableSubcategories = subcategories.filter(
    sub => sub.category_id === formData.category_id
  );

  useEffect(() => {
    if (formData.worker_id) {
      loadWorkerBalance();
    }
  }, [formData.worker_id, formData.amount]);

  const loadWorkerBalance = async () => {
    if (!formData.worker_id) return;
    
    const balance = await calculateWorkerBalance(formData.worker_id);
    const currentWage = formData.status !== 'absent' ? formData.amount : 0;
    
    setBalanceInfo({
      previousBalance: balance,
      currentWage,
      updatedBalance: balance + currentWage
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<AttendanceFormData> = {};
    
    if (!formData.worker_id) newErrors.worker_id = 'Worker is required';
    if (!formData.date) newErrors.date = 'Date is required';
    
    if (formData.status !== 'absent') {
      if (!formData.category_id) newErrors.category_id = 'Category is required';
      if (!formData.subcategory_id) newErrors.subcategory_id = 'Subcategory is required';
      if (!formData.amount || formData.amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const attendanceData = {
        ...formData,
        amount: formData.status === 'absent' ? 0 : formData.amount,
        category_id: formData.status === 'absent' ? null : formData.category_id,
        subcategory_id: formData.status === 'absent' ? null : formData.subcategory_id,
      };
      
      const result = await addAttendanceRecord(attendanceData);
      
      if (result.success) {
        // Reset form
        setFormData({
          worker_id: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          status: 'present',
          category_id: '',
          subcategory_id: '',
          amount: 0,
          narration: ''
        });
        setBalanceInfo({ previousBalance: 0, currentWage: 0, updatedBalance: 0 });
        alert('Attendance recorded successfully!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (status: 'present' | 'absent' | 'halfday') => {
    setFormData({
      ...formData,
      status,
      category_id: status === 'absent' ? '' : formData.category_id,
      subcategory_id: status === 'absent' ? '' : formData.subcategory_id,
      amount: status === 'absent' ? 0 : formData.amount
    });
  };

  if (workersLoading || categoriesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Daily Attendance</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Worker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Worker *
              </label>
              <select
                value={formData.worker_id}
                onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.worker_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {errors.worker_id && (
                <p className="mt-1 text-sm text-red-600">{errors.worker_id}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            {/* Attendance Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Attendance Status *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'present', label: 'Present', color: 'green' },
                  { value: 'absent', label: 'Absent', color: 'red' },
                  { value: 'halfday', label: 'Half Day', color: 'yellow' }
                ].map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => handleStatusChange(status.value as any)}
                    className={`px-4 py-2 rounded-md border-2 transition-colors ${
                      formData.status === status.value
                        ? `border-${status.color}-500 bg-${status.color}-50 text-${status.color}-700`
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category and Subcategory - Only show if not absent */}
            {formData.status !== 'absent' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        category_id: e.target.value,
                        subcategory_id: '' // Reset subcategory when category changes
                      })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category_id ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      value={formData.subcategory_id}
                      onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.subcategory_id ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={!formData.category_id}
                    >
                      <option value="">Select subcategory</option>
                      {availableSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    {errors.subcategory_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.subcategory_id}</p>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter wage amount"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                  )}
                </div>
              </>
            )}

            {/* Narration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Narration
              </label>
              <textarea
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Recording...' : 'Record Attendance'}
              </button>
            </div>
          </form>
        </div>

        {/* Balance Display */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Calculation</h3>
            
            {formData.worker_id ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Previous Balance:</span>
                  <span className="font-medium">₹{balanceInfo.previousBalance.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Current Wage:</span>
                  <span className="font-medium text-green-600">
                    +₹{balanceInfo.currentWage.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 bg-blue-50 px-3 rounded-md">
                  <span className="font-medium text-gray-900">Updated Balance:</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ₹{balanceInfo.updatedBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a worker to view balance calculation
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}