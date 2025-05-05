// import { MicButton, CameraButton, ScreenShareButton } from '@livekit/components-react';
// import { RecordingControls } from './RecordingControls';
import { ParticipantList } from './ParticipantList';

export function BottomBar() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        background: '#333',
        padding: '10px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      {/* <MicButton />
      <CameraButton />
      <ScreenShareButton /> */}
      {/* <RecordingControls /> */}
      <ParticipantList />
    </div>
  );
}