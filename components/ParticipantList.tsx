import { useParticipants, useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { Track, RemoteParticipant, ParticipantEvent, DataPacket_Kind } from 'livekit-client';

export function ParticipantList() {
  const room = useRoomContext();
  const participants = useParticipants();
  const [isListVisible, setIsListVisible] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if the current user is the host
    const checkHostStatus = () => {
      if (localParticipant) {
        try {
          const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
          console.log('Local participant metadata:', metadata);
          const isHostRole = metadata.role === 'host';
          console.log('Is host:', isHostRole);
          setIsHost(isHostRole);
        } catch (error) {
          console.error('Error parsing participant metadata:', error);
          setIsHost(false);
        }
      } else {
        console.log('No local participant found');
        setIsHost(false);
      }
    };

    checkHostStatus();
    // Also check when tracks change
    const handleTrackPublished = () => checkHostStatus();
    localParticipant?.on(ParticipantEvent.TrackPublished, handleTrackPublished);
    
    return () => {
      localParticipant?.off(ParticipantEvent.TrackPublished, handleTrackPublished);
    };
  }, [localParticipant]);

  // Handle incoming data messages
  useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('Received control message:', data);
        
        if (data.type === 'control' && data.target === room.localParticipant.identity) {
          if (data.action === 'mute-audio') {
            room.localParticipant.setMicrophoneEnabled(false);
          } else if (data.action === 'unmute-audio') {
            room.localParticipant.setMicrophoneEnabled(true);
          } else if (data.action === 'mute-video') {
            room.localParticipant.setCameraEnabled(false);
          } else if (data.action === 'unmute-video') {
            room.localParticipant.setCameraEnabled(true);
          }
        }
      } catch (error) {
        console.error('Error handling data message:', error);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, isHost]);

  const toggleList = () => {
    setIsListVisible(!isListVisible);
  };

  const toggleParticipantAudio = async (participant: RemoteParticipant) => {
    if (!isHost || isProcessing) {
      console.log('Cannot toggle audio:', { isHost, isProcessing });
      return;
    }
    
    try {
      setIsProcessing(true);
      const isMuted = participant.isMicrophoneEnabled === false;
      const action = isMuted ? 'unmute-audio' : 'mute-audio';
      
      console.log('Sending control message:', { 
        participant: participant.identity, 
        action,
        roomName: room.name,
        isHost
      });

      // Send control message via data channel
      const data = {
        type: 'control',
        action,
        target: participant.identity
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );

    } catch (error) {
      console.error('Error toggling audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleParticipantVideo = async (participant: RemoteParticipant) => {
    if (!isHost || isProcessing) {
      console.log('Cannot toggle video:', { isHost, isProcessing });
      return;
    }
    
    try {
      setIsProcessing(true);
      const isVideoDisabled = participant.isCameraEnabled === false;
      const action = isVideoDisabled ? 'unmute-video' : 'mute-video';
      
      console.log('Sending control message:', { 
        participant: participant.identity, 
        action,
        roomName: room.name,
        isHost
      });

      // Send control message via data channel
      const data = {
        type: 'control',
        action,
        target: participant.identity
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );

    } catch (error) {
      console.error('Error toggling video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isParticipantMuted = (participant: RemoteParticipant) => {
    return !participant.isMicrophoneEnabled;
  };

  const isParticipantVideoDisabled = (participant: RemoteParticipant) => {
    return !participant.isCameraEnabled;
  };

  return (
    <>
      <button
        onClick={toggleList}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '8px 16px',
          background: 'var(--lk-bg2)',
          color: 'var(--lk-text)',
          border: '1px solid var(--lk-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1001
        }}
      >
        {isListVisible ? 'Hide Participants' : 'Show Participants'} ({participants.length})
      </button>
      
      {isListVisible && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            background: 'var(--lk-bg2)',
            border: '1px solid var(--lk-border)',
            borderRadius: '4px',
            padding: '16px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            minWidth: '300px'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>Participants ({participants.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {participants.map((participant) => {
              const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
              const role = metadata.role || 'participant';
              const isLocal = participant.isLocal;
              const isMuted = isParticipantMuted(participant as RemoteParticipant);
              const isVideoDisabled = isParticipantVideoDisabled(participant as RemoteParticipant);

              console.log('Rendering participant:', {
                identity: participant.identity,
                role,
                isLocal,
                isHost,
                isMuted,
                isVideoDisabled
              });

              return (
                <div 
                  key={participant.sid} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '6px',
                    background: isLocal ? 'var(--lk-primary)' : 'var(--lk-bg3)',
                    border: '1px solid var(--lk-border)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ 
                      fontWeight: isLocal ? 'bold' : 'normal',
                      color: isLocal ? 'white' : 'var(--lk-text)'
                    }}>
                      {participant.identity.split('__')[0]}
                    </span>
                    <span style={{ 
                      fontSize: '0.8em', 
                      color: isLocal ? 'rgba(255,255,255,0.8)' : 'var(--lk-text-secondary)'
                    }}>
                      {role}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleParticipantAudio(participant as RemoteParticipant)}
                      disabled={!isHost || isLocal || isProcessing}
                      title={isHost ? (isMuted ? 'Unmute participant' : 'Mute participant') : 'Only host can control audio'}
                      style={{
                        padding: '8px',
                        background: !isMuted ? 'var(--lk-bg2)' : 'var(--lk-danger)',
                        color: 'var(--lk-text)',
                        border: '1px solid var(--lk-border)',
                        borderRadius: '4px',
                        cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                        opacity: isHost && !isLocal && !isProcessing ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px'
                      }}
                    >
                      {!isMuted ? '🔊' : '🔇'}
                    </button>
                    <button
                      onClick={() => toggleParticipantVideo(participant as RemoteParticipant)}
                      disabled={!isHost || isLocal || isProcessing}
                      title={isHost ? (isVideoDisabled ? 'Start video' : 'Stop video') : 'Only host can control video'}
                      style={{
                        padding: '8px',
                        background: !isVideoDisabled ? 'var(--lk-bg2)' : 'var(--lk-danger)',
                        color: 'var(--lk-text)',
                        border: '1px solid var(--lk-border)',
                        borderRadius: '4px',
                        cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                        opacity: isHost && !isLocal && !isProcessing ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px'
                      }}
                    >
                      {!isVideoDisabled ? '📹' : '📷'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}