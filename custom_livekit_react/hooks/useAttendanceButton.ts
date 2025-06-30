import { useRoomContext } from '../context/room-context';
import { mergeProps } from '../mergeProps';
import * as React from 'react';
import * as XLSX from 'xlsx';

export function useAttendanceButton() {
  const room = useRoomContext();

  const handleDownload = React.useCallback(() => {
    let metadata = room?.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = JSON.parse("{}");
      }
    }

    // @ts-ignore
    const attendance = metadata?.attendance;
    if (!attendance || !attendance.participants || !attendance.timeStamp) {
      alert('No attendance data available.');
      return;
    }
    const data = attendance.participants.map((participant: string, idx: number) => {
      // Remove random suffix after '__'
      const name = participant.split('__')[0];
      // Format timestamp to IST (DD-MM-YYYY HH:mm:ss)
      const utcDate = new Date(attendance.timeStamp[idx] || '');
      const formattedTimestamp = utcDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace(',', '');
      return {
        Participant: name,
        Timestamp: formattedTimestamp,
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