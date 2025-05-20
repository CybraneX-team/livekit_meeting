import { MyGlobalContext } from '@/state_mangement/MyGlobalContext';
import { mergeProps } from '../mergeProps';
import * as React from 'react';

/** @public */
export interface ParticipantButtonProps {}

export function useParticipantButton() {

  const { dispatch } = React.useContext(MyGlobalContext)

  const buttonProps = React.useMemo(() => {
    return {
      "className": "lk-button",    
      onClick: () => {
          if (dispatch) dispatch({ type: 'participantListVisibleToggle' })
      }
    }
  }, [dispatch]);

  return { buttonProps };
}
