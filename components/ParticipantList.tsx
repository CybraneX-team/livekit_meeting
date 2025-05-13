import { useParticipants, useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { Track, RemoteParticipant, ParticipantEvent, DataPacket_Kind, Participant } from 'livekit-client';

const CONN_DETAILS_ENDPOINT = '/api/participant-control';

export function ParticipantList() {
  const room = useRoomContext();
  const participants = useParticipants();
  const [isListVisible, setIsListVisible] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpenDialogue, setIsOpenDialogue] = useState<boolean>(false);
  const [dialogueParticipant, setdialogueParticipant] = useState<RemoteParticipant>();

  useEffect(() => {
    if(room.state === "connected") {
      const checkHostStatus = () => {
        if(localParticipant) {
          try {
            const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
            const isHostRole = metadata.role === 'host' || metadata.role === 'co-host';
            console.log(isHostRole)
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
    }
  }, [room.state]);

  // Handle incoming data messages
  useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        // console.log('Received control message:', data);
        
        if (data.type === 'control' && data.target === room.localParticipant.identity) {
          if (data.action === 'mute-audio') {
            room.localParticipant.setMicrophoneEnabled(false);
          } else if (data.action === 'unmute-audio') {
            room.localParticipant.setMicrophoneEnabled(true);
          } else if (data.action === 'mute-video') {
            room.localParticipant.setCameraEnabled(false);
          } else if (data.action === 'unmute-video') {
            room.localParticipant.setCameraEnabled(true);
          } else if(data.action === 'toggle-cohost') {
            setIsHost(bool => !bool)
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
  }, [room.state]);

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

  const kickParticipant = async (participant: RemoteParticipant) => {
    if (!isHost || isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isProcessing });
      return;
    }
    
    try {
      setIsProcessing(true);

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);

      const payload = {
        roomName: room.name,
        participantIdentity: participant.identity,
        action: 'remove',
      };

      await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error toggling video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renameParticipant = async (participant: RemoteParticipant, renameTo: String) => {
    if (!isHost || isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isProcessing });
      return;
    }
    
    try {
      setIsProcessing(true);

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);

      const payload = {
        roomName: room.name,
        participantIdentity: participant.identity,
        action: 'rename',
        newIdentity: renameTo
      };

      await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error toggling video:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  const toggleCoHost = async (participant: RemoteParticipant) => {
    if (!isHost || isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isProcessing });
      return;
    }
    
    if(room.state !== "connected") {
      return;
    }

    try {
      setIsProcessing(true);

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);

      const payload = {
        roomName: room.name,
        participantIdentity: participant.identity,
        action: (JSON.parse(participant.metadata + "").role === "co-host") ? 'remove-cohost' : "make-cohost",
      };

      await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = {
        type: 'control',
        action: 'toggle-cohost',
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

  const toggleWaitingRoom = async (participant: RemoteParticipant) => {
    if (!isHost || isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isProcessing });
      return;
    }
    
    if(room.state !== "connected") {
      return;
    }

    try {
      setIsProcessing(true);

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);

      const payload = {
        roomName: room.name,
        participantIdentity: participant.identity,
        action: !(JSON.parse(participant.metadata + "").inWaitingRoom) ? 'put-in-waiting-room' : "remove-from-waiting-room",
      };

      await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error toggling video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  interface DialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  }

  const RenameDialogue: React.FC<DialogProps> = ({ isOpen, setIsOpen }) => {
    const [input, setInput] = useState('');

    const dialogStyle: React.CSSProperties = {
      display: isOpen ? 'block' : 'none',
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--lk-bg2)',
      color: 'var(--lk-text)',
      padding: '20px',
      zIndex: 1010,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      width: '300px',
      textAlign: 'center'
    };
  
    const overlayStyle: React.CSSProperties = {
      display: isOpen ? 'block' : 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1009
    };

    const buttonStyle: React.CSSProperties = {
      padding: '10px 20px',
      margin: '10px',
      backgroundColor: '#007bff',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    };
    
    return (
      <>
        <div>
          <div style={overlayStyle} onClick={() => setIsOpen(false)}></div>

          <div style={dialogStyle}>
            <h3>Rename participant</h3>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button style={buttonStyle} onClick={() => {
              renameParticipant(dialogueParticipant as RemoteParticipant, input)
              setIsOpen(false)
            }}>Rename</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <RenameDialogue isOpen={isOpenDialogue} setIsOpen={setIsOpenDialogue}/>

      <button
        onClick={(toggleList)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          padding: '8px 16px',
          background: 'var(--lk-bg2)',
          color: 'var(--lk-text)',
          border: '1px solid var(--lk-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1001,
          width: 'calc(100vw - 40px)',
        }}
      >
        {isListVisible ? 'Hide Participants' : 'Show Participants'} ({participants.length})
      </button>
      
      {isListVisible && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            left: '20px',
            background: 'var(--lk-bg2)',
            border: '1px solid var(--lk-border)',
            borderRadius: '4px',
            padding: '16px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            width: 'calc(100vw - 40px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {participants.map((participant) => {
              const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
              const role = metadata.role || 'participant';
              const isLocal = participant.isLocal;
              const isMuted = isParticipantMuted(participant as RemoteParticipant);
              const isVideoDisabled = isParticipantVideoDisabled(participant as RemoteParticipant);

              return (
                <div 
                  key={participant.sid} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--lk-border)'
                  }}
                > 
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '.5rem' }}>
                    <span style={{ 
                      fontWeight: isLocal ? 'bold' : 'normal',
                      color: isLocal ? 'white' : 'var(--lk-text)'
                    }}>
                      {`${participant.identity.split('__')[0]} (${role})`}
                    </span>
                  </div>

                  {
                    isHost ?
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
                        <button
                          onClick={() => kickParticipant(participant as RemoteParticipant)}
                          disabled={!isHost || isLocal || isProcessing}
                          title='Only host can kick a participant'
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          ❌
                        </button>
                        <button
                          onClick={() => {
                            setdialogueParticipant(participant as RemoteParticipant)
                            setIsOpenDialogue(true)
                          }}
                          disabled={!isHost || isLocal || isProcessing}
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                            opacity: isHost && !isLocal && !isProcessing ? 1 : 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          @
                        </button>
                        <button
                          onClick={() => {
                            toggleWaitingRoom(participant as RemoteParticipant)
                          }}
                          disabled={!isHost || isLocal || isProcessing}
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                            opacity: isHost && !isLocal && !isProcessing ? 1 : 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          🚪
                        </button>
                        <button
                          onClick={() => {
                            toggleCoHost(participant as RemoteParticipant)
                          }}
                          disabled={!isHost || isLocal || isProcessing}
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: isHost && !isLocal && !isProcessing ? 'pointer' : 'not-allowed',
                            opacity: isHost && !isLocal && !isProcessing ? 1 : 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          ♔
                        </button>
                    </div>
                    : <></>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}