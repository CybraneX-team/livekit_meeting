import { useRoomContext, useLocalParticipant } from '../custom_livekit_react';
import { useState, useEffect, useRef } from 'react';
import { ParticipantEvent, RoomEvent, Room } from 'livekit-client';

export function useRecordButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
    if (isProcessing) return;
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

  return { buttonProps, isRecording };
}

export function RecordButton() {
  const { buttonProps, isRecording } = useRecordButton();

  return (
    <button {...buttonProps}>
      <span style={{ fontSize: '1.2em', color: isRecording ? '#ff1744' : 'inherit' }}>
        {isRecording ? '⏺️' : '⏺️'}
      </span>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
} 