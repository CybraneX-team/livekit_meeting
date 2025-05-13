'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomId, encodePassphrase, randomString } from '@/lib/client-utils';

const Dashboard = () => {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDateTime, setMeetingDateTime] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [pastMeetings, setPastMeetings] = useState([]);
  const [recordings, setRecordings] = useState([]);
  
  // Set current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
      
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      
      // Default meeting time (now + 1 hour)
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
      setMeetingDateTime(futureTime.toISOString().slice(0, 16));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Load sample data
  useEffect(() => {
    // Load saved meetings from localStorage if available
    const savedMeetings = localStorage.getItem('scheduledMeetings');
    if (savedMeetings) {
      try {
        setScheduledMeetings(JSON.parse(savedMeetings));
      } catch (error) {
        console.error('Error parsing saved meetings:', error);
      }
    } else {
      // Sample data
      setScheduledMeetings([
        {
          id: 'meeting-123',
          title: 'Weekly Team Sync',
          date: '2025-03-12T14:00:00',
          participants: 8
        },
        {
          id: 'meeting-456',
          title: 'Product Review',
          date: '2025-03-15T10:30:00',
          participants: 5
        }
      ]);
    }
    
    // Set sample past meetings
    setPastMeetings([
      {
        id: 'past-123',
        title: 'Client Presentation',
        date: '2025-03-01T15:00:00',
        duration: '45 min',
        participants: 12
      },
      {
        id: 'past-456',
        title: 'Project Kickoff',
        date: '2025-02-25T11:00:00',
        duration: '60 min',
        participants: 7
      }
    ]);
    
    // Set sample recordings
    setRecordings([
      {
        id: 'rec-123',
        title: 'Quarterly Planning',
        date: '2025-02-20T09:00:00',
        duration: '90 min',
        size: '250 MB'
      },
      {
        id: 'rec-456',
        title: 'Training Session',
        date: '2025-02-15T13:30:00',
        duration: '120 min',
        size: '350 MB'
      }
    ]);
  }, []);
  
  // Save meetings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('scheduledMeetings', JSON.stringify(scheduledMeetings));
  }, [scheduledMeetings]);
  
  // Handle sidebar navigation
  const handleNavigation = (section) => {
    setActiveSection(section);
  };
  
  // Handle start new meeting
  const handleNewMeeting = () => {
    setModalType('start');
    setShowModal(true);
  };
  
  // Handle join meeting
  const handleJoinMeeting = () => {
    setModalType('join');
    setShowModal(true);
    setMeetingLink('');
  };
  
  // Handle schedule meeting
  const handleScheduleMeeting = () => {
    setModalType('schedule');
    setShowModal(true);
    setMeetingDescription('');
    
    // Set default date time (current time + 1 hour)
    const now = new Date();
    const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
    setMeetingDateTime(futureTime.toISOString().slice(0, 16));
  };
  
  // Start an instant meeting
  const startMeeting = () => {
    const newRoomId = generateRoomId();
    setShowModal(false);
    router.push(`/rooms/${newRoomId}`);
  };
  
  // Join a meeting with link
  const joinMeeting = () => {
    if (!meetingLink) return;
    
    // Extract meeting ID from link if needed
    let meetingId = meetingLink;
    if (meetingLink.includes('/')) {
      const parts = meetingLink.split('/');
      meetingId = parts[parts.length - 1];
    }
    
    setShowModal(false);
    router.push(`/rooms/${meetingId}`);
  };
  
  // Schedule a meeting
  const scheduleMeeting = () => {
    // Create a new meeting object
    const newMeeting = {
      id: 'meeting-' + Date.now(),
      title: meetingDescription || 'Untitled Meeting',
      date: meetingDateTime,
      participants: 0
    };
    
    // Add to scheduled meetings
    setScheduledMeetings([...scheduledMeetings, newMeeting]);
    setShowModal(false);
    
    // Switch to upcoming view
    setActiveSection('upcoming');
    
    // You could add a toast notification here
    alert("Meeting scheduled for " + new Date(meetingDateTime).toLocaleString());
  };
  
  // Handle personal room
  const openPersonalRoom = () => {
    const personalRoomId = 'personal-' + Date.now();
    router.push(`/rooms/${personalRoomId}`);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div 
          className={`sidebar-item ${activeSection === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigation('home')}
        >
          <svg viewBox="0 0 24 24" className="sidebar-icon">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Home</span>
        </div>
        
        <div 
          className={`sidebar-item ${activeSection === 'upcoming' ? 'active' : ''}`}
          onClick={() => handleNavigation('upcoming')}
        >
          <svg viewBox="0 0 24 24" className="sidebar-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Upcoming</span>
        </div>
        
        <div 
          className={`sidebar-item ${activeSection === 'previous' ? 'active' : ''}`}
          onClick={() => handleNavigation('previous')}
        >
          <svg viewBox="0 0 24 24" className="sidebar-icon">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="17 17 12 12 17 7"></polyline>
          </svg>
          <span>Previous</span>
        </div>
        
        <div 
          className={`sidebar-item ${activeSection === 'recordings' ? 'active' : ''}`}
          onClick={() => handleNavigation('recordings')}
        >
          <svg viewBox="0 0 24 24" className="sidebar-icon">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>Recordings</span>
        </div>
        
        <div 
          className={`sidebar-item ${activeSection === 'personal' ? 'active' : ''}`}
          onClick={() => openPersonalRoom()}
        >
          <svg viewBox="0 0 24 24" className="sidebar-icon">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          <span>Personal Room</span>
        </div>
      </div>
      
      {/* Main content */}
      <div className="main-content">
        {/* Header with time */}
        <div className="time-header">
          <div className="time-display">
            <h1>{currentTime}</h1>
            <p>{currentDate}</p>
          </div>
        </div>
        
        {/* Home Section - Action cards */}

{activeSection === 'home' && (
  <div className="action-cards">
    {/* New Meeting card */}
    <div className="action-card orange" onClick={handleNewMeeting}>
      <div className="card-icon">
        <svg viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <div className="card-content">
        <h3>New Meeting</h3>
        <p>Start an instant meeting</p>
      </div>
    </div>
    
    {/* Join Meeting card */}
    <div className="action-card purple" onClick={handleJoinMeeting}>
      <div className="card-icon">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="10" r="3"></circle>
          <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z"></path>
        </svg>
      </div>
      <div className="card-content">
        <h3>Join Meeting</h3>
        <p>via invitation link</p>
      </div>
    </div>
    
    {/* Schedule Meeting card */}
    <div className="action-card violet" onClick={handleScheduleMeeting}>
      <div className="card-icon">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <div className="card-content">
        <h3>Schedule Meeting</h3>
        <p>Plan your meeting</p>
      </div>
    </div>
    
    {/* View Recordings card */}
    <div 
      className="action-card yellow" 
      onClick={() => handleNavigation('recordings')}
    >
      <div className="card-icon">
        <svg viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
          <line x1="7" y1="2" x2="7" y2="22"></line>
          <line x1="17" y1="2" x2="17" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <line x1="2" y1="7" x2="7" y2="7"></line>
          <line x1="2" y1="17" x2="7" y2="17"></line>
          <line x1="17" y1="17" x2="22" y2="17"></line>
          <line x1="17" y1="7" x2="22" y2="7"></line>
        </svg>
      </div>
      <div className="card-content">
        <h3>View Recordings</h3>
        <p>Meeting Recordings</p>
      </div>
    </div>
  </div>
)}
        
        {/* Upcoming Meetings Section */}
        {activeSection === 'upcoming' && (
          <div className="section-content">
            <h2 className="section-title">Upcoming Meetings</h2>
            
            {scheduledMeetings.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" className="empty-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>No upcoming meetings</p>
                <button className="action-button" onClick={handleScheduleMeeting}>
                  Schedule a Meeting
                </button>
              </div>
            ) : (
              <div className="meeting-list">
                {scheduledMeetings.map(meeting => (
                  <div key={meeting.id} className="meeting-item">
                    <div className="meeting-details">
                      <h3>{meeting.title}</h3>
                      <p>{formatDate(meeting.date)}</p>
                      {meeting.participants > 0 && (
                        <span className="meeting-participants">
                          {meeting.participants} participants
                        </span>
                      )}
                    </div>
                    <div className="meeting-actions">
                      <button 
                        className="join-button"
                        onClick={() => router.push(`/rooms/${meeting.id}`)}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="floating-action-button" onClick={handleScheduleMeeting}>
              <svg viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        )}
        
        {/* Previous Meetings Section */}
        {activeSection === 'previous' && (
          <div className="section-content">
            <h2 className="section-title">Previous Meetings</h2>
            
            {pastMeetings.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" className="empty-icon">
                  <polyline points="11 17 6 12 11 7"></polyline>
                  <polyline points="17 17 12 12 17 7"></polyline>
                </svg>
                <p>No previous meetings</p>
              </div>
            ) : (
              <div className="meeting-list">
                {pastMeetings.map(meeting => (
                  <div key={meeting.id} className="meeting-item">
                    <div className="meeting-details">
                      <h3>{meeting.title}</h3>
                      <p>{formatDate(meeting.date)}</p>
                      <div className="meeting-meta">
                        <span>{meeting.duration}</span>
                        <span>{meeting.participants} participants</span>
                      </div>
                    </div>
                    <div className="meeting-actions">
                      <button className="secondary-button">Replay</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Recordings Section */}
        {activeSection === 'recordings' && (
          <div className="section-content">
            <h2 className="section-title">Recordings</h2>
            
            {recordings.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" className="empty-icon">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <p>No recordings available</p>
              </div>
            ) : (
              <div className="recording-list">
                {recordings.map(recording => (
                  <div key={recording.id} className="recording-item">
                    <div className="recording-thumbnail">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                      </svg>
                    </div>
                    <div className="recording-details">
                      <h3>{recording.title}</h3>
                      <p>{formatDate(recording.date)}</p>
                      <div className="recording-meta">
                        <span>{recording.duration}</span>
                        <span>{recording.size}</span>
                      </div>
                    </div>
                    <div className="recording-actions">
                      <button className="icon-button">
                        <svg viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                      <button className="icon-button">
                        <svg viewBox="0 0 24 24">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modal overlays */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            
            {modalType === 'start' && (
              <>
                <h2>Start an Instant Meeting</h2>
                <button className="modal-button" onClick={startMeeting}>Start Meeting</button>
              </>
            )}
            
            {modalType === 'join' && (
              <>
                <h2>Type the link here</h2>
                <input 
                  type="text" 
                  placeholder="Meeting link" 
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="modal-input"
                />
                <button 
                  className="modal-button" 
                  onClick={joinMeeting}
                  disabled={!meetingLink}
                >
                  Join Meeting
                </button>
              </>
            )}
            
            {modalType === 'schedule' && (
              <>
                <h2>Create Meeting</h2>
                <textarea 
                  placeholder="Add a description" 
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  className="modal-textarea"
                />
                <p className="input-label">Select Date and Time</p>
                <input 
                  type="datetime-local" 
                  value={meetingDateTime}
                  onChange={(e) => setMeetingDateTime(e.target.value)}
                  className="modal-input"
                />
                <button 
                  className="modal-button" 
                  onClick={scheduleMeeting}
                >
                  Schedule Meeting
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;