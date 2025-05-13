'use client';

import React, { useState } from 'react';

const Tabs = ({ 
  children, 
  defaultTab = 0,
  variant = 'default',
  onChange,
  className = '',
  tabsClassName = '',
  contentClassName = '',
  ...props 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Get children as array
  const childrenArray = React.Children.toArray(children);
  
  // Create an array of tab elements
  const tabs = childrenArray.map((child, index) => {
    // Make sure we only handle Tab components
    if (child.type !== Tab) {
      console.warn('Tabs component only accepts Tab components as children');
      return null;
    }
    
    return React.cloneElement(child, {
      key: index,
      isActive: activeTab === index,
      onClick: () => {
        setActiveTab(index);
        if (onChange) onChange(index);
      },
      variant
    });
  });
  
  // Get the content of the active tab
  const activeContent = childrenArray[activeTab]?.props.children || null;
  
  // Define variant classes for the tabs container
  const variantClasses = {
    default: 'border-b border-gray-800',
    pills: 'space-x-2 mb-4',
    underline: 'border-b border-gray-800',
  };
  
  return (
    <div className={`tabs-container ${className}`} {...props}>
      <div className={`flex ${variantClasses[variant]} ${tabsClassName}`}>
        {tabs}
      </div>
      <div className={`tab-content py-4 ${contentClassName}`}>
        {activeContent}
      </div>
    </div>
  );
};

// Tab component
const Tab = ({ 
  label, 
  isActive = false, 
  onClick,
  className = '',
  variant = 'default',
  ...props 
}) => {
  // Define variant classes for tabs
  const variantClasses = {
    default: isActive 
      ? 'bg-gray-800 text-white' 
      : 'text-gray-400 hover:text-white',
    pills: isActive 
      ? 'bg-indigo-600 text-white' 
      : 'bg-gray-800 text-gray-300 hover:text-white',
    underline: isActive 
      ? 'border-b-2 border-indigo-600 text-white' 
      : 'text-gray-400 hover:text-white',
  };
  
  // Common classes
  const commonClasses = 'py-3 px-4 text-center transition-all cursor-pointer';
  
  // Specific classes per variant
  const specificClasses = {
    default: 'flex-1',
    pills: 'rounded-md',
    underline: 'border-b-2 border-transparent -mb-px',
  };
  
  return (
    <div 
      className={`${commonClasses} ${specificClasses[variant]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {label}
    </div>
  );
};

// Export both components
Tabs.Tab = Tab;
export { Tabs, Tab };
export default Tabs;