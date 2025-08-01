import * as React from 'react';
import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';
import type { ParticipantClickEvent, TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { isTrackReference, isTrackReferencePinned } from '@livekit/components-core';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { ParticipantName } from './ParticipantName';
import { TrackMutedIndicator } from './TrackMutedIndicator';
import {
  ParticipantContext,
  TrackRefContext,
  useEnsureTrackRef,
  useFeatureContext,
  useMaybeLayoutContext,
  useMaybeParticipantContext,
  useMaybeTrackRefContext,
} from '../../context';
import { FocusToggle } from '../controls/FocusToggle';
import { ParticipantPlaceholder } from '../../assets/images';
import { LockLockedIcon, ScreenShareIcon } from '../../assets/icons';
import { FaHandPaper } from 'react-icons/fa';
import { VideoTrack } from './VideoTrack';
import { AudioTrack } from './AudioTrack';
import { useParticipantTile } from '../../hooks';
import { useIsEncrypted } from '../../hooks/useIsEncrypted';

/**
 * The `ParticipantContextIfNeeded` component only creates a `ParticipantContext`
 * if there is no `ParticipantContext` already.
 * @example
 * ```tsx
 * <ParticipantContextIfNeeded participant={trackReference.participant}>
 *  ...
 * </ParticipantContextIfNeeded>
 * ```
 * @public
 */
export function ParticipantContextIfNeeded(
  props: React.PropsWithChildren<{
    participant?: Participant;
  }>,
) {
  const hasContext = !!useMaybeParticipantContext();
  return props.participant && !hasContext ? (
    <ParticipantContext.Provider value={props.participant}>
      {props.children}
    </ParticipantContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/**
 * Only create a `TrackRefContext` if there is no `TrackRefContext` already.
 * @internal
 */
export function TrackRefContextIfNeeded(
  props: React.PropsWithChildren<{
    trackRef?: TrackReferenceOrPlaceholder;
  }>,
) {
  const hasContext = !!useMaybeTrackRefContext();
  return props.trackRef && !hasContext ? (
    <TrackRefContext.Provider value={props.trackRef}>{props.children}</TrackRefContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/** @public */
export interface ParticipantTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The track reference to display. */
  trackRef?: TrackReferenceOrPlaceholder;
  disableSpeakingIndicator?: boolean;

  onParticipantClick?: (event: ParticipantClickEvent) => void;
  /**
   * Array of participant identities who have raised their hand.
   * If the current participant's identity is in this array, show the hand icon.
   */
  raisedHandIdentities?: string[];
}

/**
 * The `ParticipantTile` component is the base utility wrapper for displaying a visual representation of a participant.
 * This component can be used as a child of the `TrackLoop` component or by passing a track reference as property.
 *
 * @example Using the `ParticipantTile` component with a track reference:
 * ```tsx
 * <ParticipantTile trackRef={trackRef} />
 * ```
 * @example Using the `ParticipantTile` component as a child of the `TrackLoop` component:
 * ```tsx
 * <TrackLoop>
 *  <ParticipantTile />
 * </TrackLoop>
 * ```
 * @public
 */
export const ParticipantTile: (
  props: ParticipantTileProps & React.RefAttributes<HTMLDivElement>,
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ParticipantTileProps>(
  function ParticipantTile(
    {
      trackRef,
      children,
      onParticipantClick,
      disableSpeakingIndicator,
      raisedHandIdentities,
      ...htmlProps
    }: ParticipantTileProps,
    ref,
  ) {
    const trackReference = useEnsureTrackRef(trackRef);

    const { elementProps } = useParticipantTile<HTMLDivElement>({
      htmlProps,
      disableSpeakingIndicator,
      onParticipantClick,
      trackRef: trackReference,
    });
    const isEncrypted = useIsEncrypted(trackReference.participant);
    const layoutContext = useMaybeLayoutContext();

    const autoManageSubscription = useFeatureContext()?.autoSubscription;

    const handleSubscribe = React.useCallback(
      (subscribed: boolean) => {
        if (
          trackReference.source &&
          !subscribed &&
          layoutContext &&
          layoutContext.pin.dispatch &&
          isTrackReferencePinned(trackReference, layoutContext.pin.state)
        ) {
          layoutContext.pin.dispatch({ msg: 'clear_pin' });
        }
      },
      [trackReference, layoutContext],
    );

    const participantIdentity = trackReference?.participant?.identity;
    const showHand =
      Array.isArray(raisedHandIdentities) &&
      participantIdentity &&
      raisedHandIdentities.includes(participantIdentity);

    return (
      <div ref={ref} style={{ position: 'relative' }} {...elementProps}>
        {/* Hand-raise indicator in top right */}
        {showHand && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '50%',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Hand Raised"
          >
            <FaHandPaper color="yellow" size={20} />
          </div>
        )}
        <TrackRefContextIfNeeded trackRef={trackReference}>
          <ParticipantContextIfNeeded participant={trackReference.participant}>
            {children ?? (
              <>
                {isTrackReference(trackReference) &&
                (trackReference.publication?.kind === 'video' ||
                  trackReference.source === Track.Source.Camera ||
                  trackReference.source === Track.Source.ScreenShare) ? (
                  // Mitigate screen mirroring for local screen share
                  trackReference.source === Track.Source.ScreenShare && trackReference.participant.isLocal ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '1.2rem',
                        borderRadius: '8px',
                        minHeight: '160px',
                        minWidth: '240px',
                        textAlign: 'center',
                        flexDirection: 'column',
                        zIndex: 2,
                      }}
                    >
                      <ScreenShareIcon style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                      You are sharing your screen
                    </div>
                  ) : (
                    <VideoTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                      manageSubscription={autoManageSubscription}
                    />
                  )
                ) : (
                  isTrackReference(trackReference) && (
                    <AudioTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                    />
                  )
                )}
                <div className="lk-participant-placeholder">
                  <ParticipantPlaceholder />
                </div>
                <div className="lk-participant-metadata">
                  <div className="lk-participant-metadata-item">
                    {trackReference.source === Track.Source.Camera ? (
                      <>
                        {isEncrypted && <LockLockedIcon style={{ marginRight: '0.25rem' }} />}
                        <TrackMutedIndicator
                          trackRef={{
                            participant: trackReference.participant,
                            source: Track.Source.Microphone,
                          }}
                          show={'muted'}
                        ></TrackMutedIndicator>
                        <ParticipantName />
                      </>
                    ) : (
                      <>
                        <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
                        <ParticipantName>&apos;s screen</ParticipantName>
                      </>
                    )}
                  </div>
                  <ConnectionQualityIndicator className="lk-participant-metadata-item" />
                </div>
              </>
            )}
            <FocusToggle trackRef={trackReference} />
          </ParticipantContextIfNeeded>
        </TrackRefContextIfNeeded>
      </div>
    );
  },
);
