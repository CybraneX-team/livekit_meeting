import React, { useState, useEffect } from 'react';
import { useRoomContext, useLocalParticipant } from '../custom_livekit_react';

interface RecordingIndicatorProps {
  className?: string;
}

export function RecordingIndicator({ className = '' }: RecordingIndicatorProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingHost, setRecordingHost] = useState<string>('');

  useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        if (data.type === 'recording-status') {
          if (data.action === 'start') {
            setIsRecording(true);
            setRecordingHost(data.hostName || data.hostIdentity);
          } else if (data.action === 'stop') {
            setIsRecording(false);
            setRecordingHost('');
          }
        }
      } catch (error) {
        console.error('Error handling recording status message:', error);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room]);

  if (!isRecording) {
    return null;
  }

  return (
    <div 
      className={`recording-indicator ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: '4px solid #ef4444',
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
        animation: 'recording-pulse 2s ease-in-out infinite alternate',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ fontSize: '12px' }}>⏺️</span>
        RECORDING
        {recordingHost && (
          <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '4px' }}>
            by {recordingHost}
          </span>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes recording-pulse {
            0% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
            100% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.8); }
          }
        `
      }} />
    </div>
  );
} 