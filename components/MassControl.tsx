import { useParticipants, useRoomContext, useLocalParticipant } from '../custom_livekit_react';
import { useState, useEffect, useContext } from 'react';
import { Track, RemoteParticipant, ParticipantEvent, DataPacket_Kind, Participant, ConnectionState } from 'livekit-client';
import { MyGlobalContext } from '@/state_mangement/MyGlobalContext';

interface GlobalState {
  massControlVisible: boolean;
}

export function MassControl() {
  const { state } = useContext(MyGlobalContext);
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isProcessing, setIsProcessing] = useState(false);
  const [publishingDisabled, setPublishingDisabled] = useState(false);
  const [massAudioMuted, setMassAudioMuted] = useState(false);
  const [massVideoMuted, setMassVideoMuted] = useState(false);
  const [isHost, setHost] = useState(false);

  useEffect(() => {
    const handleRoomStateChange = (state: ConnectionState) => {
      if(state === "connected") {
        const { role } = JSON.parse(room.localParticipant.metadata ?? "")
        setHost(role === "host" || role === "co-host")
      }
    }

    const handleMetadataChange = () => {
      const { role } = JSON.parse(room.localParticipant.metadata ?? "")
      setHost(role === "host" || role === "co-host")
    }

    room.on("connectionStateChanged", handleRoomStateChange)
    room.on("participantMetadataChanged", handleMetadataChange)

    return () => {
      room.off("connectionStateChanged", handleRoomStateChange)
      room.off("participantMetadataChanged", handleMetadataChange)
    }
  }, [room])

  const handlePublishingToggle = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/participant-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            participantIdentity: localParticipant.identity,
            roomName: room.name,
            action: "mass-toggle-publishing",
        }),
      });

      if (response.ok) {
        setPublishingDisabled(!publishingDisabled);
      }
    } catch (error) {
      console.error('Error toggling publishing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMassAudioToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const action = massAudioMuted ? 'mass-unmute-audio' : 'mass-mute-audio';
      const response = await fetch('/api/participant-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIdentity: localParticipant.identity,
          roomName: room.name,
          action: action,
        }),
      });
    } catch (error) {
      console.error('Error toggling mass audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMassVideoToggle = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const action = massVideoMuted ? 'mass-unmute-video' : 'mass-mute-video';

      await fetch('/api/participant-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIdentity: localParticipant.identity,
          roomName: room.name,
          action: action,
        }),
      });
    } catch (error) {
      console.error('Error toggling mass video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter out local participant and only show remote participants
  const remoteParticipants = participants.filter(p => p.identity !== localParticipant?.identity) as RemoteParticipant[];

  return (
    <>
      {(state.massControlVisible && isHost) && (
        <div
          style={{
            position: 'fixed',
            top: '8px',
            left: '8px',
            background: 'var(--lk-bg2)',
            border: '1px solid var(--lk-border)',
            borderRadius: '8px',
            padding: '16px',
            overflowY: 'auto',
            zIndex: 1200,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '8px' }}>Mass Controls</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handlePublishingToggle}
                  disabled={isProcessing}
                  style={{
                    padding: '8px 16px',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    fontWeight: 'bold',
                  }}
                >
                  Toggle publishing
                </button>
              </div>
              <button
                onClick={handleMassAudioToggle}
                disabled={isProcessing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--lk-bg3)',
                  color: 'var(--lk-text)',
                  border: '1px solid var(--lk-border)',
                  borderRadius: '4px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.backgroundColor = 'var(--lk-bg4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.backgroundColor = 'var(--lk-bg3)';
                  }
                }}
              >
                Mute All Audio
              </button>
              <button
                onClick={handleMassVideoToggle}
                disabled={isProcessing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--lk-bg3)',
                  color: 'var(--lk-text)',
                  border: '1px solid var(--lk-border)',
                  borderRadius: '4px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.backgroundColor = 'var(--lk-bg4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.backgroundColor = 'var(--lk-bg3)';
                  }
                }}
              >
                Mute All Video
              </button>
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--lk-text-secondary)' }}>
              {remoteParticipants.length} participant{remoteParticipants.length !== 1 ? 's' : ''} in room
            </div>
          </div>
        </div>
      )}
    </>
  );
}