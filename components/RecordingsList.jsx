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
  FaExclamationTriangle
} from 'react-icons/fa';

const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recordings/list');
      const data = await response.json();
      
      if (response.ok) {
        setRecordings(data.recordings || []);
      } else {
        setError('Failed to fetch recordings');
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

  const handlePlay = (url) => {
    window.open(url, '_blank');
  };

  const handleDownload = (key, filename) => {
    const url = `/api/recordings/download?key=${encodeURIComponent(key)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.webm$/, '.mp4');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {recordings.length === 0 ? (
        <motion.div 
          className="empty-recordings"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.2 }}
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
                    <h3>{recording.recordingName ? recording.recordingName : recording.roomName}</h3>
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
                    <span className="recording-id">
                      <FaClock />
                      ID: {recording.recordingId.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                <div className="recording-actions">
                  <motion.button
                    className="action-btn download-btn"
                    onClick={() => handleDownload(`${recording.userId}_${recording.roomName}_${recording.timestamp}_${recording.recordingId}.webm`, `${recording.userId}_${recording.roomName}_${recording.timestamp}.mp4`)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Download recording"
                  >
                    <FaDownload />
                    Download
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