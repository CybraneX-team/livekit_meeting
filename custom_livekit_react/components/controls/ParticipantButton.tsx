import * as React from 'react';
import { useParticipantButton } from '@/custom_livekit_react/hooks/useParticipantButton';

/** @public */
export interface ParticipantButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const ParticipantButton: (
  props: ParticipantButtonProps & React.RefAttributes<HTMLButtonElement>,
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ParticipantButtonProps>(
  function ParticipantButton(props: ParticipantButtonProps, ref) {
    const { buttonProps } = useParticipantButton();

    return (
      <button ref={ref} {...buttonProps}>
        {props.children}
      </button>
    );
  },
);
