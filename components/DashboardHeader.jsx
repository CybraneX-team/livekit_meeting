'use client';

import React, { useState, useEffect } from 'react';

const DashboardHeader = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    // Update time every second
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
      
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">LiveKit Meet</h1>
        <p className="header-subtitle">Secure and elegant video conferencing solution</p>
      </div>
      
      <div className="header-right">
        <div className="time-display">
          <div className="current-time">{currentTime}</div>
          <div className="current-date">{currentDate}</div>
        </div>
      </div>
      
      {/* Animated background elements */}
      <div className="header-bg-element-1"></div>
      <div className="header-bg-element-2"></div>
    </div>
  );
};

export default DashboardHeader;