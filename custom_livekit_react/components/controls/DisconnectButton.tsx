import * as React from 'react';
import { useDisconnectButton } from '../../hooks';
import { ConfirmModal } from '../../../components/ui/Button';

/** @public */
export interface DisconnectButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  stopTracks?: boolean;
}

/**
 * The `DisconnectButton` is a basic html button with the added ability to disconnect from a LiveKit room.
 * Normally this is the big red button that allows end users to leave the video or audio call.
 *
 * @example
 * ```tsx
 * <LiveKitRoom>
 *   <DisconnectButton>Leave room</DisconnectButton>
 * </LiveKitRoom>
 * ``` 
 * @public
 */
export const DisconnectButton: (
  props: DisconnectButtonProps & React.RefAttributes<HTMLButtonElement>,
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, DisconnectButtonProps>(
  function DisconnectButton(props: DisconnectButtonProps, ref) {
    const { buttonProps } = useDisconnectButton(props);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    // Extract the original onClick handler
    const originalOnClick = buttonProps.onClick;

    const handleDisconnect = async (e: React.MouseEvent<HTMLButtonElement>) => {
      setLoading(true);
      try {
        if (originalOnClick) await originalOnClick(e);
        setShowConfirm(false);
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <button
          ref={ref}
          {...buttonProps}
          onClick={e => {
            e.preventDefault();
            setShowConfirm(true);
          }}
        >
          {props.children}
        </button>
        <ConfirmModal
          isOpen={showConfirm}
          title="Leave Room?"
          message="Are you sure you want to leave the room? You will be disconnected from the meeting."
          onConfirm={handleDisconnect}
          onCancel={() => setShowConfirm(false)}
          confirmText="Leave"
          cancelText="Cancel"
          loading={loading}
        />
      </>
    );
  },
);
