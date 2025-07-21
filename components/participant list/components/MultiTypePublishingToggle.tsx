import { LocalParticipant, RemoteParticipant, RoomEvent } from "livekit-client";
import { useContext, useEffect, useState } from "react";
import { HiMiniVideoCamera, HiVideoCameraSlash } from "react-icons/hi2";
import { ParentContext } from "../ParticipantList";
import { useLocalParticipant } from "@/custom_livekit_react";

interface MultiTypePublishingToggleProps {
  participant: RemoteParticipant | LocalParticipant;
  disabled: boolean
}

export const MultiTypePublishingToggle: React.FC<MultiTypePublishingToggleProps> = ({ participant, disabled }) => {    
    const { room, setIsProcessing } = useContext(ParentContext);
    
    // const [canPublish, setCanPublishing] = useState(false);
    const { localParticipant } = useLocalParticipant();
    

    const toggleParticipantPublishing = async () => {
        if(!participant || !localParticipant) return;

        setIsProcessing(true);

        try { 
            const url = new URL("api/participant-control", window.location.origin);
      
            await fetch(url.toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                roomName: room.name,
                participantIdentity: participant.identity,
                action: "toggle-publishing"
              }),
            });

            // Notify with publishData (type: can-publish)
            // if (room && room.localParticipant) {
            //     const notifyData = {
            //         type: "notify",
            //         action: "can-publish",
            //         name: localParticipant.name,
            //         identity: localParticipant.identity
            //     };
            //     await room.localParticipant.publishData(
            //         new TextEncoder().encode(JSON.stringify(notifyData)),
            //         { reliable: true }
            //     );
            // }

            // setCanPublishing(!canPublish)
        } catch(e) {
            console.error(`Error toggling publishing:`, e);
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <button
            onClick={() => toggleParticipantPublishing()}
            disabled={disabled}
            title="toggle publishing"
            style={{
                padding: '8px',
                background: 'var(--lk-bg2)',
                color: 'var(--lk-text)',
                border: '1px solid var(--lk-border)',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px'
            }}
            >
            <HiMiniVideoCamera/>
        </button>
    )
}