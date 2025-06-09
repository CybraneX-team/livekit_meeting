import { LocalParticipant, RemoteParticipant, RoomEvent } from "livekit-client";
import { useContext, useEffect, useState } from "react";
import { AiFillAudio, AiOutlineAudioMuted } from "react-icons/ai";
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
  type: string;
}

export const MultiTypePublishingToggle: React.FC<MultiTypePublishingToggleProps> = ({ participant, type }) => {    
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

        let payload = {}

        if(type === "audio") {
            payload = {
                microphone: !canPublish
            }
        } else if(type === "video") {
            payload = {
                camera: !canPublish
            }
        }

        try { 
            localParticipant.performRpc({
                destinationIdentity: participant.identity,
                method: 'set-publishing',
                payload: JSON.stringify(payload),
            })

            setCanPublishing(!canPublish)
        } catch(e) {
            console.error(`Error toggling ${type} publishing:`, e);
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <button
            onClick={() => toggleParticipantPublishing()}
            disabled={((role === "host") || participant.isLocal || isProcessing)}
            title={(canPublish ? `Disable ${type}` : `Enable ${type}`)}
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
            {canPublish ? (type === "audio" ? <AiFillAudio/> : <HiMiniVideoCamera/>) : (type === "audio" ? <AiOutlineAudioMuted/> : <HiVideoCameraSlash/>)}
        </button>
    )
}