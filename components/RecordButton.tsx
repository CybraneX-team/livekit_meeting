import { useRoomInfo, useLocalParticipant, useParticipantInfo } from '../custom_livekit_react';
import { useState, useRef, useEffect } from 'react';

function fancyRandomString() {
  const adjectives = ['Brave', 'Cosmic', 'Lucky', 'Mighty', 'Silent', 'Swift', 'Witty', 'Zen', 'Funky', 'Radiant'];
  const nouns = ['Tiger', 'Falcon', 'Nova', 'Pixel', 'Echo', 'Blaze', 'Comet', 'Vortex', 'Shadow', 'Spark'];
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(Math.random() * 1000)
  );
}

const MAX_RECORDING_SIZE = 50 * 1024 * 1024; // 50MB

export function useRecordButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const recordingIdRef = useRef<string | null>(null);
  const timestampRef = useRef<string | null>(null);
  const recordingNameRef = useRef<string>('');
  const totalBytesRef = useRef(0);

  const { localParticipant } = useLocalParticipant();
  const { identity: userId } = useParticipantInfo({ participant: localParticipant });
  const { name: roomName } = useRoomInfo();

  // Helper to finalize recording using Beacon API
  const finalizeRecordingBeacon = (recordingId: string, userId: string, roomName: string, timestamp: string, recordingName: string) => {
    if (!recordingId || !userId || !roomName || !timestamp) return;
    console.log('[DEBUG] Calling finalizeRecordingBeacon', { recordingId, userId, roomName, timestamp, recordingName });
    const data = new Blob(
      [JSON.stringify({ recordingId, userId, roomName, timestamp, recordingName })],
      { type: 'application/json' }
    );
    navigator.sendBeacon('/api/recordings/finalize', data);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRecording && recordingIdRef.current && timestampRef.current) {
        console.log('[DEBUG] beforeunload finalize', {
          recordingId: recordingIdRef.current,
          userId,
          roomName,
          timestamp: timestampRef.current,
          recordingName: recordingNameRef.current || fancyRandomString()
        });
        finalizeRecordingBeacon(
          recordingIdRef.current,
          userId || 'unknownUser',
          roomName || 'unknownRoom',
          timestampRef.current,
          recordingNameRef.current || fancyRandomString()
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording, userId, roomName]);

  const startRecording = async () => {
    try {
      setLimitMessage('');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'monitor',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      // Create optimized MediaRecorder with better bitrates
      const mediaRecorder = new window.MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 500000,  // 500kbps video for text clarity
        audioBitsPerSecond: 64000    // 64kbps audio
      });
      mediaRecorderRef.current = mediaRecorder;
      chunkIndexRef.current = 0;
      recordingIdRef.current = crypto.randomUUID();
      timestampRef.current = Date.now().toString();
      recordingNameRef.current = '';
      totalBytesRef.current = 0;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && recordingIdRef.current && timestampRef.current) {
          totalBytesRef.current += event.data.size;
          if (totalBytesRef.current > MAX_RECORDING_SIZE) {
            setLimitMessage('Recording stopped: 50MB size limit reached.');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
            }
            return;
          }
          const params = new URLSearchParams({
            recordingId: recordingIdRef.current,
            userId: userId || 'unknownUser',
            roomName: roomName || 'unknownRoom',
            timestamp: timestampRef.current,
            chunkIndex: chunkIndexRef.current.toString(),
          });
          await fetch(`/api/recordings/stream?${params.toString()}`, {
            method: 'POST',
            headers: {},
            body: event.data,
          });
          chunkIndexRef.current += 1;
        }
      };
      mediaRecorder.onstop = async () => {
        console.log('[DEBUG] mediaRecorder.onstop triggered', {
          recordingId: recordingIdRef.current,
          userId,
          roomName,
          timestamp: timestampRef.current,
          recordingName: recordingNameRef.current || fancyRandomString()
        });
        if (recordingIdRef.current && timestampRef.current) {
          finalizeRecordingBeacon(
            recordingIdRef.current,
            userId || 'unknownUser',
            roomName || 'unknownRoom',
            timestampRef.current,
            recordingNameRef.current || fancyRandomString()
          );
        }
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start(2000); // 2s chunks
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording. Please make sure you have granted screen sharing permissions.');
    }
  };

  // Use window.prompt for recording name on stop
  const stopRecording = () => {
    console.log('[DEBUG] stopRecording called');
    let name = window.prompt('Name your recording:', '');
    if (!name || !name.trim()) {
      name = fancyRandomString();
    }
    recordingNameRef.current = name.trim();
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

  return { buttonProps, isRecording, limitMessage };
}

export function RecordButton() {
  const { buttonProps, isRecording, limitMessage } = useRecordButton();

  return (
    <div>
      <button {...buttonProps}>
        <span style={{ fontSize: '1.2em', color: isRecording ? '#ff1744' : 'inherit' }}>
          {isRecording ? '⏺️' : '⏺️'}
        </span>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {limitMessage && (
        <div style={{ color: '#ef4444', marginTop: '0.5rem', fontWeight: 500 }}>
          {limitMessage}
        </div>
      )}
    </div>
  );
} 