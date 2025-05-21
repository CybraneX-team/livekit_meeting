"use client"

import React, { useReducer } from 'react';
import { MyGlobalContext } from './MyGlobalContext';
import { MyGlobalAction, MyGlobalState } from './types';

const initialState: MyGlobalState = {
  participantListVisible: false,
  massControlVisible: false,
};

function myReducer(state: MyGlobalState, action: MyGlobalAction): MyGlobalState {
  switch (action.type) {
    case 'participantListVisibleToggle':
      return { ...state, participantListVisible: !state.participantListVisible };
    case 'massControlVisibleToggle':
      return { ...state, massControlVisible: !state.massControlVisible };
    default:
      const _exhaustiveCheck: never = action;
      return state;  
  }
}

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(myReducer, initialState);

  return (
    <MyGlobalContext.Provider value={{ state, dispatch }}>
      {children}
    </MyGlobalContext.Provider>
  );
}
