import React, { useState } from 'react';
import { useLocalParticipant, useRoomContext } from '../../index';
import { FaHandPaper } from "react-icons/fa";

interface RaiseHandButtonProps {
  onHandStateChange?: (action: 'raise' | 'lower', identity: string) => void;
}

export const RaiseHandButton = ({ onHandStateChange }: RaiseHandButtonProps) => {
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
      // Immediately update the global state for local participant
      onHandStateChange?.("raise", localParticipant.identity);
    } else {
      data.action = "lower"
      setHandState("lower")
      // Immediately update the global state for local participant
      onHandStateChange?.("lower", localParticipant.identity);
    }
    
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      { reliable: true }
    );
  };

  return (
    <button
      className="lk-button"
      onClick={toggleHand}
      style={{
        border: (handState === "lower") ? undefined : "white 2px solid"
      }}
      aria-pressed={handState === "raise"}
      title={handState === "raise" ? "Lower hand" : "Raise hand"}
    >
      <FaHandPaper />
    </button>
  );
}; 