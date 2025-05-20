import * as React from 'react';
import { useMassControlButton } from '@/custom_livekit_react/hooks/useMassControlButton';

/** @public */
export interface MassControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const MassControlButton: (
  props: MassControlButtonProps & React.RefAttributes<HTMLButtonElement>,
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, MassControlButtonProps>(
  function MassControlButton(props: MassControlButtonProps, ref) {
    const { buttonProps } = useMassControlButton();

    return (
      <button ref={ref} {...buttonProps}>
        {props.children}
      </button>
    );
  },
);
