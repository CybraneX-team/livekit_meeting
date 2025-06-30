import * as React from 'react';
import { useDeleteRoomButton } from '../../hooks';

export interface DeleteRoomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DeleteRoomButton = React.forwardRef<HTMLButtonElement, DeleteRoomButtonProps>(
  function DeleteRoomButton(props, ref) {
    const { buttonProps } = useDeleteRoomButton(props);
    return (
      <button ref={ref} {...buttonProps}>
        {props.children ?? 'Delete Room'}
      </button>
    );
  }
); 