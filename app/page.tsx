'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';

export default function Page() {
  const [lastRoomRoute, setLastRoomRoute] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastRoute = sessionStorage.getItem('lastRoute');
      // Check if lastRoute matches /rooms/xxx
      if (lastRoute && /^\/rooms\/.+/.test(lastRoute)) {
        setLastRoomRoute(lastRoute);
      }
    }
  }, []);

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <h2>
          Thank you for attending the meeting!
        </h2>
        {lastRoomRoute && (
          <button
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => router.push(lastRoomRoute)}
          >
            Return to Room
          </button>
        )}
      </div>
    </main>
  );
}