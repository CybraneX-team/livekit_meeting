import { useRoomInfo, useLocalParticipant, useParticipantInfo, useRoomContext } from '../custom_livekit_react';
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
  
  // Multipart upload state
  const uploadIdRef = useRef<string | null>(null);
  const presignedUrlsRef = useRef<string[]>([]);
  const uploadedPartsRef = useRef<Array<{ PartNumber: number; ETag: string }>>([]);
  const keyRef = useRef<string | null>(null);

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { identity: userId } = useParticipantInfo({ participant: localParticipant });
  const { name: roomName } = useRoomInfo();

  // Helper to broadcast recording status to all participants
  const broadcastRecordingStatus = async (action: 'start' | 'stop') => {
    try {
      const data = {
        type: 'recording-status',
        action,
        hostIdentity: localParticipant?.identity || 'unknown',
        hostName: localParticipant?.name || 'Unknown Host',
        timestamp: Date.now()
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
      
      console.log('[DEBUG] Broadcasted recording status:', action);
    } catch (error) {
      console.error('[DEBUG] Error broadcasting recording status:', error);
    }
  };

  // Helper to initialize multipart upload
  const initializeMultipartUpload = async (recordingId: string, userId: string, roomName: string, timestamp: string, recordingName: string) => {
    try {
      const response = await fetch('/api/recordings/multipart/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roomName,
          timestamp,
          recordingId,
          recordingName,
          estimatedParts: 20 // Estimate 20 parts for 10-second chunks
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize multipart upload');
      }

      const data = await response.json();
      uploadIdRef.current = data.uploadId;
      presignedUrlsRef.current = data.presignedUrls;
      keyRef.current = data.key;
      uploadedPartsRef.current = [];

      console.log('[DEBUG] Multipart upload initialized:', {
        uploadId: data.uploadId,
        presignedUrlsCount: data.presignedUrls.length,
        key: data.key
      });

      return true;
    } catch (error) {
      console.error('[DEBUG] Error initializing multipart upload:', error);
      return false;
    }
  };

  // Helper to upload chunk directly to S3
  const uploadChunkToS3 = async (chunk: Blob, partNumber: number): Promise<boolean> => {
    try {
      if (!presignedUrlsRef.current[partNumber - 1]) {
        console.error('[DEBUG] No presigned URL for part number:', partNumber);
        return false;
      }

      console.log('[DEBUG] Uploading part', partNumber, 'size:', chunk.size, 'bytes');

      const presignedUrl = presignedUrlsRef.current[partNumber - 1];
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'video/webm'
        }
      });

      console.log('[DEBUG] Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Upload failed with response:', errorText);
        throw new Error(`Upload failed for part ${partNumber}: ${response.status} - ${errorText}`);
      }

      const etag = response.headers.get('ETag');
      if (!etag) {
        throw new Error(`No ETag received for part ${partNumber}`);
      }

      // Remove quotes from ETag
      const cleanEtag = etag.replace(/"/g, '');
      
      uploadedPartsRef.current.push({
        PartNumber: partNumber,
        ETag: cleanEtag
      });

      console.log('[DEBUG] Successfully uploaded part:', { partNumber, etag: cleanEtag, size: chunk.size });
      return true;
    } catch (error) {
      console.error('[DEBUG] Error uploading chunk to S3:', error);
      return false;
    }
  };

  // Helper to complete multipart upload
  const completeMultipartUpload = async (): Promise<boolean> => {
    try {
      if (!uploadIdRef.current || !keyRef.current || uploadedPartsRef.current.length === 0) {
        console.error('[DEBUG] Cannot complete upload - missing data');
        return false;
      }

      // Sort parts by part number to ensure ascending order
      const sortedParts = [...uploadedPartsRef.current].sort((a, b) => a.PartNumber - b.PartNumber);
      
      const requestBody = {
        uploadId: uploadIdRef.current,
        key: keyRef.current,
        parts: sortedParts
      };

      console.log('[DEBUG] Sending completion request:', requestBody);

      const response = await fetch('/api/recordings/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('[DEBUG] Completion response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Completion failed with response:', errorText);
        throw new Error(`Failed to complete multipart upload: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Multipart upload completed:', data);
      return true;
    } catch (error) {
      console.error('[DEBUG] Error completing multipart upload:', error);
      return false;
    }
  };

  // Helper to abort multipart upload
  const abortMultipartUpload = async (): Promise<void> => {
    try {
      if (!uploadIdRef.current || !keyRef.current) {
        return;
      }

      await fetch('/api/recordings/multipart/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadIdRef.current,
          key: keyRef.current
        })
      });

      console.log('[DEBUG] Multipart upload aborted');
    } catch (error) {
      console.error('[DEBUG] Error aborting multipart upload:', error);
    }
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
        
        // Note: Cannot broadcast stop status on beforeunload due to room context limitations
        // The recording will be finalized by the backend, but participants won't see the stop indicator immediately
        
        // For multipart uploads, we can't complete them on beforeunload
        // The parts will remain in S3 and can be cleaned up later
        // We could implement a cleanup job to remove incomplete multipart uploads
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording, userId, roomName, localParticipant]);

  const startRecording = async () => {
    try {
      setLimitMessage('');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'monitor',
          width: { ideal: 854, max: 854 },    // 480p width (16:9 aspect ratio)
          height: { ideal: 480, max: 480 },   // 480p height
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
      
      // Initialize multipart upload
      const uploadInitialized = await initializeMultipartUpload(
        recordingIdRef.current,
        userId || 'unknownUser',
        roomName || 'unknownRoom',
        timestampRef.current,
        recordingNameRef.current
      );
      
      if (!uploadInitialized) {
        throw new Error('Failed to initialize multipart upload');
      }

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && recordingIdRef.current && timestampRef.current) {
          totalBytesRef.current += event.data.size;
          
          // Upload chunk directly to S3
          const partNumber = chunkIndexRef.current + 1;
          const uploadSuccess = await uploadChunkToS3(event.data, partNumber);
          
          if (!uploadSuccess) {
            console.error('[DEBUG] Failed to upload chunk, stopping recording');
            setLimitMessage('Recording stopped: Upload failed.');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
            }
            return;
          }
          
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
        
        // Complete multipart upload
        if (uploadIdRef.current && uploadedPartsRef.current.length > 0) {
          const completionSuccess = await completeMultipartUpload();
          if (!completionSuccess) {
            console.error('[DEBUG] Failed to complete multipart upload');
            // Try to abort the upload
            await abortMultipartUpload();
          }
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start(30000); // 30s chunks (should be >5MB)
      setIsRecording(true);
      
      // Broadcast recording start to all participants
      await broadcastRecordingStatus('start');
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording. Please make sure you have granted screen sharing permissions.');
    }
  };

  // Use window.prompt for recording name on stop
  const stopRecording = async () => {
    console.log('[DEBUG] stopRecording called');
    let name = window.prompt('Name your recording:', '');
    if (!name || !name.trim()) {
      name = fancyRandomString();
    }
    recordingNameRef.current = name.trim();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Broadcast recording stop to all participants
      await broadcastRecordingStatus('stop');
      
      // Complete multipart upload with final name
      if (uploadIdRef.current && uploadedPartsRef.current.length > 0) {
        const completionSuccess = await completeMultipartUpload();
        if (!completionSuccess) {
          console.error('[DEBUG] Failed to complete multipart upload');
          await abortMultipartUpload();
        }
      }
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