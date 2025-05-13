'use client';

import React from 'react';
import Dashboard from '../../components/Dashboard';
import EnhancedDashboard from '../../components/EnhancedDashboard';
import '../../styles/dashboard.css';

export default function Page() {
  return (
    <main>
      <EnhancedDashboard />
    </main>
  );
}