import React, { useState } from 'react';
import Layout from './components/Layout';
import MasterModule from './components/master/MasterModule';
import AttendanceForm from './components/attendance/AttendanceForm';
import PaymentForm from './components/payment/PaymentForm';
import SummaryDashboard from './components/summary/SummaryDashboard';
import ReportsModule from './components/reports/ReportsModule';

export default function App() {
  const [currentView, setCurrentView] = useState('master');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'master':
        return <MasterModule />;
      case 'attendance':
        return <AttendanceForm />;
      case 'payment':
        return <PaymentForm />;
      case 'summary':
        return <SummaryDashboard />;
      case 'reports':
        return <ReportsModule />;
      default:
        return <MasterModule />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderCurrentView()}
    </Layout>
  );
}