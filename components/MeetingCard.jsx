'use client';

import React from 'react';

const MeetingCard = ({ meeting, onJoin }) => {
  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="luxury-card p-5 animate-fade-in">
      <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-600 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"></div>
      
      <h3 className="font-semibold text-white text-lg mb-2">{meeting.name}</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-400 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(meeting.date)}</span>
        </div>
        
        <div className="flex items-center text-gray-400 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{meeting.time}</span>
        </div>
        
        <div className="flex items-center text-gray-400 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span>{meeting.e2ee ? 'End-to-End Encrypted' : 'Standard Encryption'}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div className="text-xs bg-gray-800 rounded-full px-3 py-1 text-gray-400">
          ID: {meeting.id.substring(0, 8)}...
        </div>
        
        <button 
          onClick={() => onJoin(meeting)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all text-sm"
        >
          Join
        </button>
      </div>
      
      <div className="absolute w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full opacity-5 -bottom-12 -left-12"></div>
    </div>
  );
};

export default MeetingCard;