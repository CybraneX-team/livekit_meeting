'use client';

import React, { useState } from 'react';
import MeetingCard from './MeetingCard';

const MeetingsList = ({ meetings, onJoinMeeting }) => {
  const [filterType, setFilterType] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  // Function to filter meetings based on search and filter type
  const filteredMeetings = () => {
    // First apply search filter
    let filtered = meetings;
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.name.toLowerCase().includes(term) || 
        meeting.id.toLowerCase().includes(term)
      );
    }
    
    // Then apply date filter
    if (filterType === 'upcoming') {
      const now = new Date();
      return filtered.filter(meeting => {
        const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
        return meetingDateTime >= now;
      }).sort((a, b) => {
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
      });
    } else if (filterType === 'past') {
      const now = new Date();
      return filtered.filter(meeting => {
        const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
        return meetingDateTime < now;
      }).sort((a, b) => {
        return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
      });
    } else if (filterType === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return filtered.filter(meeting => meeting.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));
    }
    
    return filtered;
  };
  
  const displayedMeetings = filteredMeetings();

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-white">My Meetings</h2>
      
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilterType('upcoming')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              filterType === 'upcoming' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setFilterType('today')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              filterType === 'today' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setFilterType('past')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              filterType === 'past' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Past
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meetings..."
            className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-2 text-white"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {displayedMeetings.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 bg-opacity-30 rounded-lg border border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">No meetings found</h3>
          <p className="text-gray-400 mb-4">
            {filterType === 'upcoming' && "You don't have any upcoming meetings."}
            {filterType === 'today' && "You don't have any meetings scheduled for today."}
            {filterType === 'past' && "You don't have any past meetings."}
            {searchTerm && "No meetings match your search criteria."}
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterType('upcoming');
            }}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {displayedMeetings.map((meeting, index) => (
            <MeetingCard 
              key={meeting.id || index} 
              meeting={meeting} 
              onJoin={onJoinMeeting} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingsList;