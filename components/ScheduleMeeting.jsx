'use client';

import React, { useState } from 'react';
import { generateRoomId, randomString } from '@/lib/client-utils';

const ScheduleMeeting = ({ onSchedule }) => {
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  // Function to schedule a meeting
  const scheduleMeeting = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call or processing
    setTimeout(() => {
      const newMeeting = {
        id: generateRoomId(),
        name: meetingName,
        date: meetingDate,
        time: meetingTime,
        duration: duration,
        e2ee: e2ee,
        passphrase: e2ee ? sharedPassphrase : null,
        createdAt: new Date().toISOString()
      };
      
      // Call the parent handler with the new meeting
      onSchedule(newMeeting);
      
      // Reset form
      setMeetingName('');
      setMeetingDate('');
      setMeetingTime('');
      setDuration('60');
      setE2ee(false);
      setSharedPassphrase(randomString(64));
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-white">Schedule a Meeting</h2>
      <form onSubmit={scheduleMeeting}>
        <div className="space-y-4">
          <div>
            <label htmlFor="meetingName" className="block text-gray-300 mb-2">Meeting Name</label>
            <input
              id="meetingName"
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              placeholder="Quarterly Review"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="meetingDate" className="block text-gray-300 mb-2">Date</label>
              <input
                id="meetingDate"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
                min={today}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            
            <div>
              <label htmlFor="meetingTime" className="block text-gray-300 mb-2">Start Time</label>
              <input
                id="meetingTime"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="duration" className="block text-gray-300 mb-2">Duration (minutes)</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              id="schedule-e2ee"
              type="checkbox"
              checked={e2ee}
              onChange={(ev) => setE2ee(ev.target.checked)}
              className="w-4 h-4 mr-2"
            />
            <label htmlFor="schedule-e2ee" className="text-gray-300">Enable end-to-end encryption</label>
          </div>
          
          {e2ee && (
            <div className="animate-fade-in">
              <label htmlFor="schedule-passphrase" className="block text-gray-300 mb-2">Encryption Passphrase</label>
              <input
                id="schedule-passphrase"
                type="password"
                value={sharedPassphrase}
                onChange={(ev) => setSharedPassphrase(ev.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">This passphrase will be used to encrypt your meeting. Share it with participants.</p>
            </div>
          )}
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all flex justify-center items-center"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Schedule Meeting"
          )}
        </button>
      </form>
    </div>
  );
};

export default ScheduleMeeting;