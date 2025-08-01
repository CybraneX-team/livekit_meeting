import { RpcInvocationData, Track } from 'livekit-client';
import * as React from 'react';
import { MediaDeviceMenu } from './MediaDeviceMenu';
import { DisconnectButton } from '../components/controls/DisconnectButton';
import { TrackToggle } from '../components/controls/TrackToggle';
import { ChatIcon, GearIcon, LeaveIcon } from '../assets/icons';
import { ChatToggle } from '../components/controls/ChatToggle';
import { useLocalParticipantPermissions, usePersistentUserChoices } from '../hooks';
import { useMediaQuery } from '../hooks/internal';
import { useMaybeLayoutContext, useRoomContext } from '../context';
import { supportsScreenSharing } from '@livekit/components-core';
import { mergeProps } from '../utils';
import { StartMediaButton } from '../components/controls/StartMediaButton';
import { SettingsMenuToggle } from '../components/controls/SettingsMenuToggle';
import { IoMdPerson } from "react-icons/io";
import { ParticipantButton } from '../components/controls/ParticipantButton';
import { IoPeople } from "react-icons/io5";
import { MassControlButton } from '../components/controls/MassControlButton';
import { CiLink } from "react-icons/ci";
import { CiViewList } from "react-icons/ci";
import { AttendanceButton } from '../components/controls/AttendanceButton';
import { DeleteRoomButton } from '../components/controls/DeleteRoomButton';
import { GiSpikyExplosion } from "react-icons/gi";
import { RecordButton } from '../../components/RecordButton';
import { RaiseHandButton } from '../components/controls/RaiseHandButton';

/** @public */
export type ControlBarControls = {
  microphone?: boolean;
  camera?: boolean;
  chat?: boolean;
  screenShare?: boolean;
  leave?: boolean;
  settings?: boolean;
  participant?: boolean;
};

/** @public */
export interface ControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
  variation?: 'minimal' | 'verbose' | 'textOnly';
  controls?: ControlBarControls;
  /**
   * If `true`, the user's device choices will be persisted.
   * This will enable the user to have the same device choices when they rejoin the room.
   * @defaultValue true
   * @alpha
   */
  saveUserChoices?: boolean;
}

/**
 * The `ControlBar` prefab gives the user the basic user interface to control their
 * media devices (camera, microphone and screen share), open the `Chat` and leave the room.
 *
 * @remarks
 * This component is build with other LiveKit components like `TrackToggle`,
 * `DeviceSelectorButton`, `DisconnectButton` and `StartAudio`.
 *
 * @example
 * ```tsx
 * <LiveKitRoom>
 *   <ControlBar />
 * </LiveKitRoom>
 * ```
 * @public
 */
export function ControlBar({
  variation,
  controls,
  saveUserChoices = true,
  onDeviceError,
  ...props
}: ControlBarProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const layoutContext = useMaybeLayoutContext();
  React.useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext?.widget.state?.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);
  const isTooLittleSpace = useMediaQuery(`(max-width: ${isChatOpen ? 1000 : 760}px)`);

  const defaultVariation = isTooLittleSpace ? 'minimal' : 'verbose';
  variation ??= defaultVariation;
  const room = useRoomContext();

  
  const [visibleControls, setVisibleControls] = React.useState({ leave: true, participant: true,  ...controls });

  const localPermissions = useLocalParticipantPermissions();
   
  const [isHost, setIsHost] = React.useState(false);

  React.useEffect(() => {
    console.log("hello", localPermissions)
  }, [localPermissions])

  React.useEffect(() => {
    if (!localPermissions) {
      setVisibleControls({
        ...visibleControls,
        camera: false,
        microphone: false,
        screenShare: false
      })
    } else {
      if(isHost) {
        setVisibleControls({
          ...visibleControls,
          camera: localPermissions.canPublish,
          microphone: localPermissions.canPublish,
          screenShare: localPermissions.canPublish,
        })
      } else {
        // console.log(localPermissions)
        setVisibleControls({
          ...visibleControls,
          camera: localPermissions.canPublish,
          microphone: localPermissions.canPublish,
          screenShare: localPermissions.canPublish,
        })
      }
   }
  }, [localPermissions, isHost])

  // React.useEffect(() => {
  //   room.registerRpcMethod(
  //     'set-publishing',
  //     async (data: RpcInvocationData) => {
  //       const parse = JSON.parse(data.payload);

  //       setVisibleControls({
  //         ...visibleControls,
  //         ...parse
  //       });


  //       if("camera" in parse) {
  //         room.localParticipant.setCameraEnabled(false)
  //       } else if("microphone" in parse) {
  //         room.localParticipant.setMicrophoneEnabled(false)
  //       }

  //       return "200"
  //     }
  // );

  // return () => {
  //   room.unregisterRpcMethod("set-publishing")
  // }
  // }, [room])

  React.useEffect(() => {
    const handleHost = () => {
      try {
        const parsed = JSON.parse(room.localParticipant.metadata ?? '{}') as { role?: string };
        const role = parsed?.role;

        setIsHost(role === 'host' || role === 'co-host')
      } catch (error) {
        console.error('Invalid metadata JSON:', room.localParticipant.metadata, error);
      }
    }

    room.on("connected", handleHost)

    return () => {
      room.off("connected", handleHost)
    }
  }, [room])

  React.useEffect(() => {
    if (!room) return;

    const handleMetadataChange = () => {
      const metadata = room.localParticipant.metadata

      try {
        const parsed = JSON.parse(metadata ?? '{}') as { role?: string };
        const role = parsed?.role;

        setIsHost(role === 'host' || role === 'co-host')
      } catch (error) {
        console.error('Invalid metadata JSON:', metadata, error);
      }
    };

    // Local participant
    room.on('participantMetadataChanged', handleMetadataChange);

    // Cleanup to prevent memory leaks
    return () => {
      room.off('participantMetadataChanged', handleMetadataChange);
    };
  }, [room]);


  const showIcon = React.useMemo(
    () => variation === 'minimal' || variation === 'verbose',
    [variation],
  );
  const showText = React.useMemo(
    () => variation === 'textOnly' || variation === 'verbose',
    [variation],
  );

  const browserSupportsScreenSharing = supportsScreenSharing();

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);

  const onScreenShareChange = React.useCallback(
    (enabled: boolean) => {
      setIsScreenShareEnabled(enabled);
    },
    [setIsScreenShareEnabled],
  );

  const htmlProps = mergeProps({ className: 'lk-control-bar' }, props);

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const microphoneOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveAudioInputEnabled(enabled) : null,
    [saveAudioInputEnabled],
  );

  const cameraOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveVideoInputEnabled(enabled) : null,
    [saveVideoInputEnabled],
  );

  return (
    <div 
      style={{
        justifyContent: "start",
        overflowX: "scroll"
      }}

      {...htmlProps}
    >
      {visibleControls.microphone && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={showIcon}
            onChange={microphoneOnChange}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Microphone, error })}
          >
            {'Microphone'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="audioinput"
              onActiveDeviceChange={(_kind, deviceId) =>
                saveAudioInputDeviceId(deviceId ?? 'default')
              }
            />
          </div>
        </div>
      )}
      {visibleControls.camera && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={showIcon}
            onChange={cameraOnChange}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Camera, error })}
          >
            {'Camera'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="videoinput"
              onActiveDeviceChange={(_kind, deviceId) =>
                saveVideoInputDeviceId(deviceId ?? 'default')
              }
            />
          </div>
        </div>
      )}
      {visibleControls.screenShare && browserSupportsScreenSharing && (
        <TrackToggle
          source={Track.Source.ScreenShare}
          captureOptions={{ audio: true, selfBrowserSurface: 'include' }}
          showIcon={showIcon}
          onChange={onScreenShareChange}
          onDeviceError={(error) => onDeviceError?.({ source: Track.Source.ScreenShare, error })}
        >
          {(isScreenShareEnabled ? 'Stop screen share' : 'Share screen')}
        </TrackToggle>
      )}
      {visibleControls.chat && (
        <ChatToggle>
          {showIcon && <ChatIcon />}
          {'Chat'}
        </ChatToggle>
      )}
      {visibleControls.settings && (
        <SettingsMenuToggle>
          {showIcon && <GearIcon />}
          {'Settings'}
        </SettingsMenuToggle>
      )}
      {visibleControls.leave && (
        <DisconnectButton>
          {showIcon && <LeaveIcon />}
          {'Leave'}
        </DisconnectButton>
      )}
      {isHost && (
        <DeleteRoomButton>
          {showIcon && <GiSpikyExplosion />}
          {'Delete Room'}
        </DeleteRoomButton>
      )}
      {visibleControls.participant && (
        <ParticipantButton>
          {showIcon && <IoMdPerson />}
          {'Participant'}
        </ParticipantButton>
      )}
      <RaiseHandButton />
      {isHost && (
        <MassControlButton>
          {showIcon && <IoPeople />}
          {'Mass Control'}
        </MassControlButton>
      )}
      {isHost && (
        <RecordButton />
      )}
      {isHost && (
        <AttendanceButton>
          {showIcon && <CiViewList />}
          {'Attendance'}
        </AttendanceButton>
      )}
      {isHost && (
        <button
          type='button'
          className='lk-button'
          onClick={() => {
            navigator.clipboard.writeText((window.location.href).split("$")[0]);
          }}
        >
          <CiLink /> Meet Link
        </button>
      )}
      <StartMediaButton />
    </div>
  );
}
