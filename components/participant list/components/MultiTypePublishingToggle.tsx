import { LocalParticipant, RemoteParticipant, RoomEvent } from "livekit-client";
import { useContext, useEffect, useState } from "react";
import { HiMiniVideoCamera, HiVideoCameraSlash } from "react-icons/hi2";
import { ParentContext } from "../ParticipantList";
import { useLocalParticipant } from "@/custom_livekit_react";

const extractRoleFromParticipant = (participant: RemoteParticipant | LocalParticipant) => {
    const parse = JSON.parse(participant.metadata ?? JSON.stringify({
        role: "participant"
    }))
    return parse.role
}

interface MultiTypePublishingToggleProps {
  participant: RemoteParticipant | LocalParticipant;
}

export const MultiTypePublishingToggle: React.FC<MultiTypePublishingToggleProps> = ({ participant }) => {    
    const { room, isProcessing, setIsProcessing } = useContext(ParentContext);
    
    const [canPublish, setCanPublishing] = useState(false);
    const [role, setRole] = useState("participant")
    const { localParticipant } = useLocalParticipant();

    useEffect(() => {
        setRole(extractRoleFromParticipant(participant))
    }, [participant])

    useEffect(() => {
        const handleParticipantMetadataChanged = (metadata: (string | undefined), participant: (RemoteParticipant | LocalParticipant)) => {
            setRole(extractRoleFromParticipant(participant))
        }

        room?.on(RoomEvent.ParticipantMetadataChanged, handleParticipantMetadataChanged)

        return () => {
            room?.off(RoomEvent.ParticipantMetadataChanged, handleParticipantMetadataChanged)
        }
    }, [room])

    const toggleParticipantPublishing = async () => {
        if(!participant || !localParticipant) return;

        setIsProcessing(true);

        let payload = {
            microphone: !canPublish,
            camera: !canPublish,
            screenShare: !canPublish
        }

        try { 
            localParticipant.performRpc({
                destinationIdentity: participant.identity,
                method: 'set-publishing',
                payload: JSON.stringify(payload),
            })

            // Notify with publishData (type: can-publish)
            if (room && room.localParticipant) {
                const notifyData = {
                    type: "notify",
                    action: "can-publish",
                    name: localParticipant.name,
                    identity: localParticipant.identity
                };
                await room.localParticipant.publishData(
                    new TextEncoder().encode(JSON.stringify(notifyData)),
                    { reliable: true }
                );
            }

            setCanPublishing(!canPublish)
        } catch(e) {
            console.error(`Error toggling publishing:`, e);
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <button
            onClick={() => toggleParticipantPublishing()}
            disabled={((role === "host") || participant.isLocal || isProcessing)}
            title={(canPublish ? `Disable publishing` : `Enable publishing`)}
            style={{
                padding: '8px',
                background: canPublish ? 'var(--lk-bg2)' : 'var(--lk-danger)',
                color: 'var(--lk-text)',
                border: '1px solid var(--lk-border)',
                borderRadius: '4px',
                cursor: ((role === "host") || participant.isLocal || isProcessing) ? 'not-allowed' : 'pointer',
                opacity: ((role === "host") || participant.isLocal || isProcessing) ? 0.7 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px'
            }}
            >
            {canPublish ?  <HiMiniVideoCamera/> : <HiVideoCameraSlash/>}
        </button>
    )
}