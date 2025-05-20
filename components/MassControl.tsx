import { useParticipants, useRoomContext, useLocalParticipant } from '../custom_livekit_react';
import { useState, useEffect, useContext } from 'react';
import { Track, RemoteParticipant, ParticipantEvent, DataPacket_Kind, Participant } from 'livekit-client';
import { MyGlobalContext } from '@/state_mangement/MyGlobalContext';

export function MassControl() {
  const { state } = useContext(MyGlobalContext)
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpenDialogue, setIsOpenDialogue] = useState<boolean>(false);
  const [dialogueParticipant, setdialogueParticipant] = useState<RemoteParticipant>();

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
            fsdfsd
        </div>
      )}
    </>
  );
}