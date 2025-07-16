import * as React from 'react';
import { useDeleteRoomButton } from '../../hooks';
import { ConfirmModal } from '../../../components/ui/Button';

export interface DeleteRoomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DeleteRoomButton = React.forwardRef<HTMLButtonElement, DeleteRoomButtonProps>(
  function DeleteRoomButton(props, ref) {
    const { buttonProps } = useDeleteRoomButton(props);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    // Extract the original onClick handler
    const originalOnClick = buttonProps.onClick;

    const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
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
          {props.children ?? 'Delete Room'}
        </button>
        <ConfirmModal
          isOpen={showConfirm}
          title="Delete Room?"
          message="This action will permanently delete the room for all participants. Are you sure you want to continue?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          confirmText="Delete"
          cancelText="Cancel"
          loading={loading}
        />
      </>
    );
  }
); 