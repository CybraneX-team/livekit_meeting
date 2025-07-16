import { useRoomContext, useLocalParticipant } from '../custom_livekit_react';
import { useState, useEffect, useRef } from 'react';
import { ParticipantEvent, RoomEvent, Room } from 'livekit-client';

export function useRecordButton() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleVisibility = () => {
      if(room.state === "connected") {
        try {
          const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
          setIsHost(metadata.role === 'host' || metadata.role === 'co-host');
        } catch {
          setIsHost(false);
        }
      }
    }

    room.on(ParticipantEvent.ParticipantMetadataChanged, handleVisibility);
    room.on(RoomEvent.ConnectionStateChanged, handleVisibility);

    return () => {
      room.off(ParticipantEvent.ParticipantMetadataChanged, handleVisibility);
      room.off(RoomEvent.ConnectionStateChanged, handleVisibility);
    };
  }, [room, localParticipant.metadata]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording. Please make sure you have granted screen sharing permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    if (!isHost || isProcessing) return;
    setIsProcessing(true);
    try {
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      console.error('Error toggling recording:', err);
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const buttonProps = {
    onClick: toggleRecording,
    disabled: isProcessing,
    className: 'lk-button',
    style: {
      background: isRecording ? 'var(--lk-danger)' : undefined,
      color: isRecording ? 'var(--lk-text)' : undefined,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  };

  return { buttonProps, isHost, isRecording };
}

export function RecordButton() {
  const { buttonProps, isHost, isRecording } = useRecordButton();
  if (!isHost) return null;
  return (
    <button {...buttonProps}>
      <span style={{ fontSize: '1.2em', color: isRecording ? '#ff1744' : 'inherit' }}>
        {isRecording ? '⏺️' : '⏺️'}
      </span>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
} 