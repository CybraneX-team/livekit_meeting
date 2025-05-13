'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomId, encodePassphrase, randomString } from '@/lib/client-utils';

const CreateMeeting = () => {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [isLoading, setIsLoading] = useState(false);
  const [meetingName, setMeetingName] = useState('');

  // Function to create and join a meeting
  const createMeeting = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newRoomId = generateRoomId();
      if (e2ee) {
        router.push(`/rooms/${newRoomId}#${encodePassphrase(sharedPassphrase)}`);
      } else {
        router.push(`/rooms/${newRoomId}`);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-white">Start a New Meeting</h2>
      
      <div className="mb-4">
        <label htmlFor="meetingName" className="block text-gray-300 mb-2">Meeting Name (Optional)</label>
        <input
          id="meetingName"
          type="text"
          value={meetingName}
          onChange={(e) => setMeetingName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
          placeholder="Quick Team Sync"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <input
            id="use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
            className="w-4 h-4 mr-2"
          />
          <label htmlFor="use-e2ee" className="text-gray-300">Enable end-to-end encryption</label>
        </div>
        
        {e2ee && (
          <div className="mb-4 animate-fade-in">
            <label htmlFor="passphrase" className="block text-gray-300 mb-2">Encryption Passphrase</label>
            <div className="relative">
              <input
                id="passphrase"
                type="password"
                value={sharedPassphrase}
                onChange={(ev) => setSharedPassphrase(ev.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">This passphrase will be used to encrypt your meeting. Keep it secure.</p>
          </div>
        )}
        
        <button 
          onClick={createMeeting} 
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all flex justify-center items-center"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Start New Meeting Now"
          )}
        </button>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-400">Your meeting link will be generated automatically.</p>
        <p className="text-sm text-gray-400">You can share it with participants after creation.</p>
      </div>
    </div>
  );
};

export default CreateMeeting;