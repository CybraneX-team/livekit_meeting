import { createContext } from 'react';
import { MyGlobalContextType } from './types'

// Provide a default dummy value that matches the shape (will be overridden in Provider)
export const MyGlobalContext = createContext<MyGlobalContextType>({
  state: {
    participantListVisible: false,
    massControlVisible: false,
  },
  dispatch: () => {
    throw new Error('dispatch function must be overridden by MyProvider');
  },
});
