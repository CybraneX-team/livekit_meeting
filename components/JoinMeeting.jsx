'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodePassphrase } from '@/lib/client-utils';

const JoinMeeting = () => {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState('');
  const [e2ee, setE2ee] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to join a meeting
  const joinMeeting = (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!meetingId.trim()) {
      setError('Please enter a valid meeting ID');
      return;
    }
    
    if (e2ee && !passphrase.trim()) {
      setError('Please enter the encryption passphrase');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call or validation
    setTimeout(() => {
      try {
        if (e2ee) {
          router.push(`/rooms/${meetingId.trim()}#${encodePassphrase(passphrase)}`);
        } else {
          router.push(`/rooms/${meetingId.trim()}`);
        }
      } catch (err) {
        setError('Failed to join meeting. Please check your meeting ID and try again.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-white">Join a Meeting</h2>
      
      {error && (
        <div className="bg-red-900 bg-opacity-30 border border-red-600 text-red-400 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={joinMeeting}>
        <div className="mb-4">
          <label htmlFor="meetingId" className="block text-gray-300 mb-2">Meeting ID</label>
          <input
            id="meetingId"
            type="text"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="Enter meeting ID"
          />
        </div>
        
        <div className="flex items-center mb-4">
          <input
            id="join-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
            className="w-4 h-4 mr-2"
          />
          <label htmlFor="join-e2ee" className="text-gray-300">This meeting uses end-to-end encryption</label>
        </div>
        
        {e2ee && (
          <div className="mb-4 animate-fade-in">
            <label htmlFor="join-passphrase" className="block text-gray-300 mb-2">Encryption Passphrase</label>
            <input
              id="join-passphrase"
              type="password"
              value={passphrase}
              onChange={(ev) => setPassphrase(ev.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              placeholder="Enter the meeting passphrase"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the passphrase shared by the meeting organizer.</p>
          </div>
        )}
        
        <button 
          type="submit"
          disabled={isLoading || !meetingId}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all flex justify-center items-center"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Join Meeting"
          )}
        </button>
      </form>
      
      <div className="mt-8 p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
        <h3 className="text-white text-lg mb-2">Need to join by phone?</h3>
        <p className="text-gray-400 mb-2">Dial one of these numbers:</p>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>US: +1 (555) 123-4567</li>
          <li>UK: +44 (0) 203 123 4567</li>
        </ul>
        <p className="text-gray-400 text-sm mt-2">Then enter your meeting ID when prompted.</p>
      </div>
    </div>
  );
};

export default JoinMeeting;