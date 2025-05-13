'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();

  // Redirect to dashboard page
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <img src="/images/livekit-meet-home.svg" alt="LiveKit Meet" width="360" height="45" />
        <h2>
          Redirecting to dashboard...
        </h2> 
      </div>
    </main>
  );
}