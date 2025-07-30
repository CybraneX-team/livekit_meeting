'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, 
  FaDownload, 
  FaClock, 
  FaUsers, 
  FaCalendarAlt,
  FaSpinner,
  FaExclamationTriangle,
  FaTrash,
  FaVideo,
  FaHdd,
  FaStar
} from 'react-icons/fa';

const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/recordings/list');
      const data = await response.json();
      
      if (response.ok) {
        setRecordings(data.recordings || []);
        setSummary(data.summary || null);
      } else {
        setError(data.error || 'Failed to fetch recordings');
      }
    } catch (err) {
      setError('Error loading recordings');
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality?.toLowerCase()) {
      case 'high':
        return <FaStar style={{ color: '#fbbf24' }} />;
      case 'medium':
        return <FaStar style={{ color: '#6b7280' }} />;
      case 'low':
        return <FaStar style={{ color: '#9ca3af' }} />;
      default:
        return <FaStar style={{ color: '#6b7280' }} />;
    }
  };

  const getQualityLabel = (quality) => {
    switch (quality?.toLowerCase()) {
      case 'high':
        return 'High Quality';
      case 'medium':
        return 'Medium Quality';
      case 'low':
        return 'Low Quality';
      default:
        return 'Standard Quality';
    }
  };

  const handlePlay = (url) => {
    window.open(url, '_blank');
  };

  const handleDownload = async (key, filename) => {
    try {
      const response = await fetch(`/api/recordings/download?key=${encodeURIComponent(key)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'recording.webm';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error downloading recording:', err);
      alert('Failed to download recording. Please try again.');
    }
  };

  const handleDelete = async (key, recordingName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${recordingName}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/recordings/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the recording from the local state
        setRecordings(prevRecordings => 
          prevRecordings.filter(recording => recording.key !== key)
        );
        
        // Refresh summary data
        fetchRecordings();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete recording: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting recording:', err);
      alert('Failed to delete recording. Please try again.');
    }
  };

  const itemVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100
      }
    },
    exit: { 
      y: -20, 
      opacity: 0,
      transition: { duration: 0.2 }
    },
    hover: {
      y: -2,
      transition: { duration: 0.2 }
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="recordings-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <FaSpinner className="spinner" />
        <p>Loading recordings...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="recordings-error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={fetchRecordings} className="retry-button">
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="recordings-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="section-title"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Meeting Recordings
      </motion.h2>

      {/* Summary Stats */}
      {summary && (
        <motion.div 
          className="recordings-summary"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="summary-stat">
            <FaVideo />
            <span>{recordings.length} Recording{recordings.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="summary-stat">
            <FaHdd />
            <span>{formatFileSize(summary.totalSize || 0)}</span>
          </div>
          <div className="summary-stat">
            <FaClock />
            <span>{formatDuration(summary.totalDuration || 0)}</span>
          </div>
        </motion.div>
      )}

      {recordings.length === 0 ? (
        <motion.div 
          className="empty-recordings"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <FaPlay size={48} />
          <h3>No recordings yet</h3>
          <p>Your meeting recordings will appear here after you record a meeting.</p>
        </motion.div>
      ) : (
        <motion.div 
          className="recordings-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence>
            {recordings.map((recording, index) => (
              <motion.div 
                key={recording.recordingId}
                className="recording-item"
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                whileHover="hover"
                custom={index}
              >
                <div className="recording-info">
                  <div className="recording-header">
                    <h3>{recording.recordingName || 'Untitled Recording'}</h3>
                    <span className="recording-date">
                      <FaCalendarAlt />
                      {formatDate(recording.timestamp)}
                    </span>
                  </div>
                  
                  <div className="recording-details">
                    <span className="recording-user">
                      <FaUsers />
                      {recording.userId}
                    </span>
                    <span className="recording-room">
                      <FaVideo />
                      {recording.roomName}
                    </span>
                    <span className="recording-quality">
                      {getQualityIcon(recording.quality)}
                      {getQualityLabel(recording.quality)}
                    </span>
                    {recording.size && (
                      <span className="recording-size">
                        <FaHdd />
                        {formatFileSize(recording.size)}
                      </span>
                    )}
                    {recording.duration && (
                      <span className="recording-duration">
                        <FaClock />
                        {formatDuration(recording.duration)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="recording-actions">
                  <motion.button
                    className="action-btn download-btn"
                    onClick={() => handleDownload(recording.key, `${recording.recordingName || 'recording'}.webm`)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Download recording"
                  >
                    <FaDownload />
                    Download
                  </motion.button>
                  
                  <motion.button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(recording.key, recording.recordingName || 'recording')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Delete recording"
                  >
                    <FaTrash />
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default RecordingsList; 