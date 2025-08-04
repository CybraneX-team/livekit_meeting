import { useParticipants, useRoomContext, useLocalParticipant } from '../../custom_livekit_react';
import { useState, useEffect, useContext, createContext, SetStateAction, Dispatch } from 'react';
import { Track, RemoteParticipant, ParticipantEvent, DataPacket_Kind, Participant, RoomEvent, LocalParticipant, Room } from 'livekit-client';
import { CiCircleRemove } from "react-icons/ci"; 
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { FaDoorOpen } from "react-icons/fa";
import { MdOutlinePerson4 } from "react-icons/md";
import { FaHandPaper } from "react-icons/fa";
import { MyGlobalContext } from '@/state_mangement/MyGlobalContext';
import { MultiTypePublishingToggle } from './components/MultiTypePublishingToggle';
import React from 'react';

const CONN_DETAILS_ENDPOINT = '/api/participant-control';

interface ParticipantListProps {
  handVisible: boolean;
  participantIdentityHand: string;
}

interface ComponentContextType {
  room: any;
  CONN_DETAILS_ENDPOINT: string;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
}

const defaultContextValue: ComponentContextType = {
  room: null,
  CONN_DETAILS_ENDPOINT: "",
  isProcessing: false,
  setIsProcessing: () => {},
};

export const ParentContext = createContext<ComponentContextType>(defaultContextValue);

export function ParticipantList({ handVisible, participantIdentityHand }: ParticipantListProps) {
  const { state, dispatch } = useContext(MyGlobalContext)
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpenDialogue, setIsOpenDialogue] = useState<boolean>(false);
  const [dialogueParticipant, setdialogueParticipant] = useState<RemoteParticipant>();
  const [searchTerm, setSearchTerm] = useState('');
  const [renamedParticipants, setRenamedParticipants] = useState<{[key: string]: string}>({});
  const [isKickModalOpen, setIsKickModalOpen] = useState<boolean>(false);
  const [kickParticipantData, setKickParticipantData] = useState<RemoteParticipant | null>(null);

  // Ref for the participant list container
  const participantListRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!state.participantListVisible) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        participantListRef.current &&
        !participantListRef.current.contains(event.target as Node)
      ) {
        if (dispatch) dispatch({ type: 'participantListVisibleToggle' });
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.participantListVisible, dispatch]);

  const contextValue = {
    room,
    CONN_DETAILS_ENDPOINT,
    isProcessing,
    setIsProcessing
  }

  useEffect(() => {
    if(room.state === "connected") {
      const checkHostStatus = () => {
        if(localParticipant) {
          try {
            const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
            if(metadata.role === 'host') {
              setIsHost(true)
            } else if(metadata.role === 'co-host') {
              setIsHost(true)
            }
          } catch (error) {
            console.error('Error parsing participant metadata:', error);
          }
        } else {
          console.log('No local participant found');
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



  const toggleParticipantAudio = async (participant: RemoteParticipant) => {
    if (isProcessing) {
      console.log('Cannot toggle audio:', { isHost, isCoHost, isProcessing });
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
        isHost,
        isCoHost
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
    if (isProcessing) {
      console.log('Cannot toggle video:', { isHost, isCoHost, isProcessing });
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
        isHost,
        isCoHost
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
    if (isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isCoHost, isProcessing });
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
    if (isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isCoHost, isProcessing });
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
      
      // Manually update the participant name in the list
      setRenamedParticipants(prev => ({
        ...prev,
        [participant.identity]: renameTo.toString()
      }));
    } catch (error) {
      console.error('Error toggling video:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  const toggleCoHost = async (participant: RemoteParticipant) => {
    if (isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isCoHost, isProcessing });
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
    if (isProcessing) {
      console.log('Some other action is in process or you do not permissions', { isHost, isCoHost, isProcessing });
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

  const KickWarningModal: React.FC<DialogProps> = ({ isOpen, setIsOpen }) => {
    const dialogStyle: React.CSSProperties = {
      display: isOpen ? 'block' : 'none',
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--lk-bg2)',
      color: 'var(--lk-text)',
      padding: '24px',
      zIndex: 1010,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      borderRadius: '8px',
      width: '400px',
      textAlign: 'center'
    };
  
    const overlayStyle: React.CSSProperties = {
      display: isOpen ? 'block' : 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1009
    };

    const buttonContainerStyle: React.CSSProperties = {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginTop: '20px'
    };

    const cancelButtonStyle: React.CSSProperties = {
      padding: '10px 20px',
      backgroundColor: 'transparent',
      color: 'var(--lk-text)',
      border: '1px solid var(--lk-border)',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    };

    const confirmButtonStyle: React.CSSProperties = {
      padding: '10px 20px',
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    };

    const warningIconStyle: React.CSSProperties = {
      fontSize: '48px',
      color: '#ffc107',
      marginBottom: '16px'
    };

    const getParticipantDisplayName = () => {
      if (!kickParticipantData) return '';
      const originalName = kickParticipantData.identity.split('__')[0];
      return renamedParticipants[kickParticipantData.identity] || originalName;
    };
    
    return (
      <>
        <div>
          <div style={overlayStyle} onClick={() => setIsOpen(false)}></div>

          <div style={dialogStyle}>
            <div style={warningIconStyle}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--lk-text)' }}>
              Remove Participant
            </h3>
            <p style={{ 
              margin: '0 0 20px 0', 
              color: 'var(--lk-text-secondary)', 
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to remove <strong>{getParticipantDisplayName()}</strong> from the meeting?
            </p>
            <p style={{ 
              margin: '0 0 20px 0', 
              color: '#ffc107', 
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              This action cannot be undone.
            </p>
            <div style={buttonContainerStyle}>
              <button 
                style={cancelButtonStyle} 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button 
                style={confirmButtonStyle} 
                onClick={async () => {
                  if (kickParticipantData) {
                    // Bypass the isProcessing check since modal provides confirmation
                    try {
                      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
                      const payload = {
                        roomName: room.name,
                        participantIdentity: kickParticipantData.identity,
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
                      console.error('Error removing participant:', error);
                    }
                  }
                  setIsOpen(false);
                }}
              >
                Remove Participant
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <ParentContext.Provider value={contextValue}>
      <RenameDialogue isOpen={isOpenDialogue} setIsOpen={setIsOpenDialogue}/>
      <KickWarningModal isOpen={isKickModalOpen} setIsOpen={setIsKickModalOpen}/>

      {state.participantListVisible && (
        <div
          ref={participantListRef}
          style={{
            position: 'fixed',
            top: '8px',
            right: '8px',
            background: 'var(--lk-bg2)',
            border: '1px solid var(--lk-border)',
            borderRadius: '8px',
            padding: '16px',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            width: '340px', // ensure enough width for search bar
            maxHeight: '80vh', // overall sidebar height
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--lk-border)',
              background: 'var(--lk-bg)',
              color: 'var(--lk-text)'
            }}
          />
          {/* Participant count */}
          <div style={{ fontSize: '0.9em', color: 'var(--lk-text-secondary)', marginBottom: '8px' }}>
            {participants.filter((participant) => {
              const originalName = participant.identity.split('__')[0];
              const displayName = renamedParticipants[participant.identity] || originalName;
              return displayName.toLowerCase().includes(searchTerm.toLowerCase());
            }).length} participant{participants.filter((participant) => {
              const originalName = participant.identity.split('__')[0];
              const displayName = renamedParticipants[participant.identity] || originalName;
              return displayName.toLowerCase().includes(searchTerm.toLowerCase());
            }).length !== 1 ? 's' : ''} in list
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              maxHeight: 'calc(80vh - 56px)', // 80vh minus search bar and padding
            }}
          >
            {participants
              .filter((participant) => {
                const originalName = participant.identity.split('__')[0];
                const displayName = renamedParticipants[participant.identity] || originalName;
                return displayName.toLowerCase().includes(searchTerm.toLowerCase());
              })
              .sort((a, b) => {
                // Sort participants with raised hands to the top
                const aHasHandRaised = handVisible && (participantIdentityHand === a.identity);
                const bHasHandRaised = handVisible && (participantIdentityHand === b.identity);
                
                if (aHasHandRaised && !bHasHandRaised) return -1;
                if (!aHasHandRaised && bHasHandRaised) return 1;
                
                // If both have same hand status, sort by name
                const aOriginalName = a.identity.split('__')[0];
                const bOriginalName = b.identity.split('__')[0];
                const aName = renamedParticipants[a.identity] || aOriginalName;
                const bName = renamedParticipants[b.identity] || bOriginalName;
                return aName.localeCompare(bName);
              })
              .map((participant) => {
              const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
              const role = metadata.role || 'participant';
              const isLocal = participant.isLocal;
              
              // Get the display name - use renamed name if available, otherwise use original
              const originalName = participant.identity.split('__')[0];
              const displayName = renamedParticipants[participant.identity] || originalName;

              return (
                <div 
                  key={participant.sid} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--lk-border)',
                  }}
                > 
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '.5rem' }}>
                    <span style={{ 
                      fontWeight: isLocal ? 'bold' : 'normal',
                      color: isLocal ? 'white' : 'var(--lk-text)'
                    }}>
                      {`${displayName} (${role})`}
                    </span>
                    <button
                          disabled={true}
                          style={{
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px',
                            visibility: (handVisible && (participantIdentityHand === participant.identity))? "visible" : "hidden"
                          }}
                        >
                          <FaHandPaper color='yellow' size="16"/>
                        </button>
                  </div>

                  {
                    (isHost || isCoHost) ?
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <MultiTypePublishingToggle participant={participant} disabled={((role === "host") || isLocal || isProcessing)}/>
                        <button
                          onClick={() => {
                            setKickParticipantData(participant as RemoteParticipant);
                            setIsKickModalOpen(true);
                          }}
                          disabled={((role === "host") || isLocal || isProcessing)}
                          title='Remove participant'
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: ((role === "host") || isLocal || isProcessing) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          <CiCircleRemove size="24" />
                        </button>
                        <button
                          onClick={() => {
                            setdialogueParticipant(participant as RemoteParticipant)
                            setIsOpenDialogue(true)
                          }}
                          disabled={((role === "host") || isLocal || isProcessing)}
                          title="Rename"
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: ((role === "host") || isLocal || isProcessing) ? 'not-allowed' : 'pointer',
                            opacity: ((role === "host") || isLocal || isProcessing) ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          <MdOutlineDriveFileRenameOutline size="24" />
                        </button>
                        <button
                          onClick={() => {
                            toggleWaitingRoom(participant as RemoteParticipant)
                          }}
                          disabled={((role === "host") || isLocal || isProcessing)}
                          title="Put in waiting room"
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: ((role === "host") || isLocal || isProcessing) ? 'not-allowed' : 'pointer',
                            opacity: ((role === "host") || isLocal || isProcessing) ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          <FaDoorOpen size="24" />
                        </button>
                        <button
                          onClick={() => {
                            toggleCoHost(participant as RemoteParticipant)
                          }}
                          disabled={((role === "host") || isLocal || isProcessing)}
                          title="Make host"
                          style={{
                            padding: '8px',
                            background: 'var(--lk-bg2)',
                            color: 'var(--lk-text)',
                            border: '1px solid var(--lk-border)',
                            borderRadius: '4px',
                            cursor: ((role === "host") || isLocal || isProcessing) ? 'not-allowed' : 'pointer',
                            opacity: ((role === "host") || isLocal || isProcessing) ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px'
                          }}
                        >
                          <MdOutlinePerson4 size="24"/>  
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
    </ParentContext.Provider>
  );
}