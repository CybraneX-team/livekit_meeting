import type {
  CreateLocalTracksOptions,
  LocalAudioTrack,
  LocalTrack,
  LocalVideoTrack,
  TrackProcessor,
} from 'livekit-client';
import {
  createLocalAudioTrack,
  createLocalTracks,
  createLocalVideoTrack,
  facingModeFromLocalTrack,
  Track,
  VideoPresets,
  Mutex,
} from 'livekit-client';
import * as React from 'react';
import { MediaDeviceMenu } from './MediaDeviceMenu';
import { TrackToggle } from '../components/controls/TrackToggle';
import type { LocalUserChoices } from '@livekit/components-core';
import { log } from '@livekit/components-core';
import { ParticipantPlaceholder } from '../assets/images';
import { useMediaDevices, usePersistentUserChoices } from '../hooks';
import { useWarnAboutMissingStyles } from '../hooks/useWarnAboutMissingStyles';
import { roomOptionsStringifyReplacer } from '../utils';

/**
 * Props for the PreJoin component.
 * @public
 */
export interface PreJoinProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit' | 'onError'> {
  /** This function is called with the `LocalUserChoices` if validation is passed. */
  onSubmit?: (values: LocalUserChoices) => void;
  /**
   * Provide your custom validation function. Only if validation is successful the user choices are past to the onSubmit callback.
   */
  onValidate?: (values: LocalUserChoices) => boolean;
  onError?: (error: Error) => void;
  /** Prefill the input form with initial values. */
  defaults?: Partial<LocalUserChoices>;
  /** Display a debug window for your convenience. */
  debug?: boolean;
  joinLabel?: string;
  micLabel?: string;
  camLabel?: string;
  userLabel?: string;
  /**
   * If true, user choices are persisted across sessions.
   * @defaultValue true
   * @alpha
   */
  persistUserChoices?: boolean;
  videoProcessor?: TrackProcessor<Track.Kind.Video>;
}

/** @public */
export function usePreviewTracks(
  options: CreateLocalTracksOptions,
  onError?: (err: Error) => void,
) {
  const [tracks, setTracks] = React.useState<LocalTrack[]>();

  const trackLock = React.useMemo(() => new Mutex(), []);

  React.useEffect(() => {
    let needsCleanup = false;
    let localTracks: Array<LocalTrack> = [];
    trackLock.lock().then(async (unlock) => {
      try {
        if (options.audio || options.video) {
          localTracks = await createLocalTracks(options);

          if (needsCleanup) {
            localTracks.forEach((tr) => tr.stop());
          } else {
            setTracks(localTracks);
          }
        }
      } catch (e: unknown) {
        if (onError && e instanceof Error) {
          onError(e);
        } else {
          log.error(e);
        }
      } finally {
        unlock();
      }
    });

    return () => {
      needsCleanup = true;
      localTracks.forEach((track) => {
        track.stop();
      });
    };
  }, [JSON.stringify(options, roomOptionsStringifyReplacer), onError, trackLock]);

  return tracks;
}

/**
 * @public
 * @deprecated use `usePreviewTracks` instead
 */
export function usePreviewDevice<T extends LocalVideoTrack | LocalAudioTrack>(
  enabled: boolean,
  deviceId: string,
  kind: 'videoinput' | 'audioinput',
) {
  const [deviceError, setDeviceError] = React.useState<Error | null>(null);
  const [isCreatingTrack, setIsCreatingTrack] = React.useState<boolean>(false);

  const devices = useMediaDevices({ kind });
  const [selectedDevice, setSelectedDevice] = React.useState<MediaDeviceInfo | undefined>(
    undefined,
  );

  const [localTrack, setLocalTrack] = React.useState<T>();
  const [localDeviceId, setLocalDeviceId] = React.useState<string>(deviceId);

  React.useEffect(() => {
    setLocalDeviceId(deviceId);
  }, [deviceId]);

  const createTrack = async (deviceId: string, kind: 'videoinput' | 'audioinput') => {
    try {
      const track =
        kind === 'videoinput'
          ? await createLocalVideoTrack({
              deviceId,
              resolution: VideoPresets.h720.resolution,
            })
          : await createLocalAudioTrack({ deviceId });

      const newDeviceId = await track.getDeviceId(false);
      if (newDeviceId && deviceId !== newDeviceId) {
        prevDeviceId.current = newDeviceId;
        setLocalDeviceId(newDeviceId);
      }
      setLocalTrack(track as T);
    } catch (e) {
      if (e instanceof Error) {
        setDeviceError(e);
      }
    }
  };

  const switchDevice = async (track: LocalVideoTrack | LocalAudioTrack, id: string) => {
    await track.setDeviceId(id);
    prevDeviceId.current = id;
  };

  const prevDeviceId = React.useRef(localDeviceId);

  React.useEffect(() => {
    if (enabled && !localTrack && !deviceError && !isCreatingTrack) {
      log.debug('creating track', kind);
      setIsCreatingTrack(true);
      createTrack(localDeviceId, kind).finally(() => {
        setIsCreatingTrack(false);
      });
    }
  }, [enabled, localTrack, deviceError, isCreatingTrack]);

  // switch camera device
  React.useEffect(() => {
    if (!localTrack) {
      return;
    }
    if (!enabled) {
      log.debug(`muting ${kind} track`);
      localTrack.mute().then(() => log.debug(localTrack.mediaStreamTrack));
    } else if (selectedDevice?.deviceId && prevDeviceId.current !== selectedDevice?.deviceId) {
      log.debug(`switching ${kind} device from`, prevDeviceId.current, selectedDevice.deviceId);
      switchDevice(localTrack, selectedDevice.deviceId);
    } else {
      log.debug(`unmuting local ${kind} track`);
      localTrack.unmute();
    }
  }, [localTrack, selectedDevice, enabled, kind]);

  React.useEffect(() => {
    return () => {
      if (localTrack) {
        log.debug(`stopping local ${kind} track`);
        localTrack.stop();
        localTrack.mute();
      }
    };
  }, []);

  React.useEffect(() => {
    setSelectedDevice(devices?.find((dev) => dev.deviceId === localDeviceId));
  }, [localDeviceId, devices]);

  return {
    selectedDevice,
    localTrack,
    deviceError,
  };
}

/**
 * The `PreJoin` prefab component is normally presented to the user before he enters a room.
 * This component allows the user to check and select the preferred media device (camera und microphone).
 * On submit the user decisions are returned, which can then be passed on to the `LiveKitRoom` so that the user enters the room with the correct media devices.
 *
 * @remarks
 * This component is independent of the `LiveKitRoom` component and should not be nested within it.
 * Because it only accesses the local media tracks this component is self-contained and works without connection to the LiveKit server.
 *
 * @example
 * ```tsx
 * <PreJoin />
 * ```
 * @public
 */
export function PreJoin({
  defaults = {},
  onValidate,
  onSubmit,
  onError,
  debug,
  joinLabel = 'Join Room',
  micLabel = 'Microphone',
  camLabel = 'Camera',
  userLabel = 'Username',
  persistUserChoices = true,
  videoProcessor,
  ...htmlProps
}: PreJoinProps) {
  const {
    userChoices: initialUserChoices,
    saveAudioInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveVideoInputEnabled,
    saveUsername,
  } = usePersistentUserChoices({
    defaults,
    preventSave: !persistUserChoices,
    preventLoad: !persistUserChoices,
  });

  const [userChoices, setUserChoices] = React.useState(initialUserChoices);

  // Initialize device settings
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(userChoices.audioEnabled);
  const [videoEnabled, setVideoEnabled] = React.useState<boolean>(userChoices.videoEnabled);
  const [audioDeviceId, setAudioDeviceId] = React.useState<string>(userChoices.audioDeviceId);
  const [videoDeviceId, setVideoDeviceId] = React.useState<string>(userChoices.videoDeviceId);
  const [username, setUsername] = React.useState(userChoices.username);

  // Save user choices to persistent storage.
  React.useEffect(() => {
    saveAudioInputEnabled(audioEnabled);
  }, [audioEnabled, saveAudioInputEnabled]);
  React.useEffect(() => {
    saveVideoInputEnabled(videoEnabled);
  }, [videoEnabled, saveVideoInputEnabled]);
  React.useEffect(() => {
    saveAudioInputDeviceId(audioDeviceId);
  }, [audioDeviceId, saveAudioInputDeviceId]);
  React.useEffect(() => {
    saveVideoInputDeviceId(videoDeviceId);
  }, [videoDeviceId, saveVideoInputDeviceId]);
  React.useEffect(() => {
    saveUsername(username);
  }, [username, saveUsername]);

  const tracks = usePreviewTracks(
    {
      audio: audioEnabled ? { deviceId: initialUserChoices.audioDeviceId } : false,
      video: videoEnabled
        ? { deviceId: initialUserChoices.videoDeviceId, processor: videoProcessor }
        : false,
    },
    onError,
  );

  const videoEl = React.useRef(null);

  const videoTrack = React.useMemo(
    () => tracks?.filter((track) => track.kind === Track.Kind.Video)[0] as LocalVideoTrack,
    [tracks],
  );

  const facingMode = React.useMemo(() => {
    if (videoTrack) {
      const { facingMode } = facingModeFromLocalTrack(videoTrack);
      return facingMode;
    } else {
      return 'undefined';
    }
  }, [videoTrack]);

  const audioTrack = React.useMemo(
    () => tracks?.filter((track) => track.kind === Track.Kind.Audio)[0] as LocalAudioTrack,
    [tracks],
  );

  React.useEffect(() => {
    if (videoEl.current && videoTrack) {
      videoTrack.unmute();
      videoTrack.attach(videoEl.current);
    }

    return () => {
      videoTrack?.detach();
    };
  }, [videoTrack]);

  const [isValid, setIsValid] = React.useState<boolean>();

  const handleValidation = React.useCallback(
    (values: LocalUserChoices) => {
      if (typeof onValidate === 'function') {
        return onValidate(values);
      } else {
        return values.username !== '';
      }
    },
    [onValidate],
  );

  React.useEffect(() => {
    const newUserChoices = {
      username,
      videoEnabled,
      videoDeviceId,
      audioEnabled,
      audioDeviceId,
    };
    setUserChoices(newUserChoices);
    setIsValid(handleValidation(newUserChoices));
  }, [username, videoEnabled, handleValidation, audioEnabled, audioDeviceId, videoDeviceId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (handleValidation(userChoices)) {
      if (typeof onSubmit === 'function') {
        onSubmit(userChoices);
      }
    } else {
      log.warn('Validation failed with: ', userChoices);
    }
  }

  useWarnAboutMissingStyles();

  return (
    <div className="lk-prejoin" {...htmlProps}>
      <div className="lk-video-container">
        {videoTrack && (
          <video ref={videoEl} width="1280" height="720" data-lk-facing-mode={facingMode} />
        )}
        {(!videoTrack || !videoEnabled) && (
          <div className="lk-camera-off-note">
            <ParticipantPlaceholder />
          </div>
        )}
      </div>
      <div className="lk-button-group-container">
        <div className="lk-button-group audio">
          <TrackToggle
            initialState={audioEnabled}
            source={Track.Source.Microphone}
            onChange={(enabled) => setAudioEnabled(enabled)}
          >
            {micLabel}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              initialSelection={audioDeviceId}
              kind="audioinput"
              disabled={!audioTrack}
              tracks={{ audioinput: audioTrack }}
              onActiveDeviceChange={(_, id) => setAudioDeviceId(id)}
            />
          </div>
        </div>
        <div className="lk-button-group video">
          <TrackToggle
            initialState={videoEnabled}
            source={Track.Source.Camera}
            onChange={(enabled) => setVideoEnabled(enabled)}
          >
            {camLabel}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              initialSelection={videoDeviceId}
              kind="videoinput"
              disabled={!videoTrack}
              tracks={{ videoinput: videoTrack }}
              onActiveDeviceChange={(_, id) => setVideoDeviceId(id)}
            />
          </div>
        </div>
      </div>

      <form className="lk-username-container">
        <input
          className="lk-form-control"
          id="username"
          name="username"
          type="text"
          defaultValue={username}
          placeholder={userLabel}
          onChange={(inputEl) => setUsername(inputEl.target.value)}
          autoComplete="off"
        />
        <button
          className="lk-button lk-join-button"
          type="submit"
          onClick={handleSubmit}
          disabled={!isValid}
        >
          {joinLabel}
        </button>
        <button
          className="lk-button lk-copy-url-button"
          type="button"
          onClick={() => {
            navigator.clipboard.writeText((window.location.href).split("$")[0]);
          }}
        >
          Copy URL
        </button>
      </form>

      {debug && (
        <>
          <strong>User Choices:</strong>
          <ul className="lk-list" style={{ overflow: 'hidden', maxWidth: '15rem' }}>
            <li>Username: {`${userChoices.username}`}</li>
            <li>Video Enabled: {`${userChoices.videoEnabled}`}</li>
            <li>Audio Enabled: {`${userChoices.audioEnabled}`}</li>
            <li>Video Device: {`${userChoices.videoDeviceId}`}</li>
            <li>Audio Device: {`${userChoices.audioDeviceId}`}</li>
          </ul>
        </>
      )}
    </div>
  );
}
