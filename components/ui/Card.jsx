'use client';

import React from 'react';

const Card = ({ 
  children, 
  className = '',
  variant = 'default',
  hover = false,
  ...props 
}) => {
  // Define variant classes
  const variantClasses = {
    default: 'bg-gray-900 border border-gray-800',
    glass: 'glass-effect backdrop-blur-md bg-opacity-30',
    gradient: 'bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800',
  };

  // Create combined classes
  const cardClasses = `
    ${variantClasses[variant]}
    rounded-lg overflow-hidden
    ${hover ? 'transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-lg' : ''}
    ${className}
  `;

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

// Card subcomponents
Card.Header = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 md:p-6 border-b border-gray-800 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Body = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 md:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 md:p-6 border-t border-gray-800 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Title = ({ children, className = '', ...props }) => {
  return (
    <h3 className={`text-xl font-semibold text-white mb-2 ${className}`} {...props}>
      {children}
    </h3>
  );
};

Card.Subtitle = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-gray-400 ${className}`} {...props}>
      {children}
    </p>
  );
};

export default Card;