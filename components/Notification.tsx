import React, { useState } from 'react';

interface NotificationProps {
    visible: boolean;
    setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    text: string;
  }
  
  const Notification: React.FC<NotificationProps> = ({ visible, setVisible, text }) => {
  if (!visible) return null;

  return (
    <div style={styles.container}>
      <div style={styles.messageBox}>
        <span style={styles.message}>{text}</span>
        <div style={styles.actions}>
          <button style={styles.dismissButton} onClick={() => setVisible(false)}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1110,
  },
  messageBox: {
    backgroundColor: '#f0f4ff',
    border: '1px solid #aac4ff',
    borderRadius: '8px',
    padding: '16px',
    width: '300px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  message: {
    color: '#003087',
    fontSize: '14px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#003087',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#003087',
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: '1',
  },
};

export default Notification;
