import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

interface RecordingInfo {
  url: string;
  key: string;
  userId: string;
  roomName: string;
  timestamp: string;
  recordingId: string;
  recordingName?: string;
  quality?: string;
  size?: number;
  duration?: number;
  format: string;
  createdAt: string;
  lastModified: string;
}

function parseFileName(key: string): Partial<RecordingInfo> | null {
  // Parse filename: {userId}_{roomName}_{timestamp}_{recordingId}[_{quality}][__recordingName].webm
  const match = key.match(/^(.+?)_(.+?)_(\d+)_(.+?)(?:_(low|medium|high))?(?:__(.+?))?\.webm$/);
  if (!match) return null;
  
  const [, userId, roomName, timestamp, recordingId, quality, recordingName] = match;
  return { 
    userId, 
    roomName, 
    timestamp, 
    recordingId, 
    quality: quality || 'medium',
    recordingName: recordingName || undefined 
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const roomName = url.searchParams.get('roomName');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sortBy') || 'timestamp';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    console.log('List: Fetching recordings with filters:', { 
      userId, 
      roomName, 
      limit, 
      offset, 
      sortBy, 
      sortOrder 
    });

    // List all objects in the bucket
    const listResponse = await s3.send(new ListObjectsV2Command({ 
      Bucket: BUCKET,
      MaxKeys: 1000 // Get more objects to filter from
    }));

    if (!listResponse.Contents) {
      return NextResponse.json({ recordings: [] });
    }

    // Filter and process recordings
    let recordings: RecordingInfo[] = [];

    for (const obj of listResponse.Contents) {
      if (!obj.Key || !obj.Key.endsWith('.webm')) continue;

      const parsedInfo = parseFileName(obj.Key);
      if (!parsedInfo) continue;

      // Apply filters
      if (userId && parsedInfo.userId !== userId) continue;
      if (roomName && parsedInfo.roomName !== roomName) continue;

      try {
        // Get object metadata for size and last modified
        const headResponse = await s3.send(new HeadObjectCommand({
          Bucket: BUCKET,
          Key: obj.Key
        }));

        const recording: RecordingInfo = {
        url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key}`,
        key: obj.Key,
          size: headResponse.ContentLength || 0,
          format: 'webm',
          createdAt: headResponse.LastModified?.toISOString() || new Date().toISOString(),
          lastModified: headResponse.LastModified?.toISOString() || new Date().toISOString(),
          // Estimate duration based on file size (rough estimate)
          duration: headResponse.ContentLength ? 
            Math.round((headResponse.ContentLength / (500 * 1024)) * 30) : // 500kbps * 30s chunks
            undefined,
          userId: parsedInfo.userId!,
          roomName: parsedInfo.roomName!,
          timestamp: parsedInfo.timestamp!,
          recordingId: parsedInfo.recordingId!,
          quality: parsedInfo.quality,
          recordingName: parsedInfo.recordingName
        };

        recordings.push(recording);

      } catch (error) {
        console.warn('List: Error getting metadata for', obj.Key, error);
        // Add recording without metadata
        recordings.push({
          url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key}`,
          key: obj.Key,
          format: 'webm',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          userId: parsedInfo.userId!,
          roomName: parsedInfo.roomName!,
          timestamp: parsedInfo.timestamp!,
          recordingId: parsedInfo.recordingId!,
          quality: parsedInfo.quality,
          recordingName: parsedInfo.recordingName
        });
      }
    }

    // Sort recordings
    recordings.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = parseInt(a.timestamp);
          bValue = parseInt(b.timestamp);
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'name':
          aValue = a.recordingName || a.roomName;
          bValue = b.recordingName || b.roomName;
          break;
        default:
          aValue = parseInt(a.timestamp);
          bValue = parseInt(b.timestamp);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const paginatedRecordings = recordings.slice(offset, offset + limit);

    // Add summary information
    const totalSize = recordings.reduce((sum, rec) => sum + (rec.size || 0), 0);
    const totalDuration = recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0);

    console.log('List: Returning recordings:', {
      total: recordings.length,
      returned: paginatedRecordings.length,
      totalSize: formatFileSize(totalSize),
      totalDuration: formatDuration(totalDuration)
    });

    return NextResponse.json({ 
      recordings: paginatedRecordings,
      pagination: {
        total: recordings.length,
        limit,
        offset,
        hasMore: offset + limit < recordings.length
      },
      summary: {
        totalSize: formatFileSize(totalSize),
        totalDuration: formatDuration(totalDuration),
        averageSize: recordings.length > 0 ? formatFileSize(totalSize / recordings.length) : '0 Bytes',
        averageDuration: recordings.length > 0 ? formatDuration(totalDuration / recordings.length) : '0:00'
      }
    });

  } catch (error: any) {
    console.error('List: Error fetching recordings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch recordings',
      details: error.message,
      code: error.$metadata?.httpStatusCode || 500
    }, { status: 500 });
  }
} 