'use client';

import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
  isLoading = false,
  ...props 
}) => {
  // Define variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700',
    secondary: 'bg-gray-800 text-white hover:bg-gray-700',
    outline: 'bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700',
  };

  // Define size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  // Create combined classes
  const buttonClasses = `
    ${variantClasses[variant]} 
    ${sizeClasses[size]} 
    ${fullWidth ? 'w-full' : ''} 
    rounded-md transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
    disabled:opacity-60 disabled:cursor-not-allowed
    flex items-center justify-center
    ${className}
  `;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;