'use client';

import { decodePassphrase } from '@/lib/client-utils';
import { RecordingIndicator } from '@/components/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import { ParticipantList } from '@/components/participant list/ParticipantList';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '../../../custom_livekit_react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import Notification from '@/components/Notification';
import { MassControl } from '@/components/MassControl';

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export function PageClientImpl(props: {
  roomName: string;
  where: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: '',
      videoEnabled: true,
      audioEnabled: true,
    };
  }, []);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(undefined);

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    setPreJoinChoices(values);

    const accessTokenURL = new URL("/api/auth/accessToken", window.location.origin);
    accessTokenURL.searchParams.append('participantName', values.username);
    const accessTokenResp = await fetch(accessTokenURL.toString());
    if (accessTokenResp.status !== 200) {
      // Optionally handle error here
      return;
    }

    const roomExistsURL = new URL("/api/auth/roomExists", window.location.origin);
    roomExistsURL.searchParams.append('roomName', (props.roomName).split('$')[0]);
    const roomExistsResp = await fetch(roomExistsURL.toString());
    if (roomExistsResp.status !== 200) {
      // Optionally handle error here
      return;
    }

    const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
    url.searchParams.append('roomName', (props.roomName).split('$')[0]);
    url.searchParams.append('participantName', values.username);
    url.searchParams.append('where', props.where);
    if (props.region) {
      url.searchParams.append('region', props.region);
    }
    const connectionDetailsResp = await fetch(url.toString());
    if (connectionDetailsResp.status !== 200) {
      // Optionally handle error here
      return;
    }
    const connectionDetailsData = await connectionDetailsResp.json();
    setConnectionDetails(connectionDetailsData);
  }, []);

  const handlePreJoinError = React.useCallback((e: any) => console.error(e), []);

  React.useEffect(() => {
    // Store the current room route in sessionStorage as 'lastRoute'
    if (typeof window !== 'undefined') {
      const pathname = `/rooms/${props.roomName}`;
      sessionStorage.setItem('lastRoute', pathname);
    }
  }, [props.roomName]);

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      {(!connectionDetails || preJoinChoices === undefined) ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
          />
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(location.hash.substring(1));

  const worker =
    typeof window !== 'undefined' &&
    e2eePassphrase &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
  const e2eeEnabled = !!(e2eePassphrase && worker);
  const keyProvider = new ExternalE2EEKeyProvider();
  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    return {
      videoCaptureDefaults: {
        deviceId: props.userChoices.videoDeviceId ?? undefined,
        resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers: props.options.hq
          ? [VideoPresets.h1080, VideoPresets.h720]
          : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec,
      },
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const markAttendance = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const CONN_DETAILS_ENDPOINT = '/api/participant-control';

    const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);

    const payload = {
      roomName: room.name,
      participantIdentity: room.localParticipant.identity,
      action: 'mark-attendance',
      metadata: room.metadata
    };

    await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }


  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);
    room.on(RoomEvent.Connected, markAttendance);
    room.on(RoomEvent.Disconnected, markAttendance)
    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .catch((error) => {
          handleError(error);
        });
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
      room.off(RoomEvent.Connected, markAttendance);
      room.off(RoomEvent.Disconnected, markAttendance)
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Encountered an unexpected error, check the console logs for details: ${error.message}`);
  }, []);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected encryption error, check the console logs for details: ${error.message}`,
    );
  }, []);

  const [notify, setNotify] = useState<boolean>(false);
  const [notifyText, setNotifyText] = useState<string>('');
  const [handVisible, setHandVisible] = useState(false)
  const [participantIdentityHand, setParticipantIdentityHand] = useState("")
  const [raisedHandIdentities, setRaisedHandIdentities] = useState<string[]>([]);

  React.useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        // console.log('Received control message:', data);
        
        if (data.type === 'notify') {
          if (data.action === 'raise') {
            // setNotify(true)
            // setNotifyText(`${data.name} rasied hand!`)
            setHandVisible(true)
            setParticipantIdentityHand(data.identity)
            setRaisedHandIdentities(prev => prev.includes(data.identity) ? prev : [...prev, data.identity]);
          } else if(data.action === 'lower') {
            // setNotify(false)
            setHandVisible(false)
            setParticipantIdentityHand("")
            setRaisedHandIdentities(prev => prev.filter(id => id !== data.identity));
          } else if(data.action === "can-publish") {
            setNotify(true)
            setNotifyText("You can enable camera, microphone and share screen")
          }
        }
      } catch (error) {
        console.error('Error handling data message:', error);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room.state]);

  return (
    <div className="lk-room-container" style={{ position: 'relative', height: '100vh' }}>
      <RoomContext.Provider value={room}>
          <VideoConference
            chatMessageFormatter={formatChatMessageLinks}
            SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
            raisedHandIdentities={raisedHandIdentities}
          />
        <MassControl/>
        <ParticipantList handVisible={handVisible} participantIdentityHand={participantIdentityHand} />
        <Notification visible={notify} setVisible={setNotify} text={notifyText}/>
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}
