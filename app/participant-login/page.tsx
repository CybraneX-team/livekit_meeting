'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa';

export default function ParticipantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/participant-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Login successful! Redirecting...');
        // Store participant data in localStorage
        localStorage.setItem('participantData', JSON.stringify(data.participant));
        localStorage.setItem('participantToken', data.token);
        
        // Redirect to dashboard or meeting room after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <main className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Background with particles */}
      <div className="dashboard-background">
        <div className="gradient-overlay"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ 
          width: '100%', 
          maxWidth: '450px', 
          padding: '2.5rem',
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(15px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          <div style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            margin: '0 auto 1rem',
            fontSize: '1.5rem'
          }}>
            <FaUser />
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 10px rgba(96, 165, 250, 0.2)'
          }}>
            Participant Login
          </h1>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '1rem',
            margin: 0
          }}>
            Enter your credentials to access the meeting
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
        >
          {/* Email Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="email"
              style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 3rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                  e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
                }}
              />
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '1rem'
              }}>
                <FaUser />
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '2rem' }}>
            <label 
              htmlFor="password"
              style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 3rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                  e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
                }}
              />
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '1rem'
              }}>
                <FaLock />
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444', 
                fontSize: '0.875rem', 
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e', 
                fontSize: '0.875rem', 
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}
            >
              {success}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: isLoading ? '#64748b' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Signing In...
              </>
            ) : (
              <>
                <FaSignInAlt />
                Sign In
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ 
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: 'rgba(51, 65, 85, 0.3)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(51, 65, 85, 0.5)'
          }}
        >
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            margin: '0 0 1rem 0',
            color: '#f8fafc'
          }}>
            Demo Credentials
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>John Doe:</strong> john@example.com / password123
            </p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Jane Smith:</strong> jane@example.com / password456
            </p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Bob Wilson:</strong> bob@example.com / password789
            </p>
          </div>
        </motion.div>

        {/* Back to Dashboard Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ 
            textAlign: 'center', 
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(51, 65, 85, 0.5)'
          }}
        >
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline'
            }}
          >
            ← Back to Dashboard
          </button>
        </motion.div>
      </motion.div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
} 