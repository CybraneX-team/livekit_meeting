'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import styles from '../styles/Home.module.css';

export default function Page() {
  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <h2>
          Thank you for attending the meeting!
        </h2>
      </div>
    </main>
  );
}