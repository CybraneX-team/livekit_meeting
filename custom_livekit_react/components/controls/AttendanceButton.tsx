import * as React from 'react';
import { useAttendanceButton } from '@/custom_livekit_react/hooks/useAttendanceButton';

export interface AttendanceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const AttendanceButton = React.forwardRef<HTMLButtonElement, AttendanceButtonProps>(
  function AttendanceButton(props: AttendanceButtonProps, ref) {
    const { buttonProps } = useAttendanceButton();
    return (
      <button ref={ref} {...buttonProps}>
        {props.children}
      </button>
    );
  },
); 