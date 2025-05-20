import React, { useState } from 'react';
import { useLocalParticipant, useRoomContext } from '../custom_livekit_react';
import { FaHandPaper } from "react-icons/fa";

export const RaiseHandButton = () => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [handState, setHandState] = useState('lower');

  const toggleHand = async () => {
    let data = {
      type: "notify",
      action: "",
      name: localParticipant.name,
      identity: localParticipant.identity
    }

    if(handState === "lower") {
      data.action = "raise"
      setHandState("raise")
    } else {
      data.action = "lower"
      setHandState("lower")
    }
    
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      { reliable: true }
    );
  };

  return (
    <button
      onClick={toggleHand}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--lk-bg2)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        border: (handState === "lower") ? "none" : "white 2px solid"
      }}
    >
      <FaHandPaper />
    </button>
  );
}; 