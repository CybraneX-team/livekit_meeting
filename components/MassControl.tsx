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
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpenDialogue, setIsOpenDialogue] = useState<boolean>(false);
  const [dialogueParticipant, setdialogueParticipant] = useState<RemoteParticipant>();
  const [publishingDisabled, setPublishingDisabled] = useState(false);

  useEffect(() => {
    const handleRoomStateChange = (state: ConnectionState) => {
        if(state === "connected") {
            setIsProcessing(false);
        } else {
            setIsProcessing(true);
        }
    }

    room.on("connectionStateChanged", handleRoomStateChange)

    return () => {
        room.off("connectionStateChanged", handleRoomStateChange)
    }
  }, [room])

  const handlePublishingToggle = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const action = publishingDisabled ? 'mass-enable-publishing' : 'mass-disable-publishing';
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

      if (response.ok) {
        setPublishingDisabled(!publishingDisabled);
      }
    } catch (error) {
      console.error('Error toggling publishing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter out local participant and only show remote participants
  const remoteParticipants = participants.filter(p => p.identity !== localParticipant?.identity) as RemoteParticipant[];

  return (
    <>
      {state.massControlVisible && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9em', color: 'var(--lk-text-secondary)' }}>Publishing</span>
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '50px',
                    height: '24px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => !isProcessing && handlePublishingToggle()}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: publishingDisabled ? 'var(--lk-danger)' : 'var(--lk-success)',
                      transition: 'background-color 0.4s',
                      borderRadius: '24px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: publishingDisabled ? '2px' : '28px',
                      top: '2px',
                      backgroundColor: 'white',
                      transition: 'left 0.4s',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
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