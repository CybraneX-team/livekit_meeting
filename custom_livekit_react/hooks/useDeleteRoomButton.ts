import * as React from 'react';
import { useRoomContext } from '../context';
import { mergeProps } from '../mergeProps';

export function useDeleteRoomButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const room = useRoomContext();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!room?.name) return;
    setLoading(true);
    try {
      await fetch('/api/participant-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'destroy-room',
          roomName: room.name,
        }),
      });
      // Optionally disconnect or redirect
      room.disconnect();
      // window.location.href = '/'; // Uncomment to redirect after deletion
    } catch (e) {
      alert('Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  const buttonProps = mergeProps(props, {
    onClick: handleDelete,
    disabled: loading,
    className: 'lk-disconnect-button'
  });

  return { buttonProps };
} 