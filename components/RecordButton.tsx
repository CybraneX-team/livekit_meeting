import { useRoomInfo, useLocalParticipant, useParticipantInfo, useRoomContext } from '../custom_livekit_react';
import { useState, useRef, useEffect, useCallback } from 'react';

// Simplified recording state interface
interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadId: string | null;
  recordingId: string | null;
  recordingName: string;
  totalParts: number;
  uploadedParts: number;
  totalSize: number;
  estimatedTimeRemaining: number;
}

// Upload configuration
interface UploadConfig {
  chunkSize: number;
  maxRetries: number;
  retryDelay: number;
  quality: string;
  format: string;
  uploadId?: string;
}

function generateRecordingName(): string {
  const adjectives = ['Brave', 'Cosmic', 'Lucky', 'Mighty', 'Silent', 'Swift', 'Witty', 'Zen', 'Funky', 'Radiant'];
  const nouns = ['Tiger', 'Falcon', 'Nova', 'Pixel', 'Echo', 'Blaze', 'Comet', 'Vortex', 'Shadow', 'Spark'];
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(Math.random() * 1000)
  );
}

export function useRecordButton() {
  // Enhanced state management
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    isUploading: false,
    progress: 0,
    error: null,
    uploadId: null,
    recordingId: null,
    recordingName: '',
    totalParts: 0,
    uploadedParts: 0,
    totalSize: 0,
    estimatedTimeRemaining: 0
  });

  // Refs for recording session
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadConfigRef = useRef<UploadConfig | null>(null);
  const presignedUrlsRef = useRef<string[]>([]);
  const uploadedPartsRef = useRef<Array<{ PartNumber: number; ETag: string }>>([]);
  const keyRef = useRef<string | null>(null);
  const currentRecordingIdRef = useRef<string | null>(null);
  const pendingUploadsRef = useRef<number>(0);
  const isRecordingStoppedRef = useRef<boolean>(false);

  // LiveKit context
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { identity: userId } = useParticipantInfo({ participant: localParticipant });
  const { name: roomName } = useRoomInfo();

  // Helper to broadcast recording status to all participants
  const broadcastRecordingStatus = useCallback(async (action: 'start' | 'stop' | 'error') => {
    try {
      const data = {
        type: 'recording-status',
        action,
        hostIdentity: localParticipant?.identity || 'unknown',
        hostName: localParticipant?.name || 'Unknown Host',
        timestamp: Date.now(),
        recordingId: currentRecordingIdRef.current,
        recordingName: recordingState.recordingName
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
      
      console.log('[DEBUG] Broadcasted recording status:', action);
    } catch (error) {
      console.error('[DEBUG] Error broadcasting recording status:', error);
    }
  }, [room, localParticipant, recordingState.recordingName]);

  // Helper to initialize multipart upload
  const initializeMultipartUpload = useCallback(async (
    recordingId: string, 
    userId: string, 
    roomName: string, 
    timestamp: string, 
    recordingName: string,
    quality: string = 'medium'
  ): Promise<boolean> => {
    try {
      setRecordingState(prev => ({ ...prev, isProcessing: true, error: null }));

      const response = await fetch('/api/recordings/multipart/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roomName,
          timestamp,
          recordingId,
          recordingName,
          estimatedParts: 20,
          quality
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize multipart upload');
      }

      const data = await response.json();
      
      // Store upload configuration
      uploadConfigRef.current = data.uploadConfig;
      console.log("abc", data.uploadConfig)
      presignedUrlsRef.current = data.presignedUrls;
      keyRef.current = data.key;
      uploadedPartsRef.current = [];

      // Update state
      setRecordingState(prev => ({
        ...prev,
        uploadId: data.uploadId,
        recordingId,
        recordingName,
        totalParts: data.maxParts,
        isProcessing: false
      }));

      // Store uploadId in uploadConfig for consistent access
      if (uploadConfigRef.current) {
        uploadConfigRef.current.uploadId = data.uploadId;
      }

      console.log('[DEBUG] Multipart upload initialized:', {
        uploadId: data.uploadId,
        presignedUrlsCount: data.presignedUrls.length,
        key: data.key,
        chunkSize: (data.uploadConfig.chunkSize / 1000) + 's',
        maxParts: data.maxParts
      });

      return true;
    } catch (error: any) {
      console.error('[DEBUG] Error initializing multipart upload:', error);
      setRecordingState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error.message || 'Failed to initialize upload' 
      }));
      return false;
    }
  }, []);

  // Helper to upload chunk with retry logic
  const uploadChunkToS3 = useCallback(async (chunk: Blob, partNumber: number): Promise<boolean> => {
    const maxRetries = uploadConfigRef.current?.maxRetries || 3;
    const retryDelay = uploadConfigRef.current?.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!presignedUrlsRef.current[partNumber - 1]) {
          throw new Error(`No presigned URL for part number: ${partNumber}`);
        }

        console.log('[DEBUG] Uploading part', partNumber, 'attempt', attempt, 'size:', (chunk.size / (1024 * 1024)).toFixed(2), 'MB');

        const presignedUrl = presignedUrlsRef.current[partNumber - 1];
        const response = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': 'video/webm'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
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

        // Update progress
        setRecordingState(prev => ({
          ...prev,
          uploadedParts: prev.uploadedParts + 1,
          totalSize: prev.totalSize + chunk.size,
          progress: Math.min(((prev.uploadedParts + 1) / prev.totalParts) * 100, 95),
          estimatedTimeRemaining: Math.max(0, (prev.totalParts - (prev.uploadedParts + 1)) * 30)
        }));

        console.log('[DEBUG] Successfully uploaded part:', { partNumber, etag: cleanEtag, size: (chunk.size / (1024 * 1024)).toFixed(2) + ' MB' });
        return true;

      } catch (error: any) {
        console.error(`[DEBUG] Error uploading chunk to S3 (attempt ${attempt}):`, error);
        
        if (attempt === maxRetries) {
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    return false;
  }, []);

  // Helper to complete multipart upload
  const completeMultipartUpload = useCallback(async (): Promise<boolean> => {
    try {
      if (!uploadConfigRef.current?.uploadId || !keyRef.current || uploadedPartsRef.current.length === 0) {
        console.log('uploadConfigRef.current?.uploadId', uploadConfigRef.current?.uploadId);
        console.log('keyRef.current', keyRef.current);
        console.log('uploadedPartsRef.current', uploadedPartsRef.current);
        console.error('[DEBUG] Cannot complete upload - missing data');
        return false;
      }

      setRecordingState(prev => ({ ...prev, isUploading: true, progress: 95 }));

      // Sort parts by part number to ensure ascending order
      const sortedParts = [...uploadedPartsRef.current].sort((a, b) => a.PartNumber - b.PartNumber);
      
      const requestBody = {
        uploadId: uploadConfigRef.current.uploadId,
        key: keyRef.current,
        parts: sortedParts,
        recordingMetadata: {
          recordingName: recordingState.recordingName,
          finalDuration: Math.round(recordingState.totalSize / (500 * 1024) * 30), // Estimate
          totalSize: recordingState.totalSize,
          quality: uploadConfigRef.current.quality
        }
      };

      console.log('[DEBUG] Sending completion request:', {
        uploadId: requestBody.uploadId,
        key: requestBody.key,
        partsCount: requestBody.parts.length,
        totalSize: (requestBody.recordingMetadata.totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        recordingName: requestBody.recordingMetadata.recordingName
      });

      const response = await fetch('/api/recordings/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to complete multipart upload: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Multipart upload completed:', data);

      setRecordingState(prev => ({ 
        ...prev, 
        isUploading: false, 
        progress: 100,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('[DEBUG] Error completing multipart upload:', error);
      setRecordingState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error.message || 'Failed to complete upload' 
      }));
      return false;
    }
  }, [recordingState.recordingName, recordingState.totalSize]);

  // Helper to abort multipart upload
  const abortMultipartUpload = useCallback(async (): Promise<void> => {
    try {
      if (!uploadConfigRef.current?.uploadId || !keyRef.current) {
        return;
      }

      await fetch('/api/recordings/multipart/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadConfigRef.current.uploadId,
          key: keyRef.current
        })
      });

      console.log('[DEBUG] Multipart upload aborted');
    } catch (error) {
      console.error('[DEBUG] Error aborting multipart upload:', error);
    }
  }, []);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (recordingState.isRecording && currentRecordingIdRef.current) {
        console.log('[DEBUG] beforeunload - recording in progress');
        // Note: Cannot complete upload on beforeunload due to browser limitations
        // The upload will be handled by the backend cleanup process
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recordingState.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setRecordingState(prev => ({ 
        ...prev, 
        error: null, 
        isProcessing: true,
        progress: 0,
        uploadedParts: 0,
        totalSize: 0
      }));

      // Reset upload tracking
      pendingUploadsRef.current = 0;
      isRecordingStoppedRef.current = false;

      // Get screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'monitor',
          width: { ideal: 854, max: 854 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;

      // Create MediaRecorder with optimized settings
      const mediaRecorder = new window.MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 500000,
        audioBitsPerSecond: 64000
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Generate recording metadata
      const recordingId = crypto.randomUUID();
      const timestamp = Date.now().toString();
      const recordingName = generateRecordingName();

      // Store recording ID in ref for consistent access
      currentRecordingIdRef.current = recordingId;

      // Initialize multipart upload
      const uploadInitialized = await initializeMultipartUpload(
        recordingId,
        userId || 'unknownUser',
        roomName || 'unknownRoom',
        timestamp,
        recordingName,
        'medium' // Default quality
      );
      
      if (!uploadInitialized) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Set up data handlers
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && currentRecordingIdRef.current) {
          const partNumber = uploadedPartsRef.current.length + 1;
          
          console.log('[DEBUG] Uploading WebM chunk:', {
            partNumber,
            size: (event.data.size / (1024 * 1024)).toFixed(2) + ' MB'
          });
          
          // Track pending upload
          pendingUploadsRef.current++;
          
          const uploadSuccess = await uploadChunkToS3(event.data, partNumber);
          
          // Decrement pending upload
          pendingUploadsRef.current--;
          
          if (!uploadSuccess) {
            console.error('[DEBUG] Failed to upload WebM chunk, stopping recording');
            setRecordingState(prev => ({ 
              ...prev, 
              error: 'Upload failed. Recording stopped.',
              isRecording: false 
            }));
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            return;
          }
          
          // Check if recording stopped and all uploads are complete
          if (isRecordingStoppedRef.current && pendingUploadsRef.current === 0) {
            console.log('[DEBUG] All uploads complete, finishing multipart upload');
            await completeMultipartUpload();
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[DEBUG] MediaRecorder stopped');
        
        // Mark recording as stopped
        isRecordingStoppedRef.current = true;
        
        // Wait for all pending uploads to complete
        if (pendingUploadsRef.current > 0) {
          console.log('[DEBUG] Waiting for', pendingUploadsRef.current, 'pending uploads to complete');
          // The completion will be handled in ondataavailable when pendingUploadsRef.current reaches 0
        } else {
          // No pending uploads, complete immediately
          if (uploadedPartsRef.current.length > 0) {
            const completionSuccess = await completeMultipartUpload();
            if (!completionSuccess) {
              console.error('[DEBUG] Failed to complete multipart upload');
              await abortMultipartUpload();
            }
          }
        }
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(180000); // 3min chunks to meet S3 5MB minimum
      
      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isProcessing: false,
        recordingId,
        recordingName,
        progress: 0
      }));
      
      // Broadcast recording start
      await broadcastRecordingStatus('start');

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setRecordingState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message || 'Failed to start recording' 
      }));
    }
  }, [userId, roomName, initializeMultipartUpload, uploadChunkToS3, completeMultipartUpload, abortMultipartUpload, broadcastRecordingStatus]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    console.log('[DEBUG] stopRecording called');
    
    // Prompt for recording name
    let name = window.prompt('Name your recording:', recordingState.recordingName || '');
    if (!name || !name.trim()) {
      name = generateRecordingName();
    }

    setRecordingState(prev => ({ ...prev, recordingName: name.trim() }));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecordingState(prev => ({ ...prev, isRecording: false }));
      
      // Broadcast recording stop
      await broadcastRecordingStatus('stop');
    }
  }, [recordingState.recordingName, broadcastRecordingStatus]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (recordingState.isProcessing) return;
    
    try {
      if (recordingState.isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (err: any) {
      console.error('Error toggling recording:', err);
      setRecordingState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to toggle recording' 
      }));
    }
  }, [recordingState.isRecording, recordingState.isProcessing, startRecording, stopRecording]);

  // Button props
  const buttonProps = {
    onClick: toggleRecording,
    disabled: recordingState.isProcessing || recordingState.isUploading,
    className: 'lk-button',
    style: {
      background: recordingState.isRecording ? 'var(--lk-danger)' : undefined,
      color: recordingState.isRecording ? 'var(--lk-text)' : undefined,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative' as const
    }
  };

  return { 
    buttonProps, 
    recordingState,
    clearError: () => setRecordingState(prev => ({ ...prev, error: null }))
  };
}

export function RecordButton() {
  const { buttonProps, recordingState, clearError } = useRecordButton();

  return (
    <div>
      <button {...buttonProps}>
        <span style={{ fontSize: '1.2em', color: recordingState.isRecording ? '#ff1744' : 'inherit' }}>
          {recordingState.isRecording ? '⏺️' : '⏺️'}
        </span>
        {recordingState.isRecording ? 'Stop Recording' : 'Start Recording'}
        
        {/* Progress indicator */}
        {recordingState.isUploading && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            background: 'var(--lk-primary)',
            width: `${recordingState.progress}%`,
            transition: 'width 0.3s ease'
          }} />
        )}
      </button>
      
      {/* Progress display */}
      {recordingState.isUploading && recordingState.progress > 0 && (
        <div style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.875rem', 
          color: 'var(--lk-text-secondary)' 
        }}>
          Uploading: {Math.round(recordingState.progress)}% 
          {recordingState.estimatedTimeRemaining > 0 && 
            ` (${Math.round(recordingState.estimatedTimeRemaining)}s remaining)`
          }
        </div>
      )}
      
      {/* Error display */}
      {recordingState.error && (
        <div style={{ 
          color: '#ef4444', 
          marginTop: '0.5rem', 
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚠️</span>
          <span>{recordingState.error}</span>
          <button 
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '1.2em'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
} 