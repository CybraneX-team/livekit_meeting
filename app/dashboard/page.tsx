'use client';

import React, { useState } from 'react';
import EnhancedDashboard from '../../components/EnhancedDashboard';
import '../../styles/dashboard.css';

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '2rem',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(51, 65, 85, 0.5)'
        }}>
          <form onSubmit={handleSubmit}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              color: '#f8fafc'
            }}>
              Dashboard Access
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem'
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>
            {error && (
              <p style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                marginBottom: '1rem' 
              }}>
                {error}
              </p>
            )}
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                className="action-button"
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.7)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Access Dashboard
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      <EnhancedDashboard />
    </main>
  );
}