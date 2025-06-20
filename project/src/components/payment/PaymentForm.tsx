import React, { useState, useEffect } from 'react';
import { CreditCard, User, Calendar, DollarSign, FileText } from 'lucide-react';
import { useWorkers, usePayments, calculateWorkerBalance } from '../../hooks/useSupabase';
import { format } from 'date-fns';

interface PaymentFormData {
  worker_id: string;
  amount: number;
  date: string;
  payment_mode: string;
  narration: string;
}

const paymentModes = [
  'Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Online Transfer'
];

export default function PaymentForm() {
  const { workers, loading: workersLoading } = useWorkers();
  const { payments, addPayment, fetchPayments } = usePayments();
  
  const [formData, setFormData] = useState<PaymentFormData>({
    worker_id: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_mode: 'Cash',
    narration: ''
  });
  
  const [balanceInfo, setBalanceInfo] = useState({
    totalPayable: 0,
    newBalance: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});

  useEffect(() => {
    if (formData.worker_id) {
      loadWorkerBalance();
      fetchPayments(formData.worker_id);
    }
  }, [formData.worker_id, formData.amount]);

  const loadWorkerBalance = async () => {
    if (!formData.worker_id) return;
    
    const currentBalance = await calculateWorkerBalance(formData.worker_id);
    const newBalance = currentBalance - formData.amount;
    
    setBalanceInfo({
      totalPayable: currentBalance,
      newBalance
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentFormData> = {};
    
    if (!formData.worker_id) newErrors.worker_id = 'Worker is required';
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.payment_mode) newErrors.payment_mode = 'Payment mode is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if payment amount exceeds balance
    if (formData.amount > balanceInfo.totalPayable) {
      if (!window.confirm(
        `Payment amount (₹${formData.amount.toFixed(2)}) exceeds current balance (₹${balanceInfo.totalPayable.toFixed(2)}). This will result in a negative balance. Do you want to continue?`
      )) {
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const result = await addPayment(formData);
      
      if (result.success) {
        // Reset form
        setFormData({
          worker_id: '',
          amount: 0,
          date: format(new Date(), 'yyyy-MM-dd'),
          payment_mode: 'Cash',
          narration: ''
        });
        setBalanceInfo({ totalPayable: 0, newBalance: 0 });
        alert('Payment recorded successfully!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWorker = workers.find(w => w.id === formData.worker_id);
  const workerPayments = payments.filter(p => p.worker_id === formData.worker_id);

  if (workersLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Entry</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Payment Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter payment amount"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
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
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="inline h-4 w-4 mr-1" />
                Payment Mode *
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.payment_mode ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              {errors.payment_mode && (
                <p className="mt-1 text-sm text-red-600">{errors.payment_mode}</p>
              )}
            </div>

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
                placeholder="Optional notes about the payment"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>

        {/* Balance Info and Payment History */}
        <div className="space-y-6">
          {/* Balance Display */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Information</h3>
            
            {formData.worker_id && selectedWorker ? (
              <div className="space-y-3">
                <div className="text-center mb-4">
                  <h4 className="font-medium text-gray-900">{selectedWorker.name}</h4>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Total Payable:</span>
                  <span className="font-medium">₹{balanceInfo.totalPayable.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Payment Amount:</span>
                  <span className="font-medium text-red-600">
                    -₹{formData.amount.toFixed(2)}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center py-2 px-3 rounded-md ${
                  balanceInfo.newBalance >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className="font-medium text-gray-900">New Balance:</span>
                  <span className={`font-bold text-lg ${
                    balanceInfo.newBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ₹{balanceInfo.newBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a worker to view balance information
              </p>
            )}
          </div>

          {/* Recent Payments */}
          {workerPayments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {workerPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{format(new Date(payment.date), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">{payment.payment_mode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">₹{payment.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}