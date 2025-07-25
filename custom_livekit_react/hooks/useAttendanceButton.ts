import { useRoomContext } from '../context/room-context';
import { mergeProps } from '../mergeProps';
import * as React from 'react';
import * as XLSX from 'xlsx';

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatIST(date: Date) {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

export function useAttendanceButton() {
  const room = useRoomContext();

  const handleDownload = React.useCallback(() => {
    let metadata = room?.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = JSON.parse('{}');
      }
    }

    console.log(metadata?.attendance);

    // @ts-ignore
    const attendance = metadata?.attendance;
    if (!attendance || !attendance.participants || !attendance.timeStamp) {
      alert('No attendance data available.');
      return;
    }

    // Group all events by participant name (without suffix)
    const eventsByName: Record<string, Date[]> = {};
    attendance.participants.forEach((participant: string, idx: number) => {
      const name = participant.split('__')[0];
      const ts = new Date(attendance.timeStamp[idx] || '');
      if (!eventsByName[name]) eventsByName[name] = [];
      eventsByName[name].push(ts);
    });

    const now = new Date();
    const data = (Object.entries(eventsByName) as [string, Date[]][]).map(([name, timestamps]) => {
      // Sort timestamps just in case
      timestamps.sort((a, b) => a.getTime() - b.getTime());
      let totalDuration = 0;
      let firstJoin = timestamps[0];
      let lastLeave = timestamps[timestamps.length - 1];
      for (let i = 0; i < timestamps.length; i += 2) {
        const join = timestamps[i];
        const leave = timestamps[i + 1] || now; // If no leave, use now
        totalDuration += leave.getTime() - join.getTime();
      }
      // Format times
      const formattedFirstJoin = firstJoin ? formatIST(firstJoin) : '';
      const formattedTimestamps = timestamps.map(formatIST).join('; ');
      return {
        Participant: name,
        'First Join': formattedFirstJoin,
        Duration: formatDuration(totalDuration),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, 'attendance.xlsx');
  }, [room]);

  const buttonProps = React.useMemo(() => ({
    className: 'lk-button',
    onClick: handleDownload,
  }), [handleDownload]);

  return { buttonProps };
} 