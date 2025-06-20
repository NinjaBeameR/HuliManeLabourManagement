import React, { useState, useEffect } from 'react';
import { Download, Filter, FileText, BarChart3 } from 'lucide-react';
import { useWorkers, useAttendance, usePayments, calculateWorkerBalance } from '../../hooks/useSupabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface FilterState {
  workerId: string;
  startDate: string;
  endDate: string;
  reportType: 'detailed' | 'summary';
}

interface DetailedReportRow {
  date: string;
  workerName: string;
  attendanceStatus: string;
  category: string;
  subcategory: string;
  wageAmount: number;
  paymentAmount: number;
  runningBalance: number;
  narration: string;
}

interface SummaryReportRow {
  workerName: string;
  phone: string;
  address: string;
  openingBalance: number;
  totalAttendance: number;
  totalWages: number;
  totalPayments: number;
  netBalance: number;
}

export default function ReportsModule() {
  const { workers } = useWorkers();
  const { records, fetchAttendanceRecords, loading: attendanceLoading } = useAttendance();
  const { payments, fetchPayments, loading: paymentsLoading } = usePayments();
  
  const [filters, setFilters] = useState<FilterState>({
    workerId: '',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    reportType: 'detailed'
  });
  
  const [reportData, setReportData] = useState<{
    detailed: DetailedReportRow[];
    summary: SummaryReportRow[];
  }>({
    detailed: [],
    summary: []
  });
  
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters.workerId, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (records.length > 0 || payments.length > 0) {
      generateReportData();
    }
  }, [records, payments, workers]);

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

  const generateReportData = async () => {
    setGenerating(true);

    try {
      // Generate detailed report data
      const detailedData: DetailedReportRow[] = [];
      const summaryData: SummaryReportRow[] = [];

      // Combine attendance and payment records, sort by date
      const allTransactions = [
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
          date: p.date,
          worker: workers.find(w => w.id === p.worker_id)
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Group transactions by worker for running balance
      const workerBalances: { [workerId: string]: number } = {};
      workers.forEach(worker => {
        workerBalances[worker.id] = worker.opening_balance || 0;
      });

      // Generate detailed report data per worker
      for (const worker of workers) {
        // If a specific worker is selected, skip others
        if (filters.workerId && worker.id !== filters.workerId) continue;

        let runningBalance = worker.opening_balance || 0;

        // Get all transactions for this worker, sorted by date
        const workerTransactions = allTransactions
          .filter(t => {
            const id = t.worker_id ?? (t.worker ? t.worker.id : undefined);
            return id === worker.id;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const transaction of workerTransactions) {
          let wageAmount = 0;
          let paymentAmount = 0;
          let attendanceStatus = '';
          let category = '';
          let subcategory = '';
          let narration = '';

          if (transaction.type === 'attendance') {
            wageAmount = transaction.amount || 0;
            attendanceStatus = transaction.status;
            category = transaction.category?.name || '';
            subcategory = transaction.subcategory?.name || '';
            narration = transaction.narration || '';
            runningBalance += wageAmount;
          } else {
            paymentAmount = Math.abs(transaction.amount);
            narration = transaction.narration || '';
            runningBalance -= paymentAmount;
          }

          detailedData.push({
            date: format(new Date(transaction.date), 'yyyy-MM-dd'),
            workerName: worker.name,
            attendanceStatus,
            category,
            subcategory,
            wageAmount,
            paymentAmount,
            runningBalance,
            narration
          });
        }
      }

      // Generate summary report (already correct)
      for (const worker of workers) {
        const workerAttendance = records.filter(r => r.worker_id === worker.id);
        const workerPayments = payments.filter(p => p.worker_id === worker.id);

        const totalAttendance = workerAttendance.filter(r => r.status !== 'absent').length;
        const totalWages = workerAttendance.reduce((sum, r) => sum + (r.amount || 0), 0);
        const totalPayments = workerPayments.reduce((sum, p) => sum + p.amount, 0);
        const netBalance = await calculateWorkerBalance(worker.id);

        summaryData.push({
          workerName: worker.name,
          phone: worker.phone || '',
          address: worker.address || '',
          openingBalance: worker.opening_balance,
          totalAttendance,
          totalWages,
          totalPayments,
          netBalance
        });
      }

      setReportData({ detailed: detailedData, summary: summaryData });
    } finally {
      setGenerating(false);
    }
  };

  const downloadCSV = (reportType: 'detailed' | 'summary') => {
    const data = reportType === 'detailed' ? reportData.detailed : reportData.summary;
    
    if (data.length === 0) {
      alert('No data available for export');
      return;
    }

    let csvContent = '';
    
    if (reportType === 'detailed') {
      // Detailed report headers
      csvContent = 'Date,Worker Name,Attendance Status,Category,Subcategory,Wage Amount,Payment Amount,Running Balance,Narration\n';
      
      (data as DetailedReportRow[]).forEach((row: DetailedReportRow) => {
        csvContent += `${row.date},"${row.workerName}","${row.attendanceStatus}","${row.category}","${row.subcategory}",${row.wageAmount},${row.paymentAmount},${row.runningBalance},"${row.narration}"\n`;
      });
    } else {
      // Summary report headers
      csvContent = 'Worker Name,Phone,Address,Opening Balance,Total Attendance,Total Wages,Total Payments,Net Balance\n';
      
      (data as SummaryReportRow[]).forEach((row: SummaryReportRow) => {
        csvContent += `"${row.workerName}","${row.phone}","${row.address}",${row.openingBalance},${row.totalAttendance},${row.totalWages},${row.totalPayments},${row.netBalance}\n`;
      });
    }

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hulimane_${reportType}_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilters({
      workerId: '',
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      reportType: 'detailed'
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports</h2>
      
      {/* Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value as 'detailed' | 'summary' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="detailed">Detailed Report</option>
              <option value="summary">Summary Report</option>
            </select>
          </div>
          
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

      {/* Report Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Generate Reports</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => downloadCSV('detailed')}
              disabled={generating || attendanceLoading || paymentsLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Detailed Report
            </button>
            <button
              onClick={() => downloadCSV('summary')}
              disabled={generating || attendanceLoading || paymentsLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Summary Report
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detailed Report Info */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900">Detailed Report</h4>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Complete transaction-level report including:
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Date-wise transactions</li>
              <li>• Worker attendance status</li>
              <li>• Category and subcategory details</li>
              <li>• Wage and payment amounts</li>
              <li>• Running balance calculations</li>
              <li>• Transaction narrations</li>
            </ul>
            <div className="mt-3 text-sm font-medium text-blue-900">
              Records: {reportData.detailed.length}
            </div>
          </div>
          
          {/* Summary Report Info */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center mb-3">
              <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-900">Summary Report</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Worker-wise summary report including:
            </p>
            <ul className="text-xs text-green-600 space-y-1">
              <li>• Worker contact details</li>
              <li>• Opening balance</li>
              <li>• Total attendance count</li>
              <li>• Total wages earned</li>
              <li>• Total payments received</li>
              <li>• Current net balance</li>
            </ul>
            <div className="mt-3 text-sm font-medium text-green-900">
              Workers: {reportData.summary.length}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
          <div className="text-sm text-gray-500">
            {filters.reportType === 'detailed' ? 'Detailed' : 'Summary'} Report • 
            {filters.workerId ? workers.find(w => w.id === filters.workerId)?.name : 'All Workers'} • 
            {format(new Date(filters.startDate), 'MMM dd')} - {format(new Date(filters.endDate), 'MMM dd, yyyy')}
          </div>
        </div>
        
        {generating || attendanceLoading || paymentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Generating report...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filters.reportType === 'detailed' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wage</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.detailed.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(row.date), 'MMM dd')}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{row.workerName}</td>
                      <td className="px-3 py-2 text-sm">
                        {row.attendanceStatus && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.attendanceStatus === 'present' ? 'bg-green-100 text-green-800' :
                            row.attendanceStatus === 'absent' ? 'bg-red-100 text-red-800' :
                            row.attendanceStatus === 'halfday' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {row.attendanceStatus || 'Payment'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{row.category} {row.subcategory && `• ${row.subcategory}`}</td>
                      <td className="px-3 py-2 text-sm text-green-600 font-medium">
                        {row.wageAmount > 0 && `₹${row.wageAmount.toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 text-sm text-red-600 font-medium">
                        {row.paymentAmount > 0 && `₹${row.paymentAmount.toFixed(2)}`}
                      </td>
                      <td className={`px-3 py-2 text-sm font-medium ${
                        row.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{row.runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wages</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.summary.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{row.workerName}</div>
                        <div className="text-xs text-gray-500">{row.address}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{row.phone}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">₹{row.openingBalance.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{row.totalAttendance}</td>
                      <td className="px-3 py-2 text-sm text-green-600 font-medium">₹{row.totalWages.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-red-600 font-medium">₹{row.totalPayments.toFixed(2)}</td>
                      <td className={`px-3 py-2 text-sm font-bold ${
                        row.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{row.netBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {(filters.reportType === 'detailed' ? reportData.detailed.length : reportData.summary.length) > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing first 10 records. Download full report to see all {filters.reportType === 'detailed' ? reportData.detailed.length : reportData.summary.length} records.
              </div>
            )}
            
            {(filters.reportType === 'detailed' ? reportData.detailed.length : reportData.summary.length) === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                <p className="text-gray-500">Try adjusting your filters to see report data.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}