"use client"

import React, { useReducer } from 'react';
import { MyGlobalContext } from './MyGlobalContext';


// Define actions
const initialState = { 
  participantListVisible: false ,
  massControlVisible: false
};

function myReducer(state, action) {
  switch (action.type) {
    case 'participantListVisibleToggle':
      return { participantListVisible: !(state.participantListVisible) };
    case 'massControlVisibleToggle':
      return { massControlVisible: !(state.massControlVisible) };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function MyProvider({ children }) {
  const [state, dispatch] = useReducer(myReducer, initialState);

  return (
    <MyGlobalContext.Provider value={{ state, dispatch }}>
      {children}
    </MyGlobalContext.Provider>
  );
}
