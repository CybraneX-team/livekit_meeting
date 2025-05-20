'use client';
import * as React from 'react';
import { Track } from 'livekit-client';
import {
  useMaybeLayoutContext,
  MediaDeviceMenu,
  TrackToggle,
  useRoomContext,
  useIsRecording,
} from '../custom_livekit_react'
import styles from '../styles/SettingsMenu.module.css';
import { CameraSettings } from './CameraSettings';
// import { MicrophoneSettings } from './MicrophoneSettings';
/**
 * @alpha
 */
export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * @alpha
 */
export function SettingsMenu(props: SettingsMenuProps) {
  const layoutContext = useMaybeLayoutContext();
  const room = useRoomContext();
  const recordingEndpoint = process.env.NEXT_PUBLIC_LK_RECORD_ENDPOINT;
  const [isHost, setIsHost] = React.useState(false);

  React.useEffect(() => {
    // Check if the current user is the host
    const checkHostStatus = () => {
      const localParticipant = room.localParticipant;
      const metadata = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
      setIsHost(metadata.role === 'host');
    };

    checkHostStatus();
  }, [room]);

  const settings = React.useMemo(() => {
    return {
      media: { camera: true, microphone: true, label: 'Media Devices', speaker: true },
      recording: recordingEndpoint && isHost ? { label: 'Recording' } : undefined,
    };
  }, [recordingEndpoint, isHost]);

  const tabs = React.useMemo(
    () => Object.keys(settings).filter((t) => t !== undefined) as Array<keyof typeof settings>,
    [settings],
  );
  const [activeTab, setActiveTab] = React.useState(tabs[0]);

  const isRecording = useIsRecording();
  const [initialRecStatus, setInitialRecStatus] = React.useState(isRecording);
  const [processingRecRequest, setProcessingRecRequest] = React.useState(false);

  React.useEffect(() => {
    if (initialRecStatus !== isRecording) {
      setProcessingRecRequest(false);
    }
  }, [isRecording, initialRecStatus]);

  const toggleRoomRecording = async () => {
    if (!recordingEndpoint) {
      throw TypeError('No recording endpoint specified');
    }
    if (room.isE2EEEnabled) {
      throw Error('Recording of encrypted meetings is currently not supported');
    }
    setProcessingRecRequest(true);
    setInitialRecStatus(isRecording);
    let response: Response;
    if (isRecording) {
      response = await fetch(recordingEndpoint + `/stop?roomName=${room.name}`);
    } else {
      response = await fetch(recordingEndpoint + `/start?roomName=${room.name}`);
    }
    if (response.ok) {
    } else {
      console.error(
        'Error handling recording request, check server logs:',
        response.status,
        response.statusText,
      );
      setProcessingRecRequest(false);
    }
  };

  return (
    <div className="settings-menu" style={{
      width: '100%',
      maxWidth: '400px',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--lk-bg2)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      maxHeight: '90vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      zIndex: 1000
    }} {...props}>
      <div className={styles.tabs} style={{ marginBottom: '20px' }}>
        {tabs.map(
          (tab) =>
            settings[tab] && (
              <button
                className={`${styles.tab} lk-button`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={tab === activeTab}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px'
                }}
              >
                {
                  // @ts-ignore
                  settings[tab].label
                }
              </button>
            ),
        )}
      </div>
      <div className="tab-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {settings.media && settings.media.camera && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Camera</h3>
                <section>
                  <CameraSettings />
                </section>
              </div>
            )}
            {settings.media && settings.media.microphone && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Microphone</h3>
                <section>
                  {/* <MicrophoneSettings /> */}
                </section>
              </div>
            )}
            {settings.media && settings.media.speaker && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Speaker & Headphones</h3>
                <section className="lk-button-group">
                  <span className="lk-button">Audio Output</span>
                  <div className="lk-button-group-menu">
                    <MediaDeviceMenu kind="audiooutput"></MediaDeviceMenu>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
        {activeTab === 'recording' && (
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Record Meeting</h3>
            <section>
              <p style={{ margin: '0 0 16px 0', color: 'var(--lk-text-secondary)' }}>
                {isRecording
                  ? 'Meeting is currently being recorded'
                  : 'No active recordings for this meeting'}
              </p>
              <button 
                disabled={processingRecRequest} 
                onClick={() => toggleRoomRecording()}
                className="lk-button"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: isRecording ? 'var(--lk-danger)' : 'var(--lk-bg3)',
                  transition: 'background-color 0.2s'
                }}
              >
                {isRecording ? 'Stop' : 'Start'} Recording
              </button>
            </section>
          </div>
        )}
      </div>
      <button
        className={`lk-button ${styles.settingsCloseButton}`}
        onClick={() => layoutContext?.widget.dispatch?.({ msg: 'toggle_settings' })}
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '10px',
          background: 'var(--lk-bg3)',
          borderRadius: '4px'
        }}
      >
        Close
      </button>
    </div>
  );
}
