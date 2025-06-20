import React, { useState, useEffect } from 'react';
import { Filter, User, Calendar, BarChart3, DollarSign } from 'lucide-react';
import { useWorkers, useAttendance, usePayments, calculateWorkerBalance } from '../../hooks/useSupabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface FilterState {
  workerId: string;
  startDate: string;
  endDate: string;
}

export default function SummaryDashboard() {
  const { workers } = useWorkers();
  const { records, fetchAttendanceRecords, loading: attendanceLoading } = useAttendance();
  const { payments, fetchPayments, loading: paymentsLoading } = usePayments();
  
  const [filters, setFilters] = useState<FilterState>({
    workerId: '',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const [workerBalances, setWorkerBalances] = useState<Record<string, number>>({});
  const [statistics, setStatistics] = useState({
    totalWorkers: 0,
    totalAttendance: 0,
    totalWages: 0,
    totalPayments: 0,
    netBalance: 0
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (workers.length > 0) {
      loadWorkerBalances();
    }
  }, [workers, records, payments]);

  const fetchData = () => {
    fetchAttendanceRecords(
      filters.workerId || undefined,
      filters.startDate,
      filters.endDate
    );
    fetchPayments(
      filters.workerId || undefined,
      filters.startDate,
      filters.endDate
    );
  };

  const loadWorkerBalances = async () => {
    const balances: Record<string, number> = {};
    
    for (const worker of workers) {
      const balance = await calculateWorkerBalance(worker.id);
      balances[worker.id] = balance;
    }
    
    setWorkerBalances(balances);
    
    // Calculate statistics
    const totalWages = records.reduce((sum, record) => 
      sum + (record.amount || 0), 0
    );
    const totalPayments = payments.reduce((sum, payment) => 
      sum + payment.amount, 0
    );
    const netBalance = Object.values(balances).reduce((sum, balance) => 
      sum + balance, 0
    );
    
    setStatistics({
      totalWorkers: workers.length,
      totalAttendance: records.filter(r => r.status !== 'absent').length,
      totalWages,
      totalPayments,
      netBalance
    });
  };

  const resetFilters = () => {
    setFilters({
      workerId: '',
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
  };

  const selectedWorker = workers.find(w => w.id === filters.workerId);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Summary Dashboard</h2>
      
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Worker
            </label>
            <select
              value={filters.workerId}
              onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Workers</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalWorkers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalAttendance}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Wages</p>
              <p className="text-2xl font-bold text-gray-900">₹{statistics.totalWages.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Balance</p>
              <p className={`text-2xl font-bold ${
                statistics.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{statistics.netBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction History */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          
          {attendanceLoading || paymentsLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Combine and sort attendance and payment records */}
              {[
                ...records.map(r => ({
                  ...r,
                  type: 'attendance' as const,
                  amount: r.amount || 0,
                  date: r.date
                })),
                ...payments.map(p => ({
                  ...p,
                  type: 'payment' as const,
                  amount: -p.amount,
                  date: p.date
                }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((transaction, index) => (
                  <div key={`${transaction.type}-${transaction.id}`} 
                       className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium">
                        {'worker' in transaction ? transaction.worker?.name : 
                         workers.find(w => w.id === transaction.worker_id)?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')} • 
                        {transaction.type === 'attendance' ? 
                          ` ${transaction.status} ${transaction.category?.name || ''}` :
                          ` Payment (${transaction.payment_mode})`
                        }
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}₹{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              }
              
              {records.length === 0 && payments.length === 0 && (
                <p className="text-gray-500 text-center py-8">No transactions found</p>
              )}
            </div>
          )}
        </div>

        {/* Worker Balances */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Worker Balances</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filters.workerId ? (
              selectedWorker && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedWorker.name}</h4>
                      <p className="text-sm text-gray-600">Current Balance</p>
                    </div>
                    <div className={`text-xl font-bold ${
                      workerBalances[selectedWorker.id] >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{(workerBalances[selectedWorker.id] || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              )
            ) : (
              workers.map((worker) => (
                <div key={worker.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium">{worker.name}</div>
                    {worker.phone && (
                      <div className="text-sm text-gray-500">{worker.phone}</div>
                    )}
                  </div>
                  <div className={`font-bold ${
                    workerBalances[worker.id] >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ₹{(workerBalances[worker.id] || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
            
            {workers.length === 0 && (
              <p className="text-gray-500 text-center py-8">No workers found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}