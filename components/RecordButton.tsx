import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { useState, useEffect } from 'react';

export function RecordButton() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if the current user is the host
    const checkHostStatus = () => {
      if (localParticipant) {
        try {
          const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
          setIsHost(metadata.role === 'host');
        } catch {
          setIsHost(false);
        }
      }
    };
    checkHostStatus();
  }, [localParticipant]);

  const toggleRecording = () => {
    if (!isHost || isProcessing) return;
    setIsProcessing(true);
    setIsRecording((prev) => !prev);
    setTimeout(() => setIsProcessing(false), 500); // Simulate a short delay
  };

  if (!isHost) return null;

  return (
    <button
      onClick={toggleRecording}
      disabled={isProcessing}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        padding: '8px 16px',
        background: isRecording ? 'var(--lk-danger)' : 'var(--lk-bg2)',
        color: 'var(--lk-text)',
        border: '1px solid var(--lk-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span style={{ fontSize: '1.2em', color: '#ff1744' }}>
        {isRecording ? '⏺️' : '⏺️'}
      </span>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
} 