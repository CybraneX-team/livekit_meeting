'use client';

import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  type = 'text',
  label,
  placeholder,
  error,
  helperText,
  id,
  className = '',
  inputClassName = '',
  labelClassName = '',
  required = false,
  disabled = false,
  ...props 
}, ref) => {
  // Generate an ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className={`block text-gray-300 mb-2 ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-400' : ''} ${labelClassName}`}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            w-full 
            bg-gray-800 
            border ${error ? 'border-red-500' : 'border-gray-700'} 
            rounded-md 
            px-3 
            py-2 
            text-white 
            transition-colors
            focus:outline-none 
            focus:border-indigo-500 
            focus:ring-1 
            focus:ring-indigo-500
            disabled:opacity-60 
            disabled:cursor-not-allowed
            ${inputClassName}
          `}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          {...props}
        />
        
        {error && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Input variants
const TextArea = forwardRef(({ 
  rows = 4,
  ...props 
}, ref) => {
  return (
    <div className={`mb-4 ${props.className || ''}`}>
      {props.label && (
        <label 
          htmlFor={props.id} 
          className={`block text-gray-300 mb-2 ${props.required ? 'after:content-["*"] after:ml-0.5 after:text-red-400' : ''} ${props.labelClassName || ''}`}
        >
          {props.label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full 
            bg-gray-800 
            border ${props.error ? 'border-red-500' : 'border-gray-700'} 
            rounded-md 
            px-3 
            py-2 
            text-white 
            transition-colors
            focus:outline-none 
            focus:border-indigo-500 
            focus:ring-1 
            focus:ring-indigo-500
            disabled:opacity-60 
            disabled:cursor-not-allowed
            ${props.inputClassName || ''}
          `}
          {...props}
        />
        
        {props.error && (
          <div className="absolute top-2 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {(props.error || props.helperText) && (
        <p className={`mt-1 text-sm ${props.error ? 'text-red-500' : 'text-gray-500'}`}>
          {props.error || props.helperText}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

// Select input
const Select = forwardRef(({ 
  options = [],
  ...props 
}, ref) => {
  return (
    <div className={`mb-4 ${props.className || ''}`}>
      {props.label && (
        <label 
          htmlFor={props.id} 
          className={`block text-gray-300 mb-2 ${props.required ? 'after:content-["*"] after:ml-0.5 after:text-red-400' : ''} ${props.labelClassName || ''}`}
        >
          {props.label}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full 
            bg-gray-800 
            border ${props.error ? 'border-red-500' : 'border-gray-700'} 
            rounded-md 
            px-3 
            py-2 
            text-white 
            transition-colors
            focus:outline-none 
            focus:border-indigo-500 
            focus:ring-1 
            focus:ring-indigo-500
            disabled:opacity-60 
            disabled:cursor-not-allowed
            appearance-none
            ${props.inputClassName || ''}
          `}
          {...props}
        >
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {props.error && (
          <div className="absolute inset-y-0 right-8 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {(props.error || props.helperText) && (
        <p className={`mt-1 text-sm ${props.error ? 'text-red-500' : 'text-gray-500'}`}>
          {props.error || props.helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Checkbox
const Checkbox = forwardRef(({ 
  label,
  checked,
  onChange,
  ...props 
}, ref) => {
  return (
    <div className="flex items-center mb-4">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-indigo-600 bg-gray-800 border-gray-700 rounded focus:ring-indigo-500 focus:ring-offset-gray-800"
        {...props}
      />
      {label && (
        <label 
          htmlFor={props.id} 
          className="ml-2 text-gray-300 cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// Export components
Input.TextArea = TextArea;
Input.Select = Select;
Input.Checkbox = Checkbox;

export default Input;