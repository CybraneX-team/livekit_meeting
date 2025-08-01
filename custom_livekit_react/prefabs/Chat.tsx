import { type ChatMessage, type ChatOptions } from '@livekit/components-core';
import { RoomEvent } from 'livekit-client';
import * as React from 'react';
import { useMaybeLayoutContext, useRoomContext } from '../context';
import { cloneSingleChild } from '../utils';
import type { MessageFormatter } from '../components/ChatEntry';
import { ChatEntry } from '../components/ChatEntry';
import { useChat } from '../hooks/useChat';
import { useRemoteParticipants } from '../hooks/useRemoteParticipants';
import { ChatToggle } from '../components';
import ChatCloseIcon from '../assets/icons/ChatCloseIcon';
import { useLocalParticipant } from '../hooks/useLocalParticipant';

/** @public */
export interface ChatProps extends React.HTMLAttributes<HTMLDivElement>, ChatOptions {
  messageFormatter?: MessageFormatter;
}

/**
 * The Chat component provides ready-to-use chat functionality in a LiveKit room.
 * Messages are distributed to all participants in the room in real-time.
 *
 * @remarks
 * - Only users who are in the room at the time of dispatch will receive messages
 * - Message history is not persisted between sessions
 * - Requires `@livekit/components-styles` to be imported for styling
 *
 * @example
 * ```tsx
 * import '@livekit/components-styles';
 *
 * function Room() {
 *   return (
 *     <LiveKitRoom data-lk-theme="default">
 *       <Chat />
 *     </LiveKitRoom>
 *   );
 * }
 * ```
 *
 * For custom styling, refer to: https://docs.livekit.io/reference/components/react/concepts/style-components/
 *
 * @public
 */
export function Chat({
  messageFormatter,
  messageDecoder,
  messageEncoder,
  channelTopic,
  ...props
}: ChatProps) {
  const ulRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>('all');
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isHost, setIsHost] = React.useState(false);
  const [hosts, setHosts] = React.useState<typeof remoteParticipants>([]);

  const chatOptions: ChatOptions = React.useMemo(() => {
    return { messageDecoder, messageEncoder, channelTopic };
  }, [messageDecoder, messageEncoder, channelTopic]);

  const { chatMessages, send, isSending } = useChat(chatOptions);

  const layoutContext = useMaybeLayoutContext();
  const lastReadMsgAt = React.useRef<ChatMessage['timestamp']>(0);

  React.useEffect(() => {
    const getMetadataRole = (p: { metadata?: string }) => {
      try {
        const metadata = JSON.parse(p.metadata ?? '{}');
        return metadata?.role;
      } catch (e) {
        console.error('Failed to parse metadata', e);
        return undefined;
      }
    };

    const updateParticipants = () => {
      setIsHost(getMetadataRole(localParticipant) === 'host');
      const remoteHosts = remoteParticipants.filter((p) => getMetadataRole(p) === 'host');
      setHosts(remoteHosts);
    };

    updateParticipants();

    room.on(RoomEvent.ParticipantMetadataChanged, updateParticipants);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);

    return () => {
      room.off(RoomEvent.ParticipantMetadataChanged, updateParticipants);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
    };
  }, [localParticipant, remoteParticipants, room]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (send && inputRef.current && inputRef.current.value.trim() !== '') {
      const destinationIdentities =
        selectedParticipant === 'all' ? undefined : [selectedParticipant];
      await send(inputRef.current.value, {
        destinationIdentities: destinationIdentities,
      });
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  React.useEffect(() => {
    if (ulRef) {
      ulRef.current?.scrollTo({ top: ulRef.current.scrollHeight });
    }
  }, [ulRef, chatMessages]);

  React.useEffect(() => {
    if (!layoutContext || chatMessages.length === 0) {
      return;
    }

    if (
      layoutContext.widget.state?.showChat &&
      chatMessages.length > 0 &&
      lastReadMsgAt.current !== chatMessages[chatMessages.length - 1]?.timestamp
    ) {
      lastReadMsgAt.current = chatMessages[chatMessages.length - 1]?.timestamp;
      return;
    }

    const unreadMessageCount = chatMessages.filter(
      (msg) => !lastReadMsgAt.current || msg.timestamp > lastReadMsgAt.current,
    ).length;

    const { widget } = layoutContext;
    if (unreadMessageCount > 0 && widget.state?.unreadMessages !== unreadMessageCount) {
      widget.dispatch?.({ msg: 'unread_msg', count: unreadMessageCount });
    }
  }, [chatMessages, layoutContext?.widget]);

  return (
    <div
      {...props}
      className="lk-chat"
      style={{
        position: "fixed",
        top: '0',
        right: "0",
        bottom: 'var(--lk-control-bar-height)',
        ...(props.style || {}),
      }}
    >
      <div className="lk-chat-header">
        Messages
        {layoutContext && (
          <ChatToggle className="lk-close-button">
            <ChatCloseIcon />
          </ChatToggle>
        )}
      </div>

      <ul className="lk-list lk-chat-messages" ref={ulRef}>
        {props.children
          ? chatMessages.map((msg, idx) =>
              cloneSingleChild(props.children, {
                entry: msg,
                key: msg.id ?? idx,
                messageFormatter,
              }),
            )
          : chatMessages.map((msg, idx, allMsg) => {
              const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;
              // If the time delta between two messages is bigger than 60s show timestamp.
              const hideTimestamp = idx >= 1 && msg.timestamp - allMsg[idx - 1].timestamp < 60_000;

              return (
                <ChatEntry
                  key={msg.id ?? idx}
                  hideName={hideName}
                  hideTimestamp={hideName === false ? false : hideTimestamp} // If we show the name always show the timestamp as well.
                  entry={msg}
                  messageFormatter={messageFormatter}
                />
              );
            })}
      </ul>
      <form className="lk-chat-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="lk-form-control"
            style={{ flexShrink: 0 }}
          >
            <option value="all">All</option>
            {(isHost ? remoteParticipants : hosts).map((p) => (
              <option key={p.identity} value={p.identity}>
                {p.name || p.identity}
              </option>
            ))}
          </select>
          <input
            className="lk-form-control lk-chat-form-input"
            disabled={isSending}
            ref={inputRef}
            type="text"
            placeholder="Enter a message..."
            onInput={(ev) => ev.stopPropagation()}
            onKeyDown={(ev) => ev.stopPropagation()}
            onKeyUp={(ev) => ev.stopPropagation()}
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" className="lk-button lk-chat-form-button" disabled={isSending}>
          Send
        </button>
      </form>
    </div>
  );
}
