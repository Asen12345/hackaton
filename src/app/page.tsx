"use client";
import Navigation from './components/Navigation';
import SearchBar from './components/SearchBar';
import HistoryTags from './components/HistoryTags';
import styles from './page.module.scss';
import { useEffect } from 'react';
import { useChatStore } from './store/chatStore';
import Image from 'next/image';

export default function Home() {
  const { fetchChats, _hasHydrated } = useChatStore();

  useEffect(() => {
    if (_hasHydrated) {
      fetchChats();
    }
  }, [_hasHydrated, fetchChats]);

  if (!_hasHydrated) {
    return null; // или лоадер
  }

  return (
    <main className={styles.main}>
      <nav className={styles.navigation}>
        <div className={styles.navLinks}>
          <Image src="/maskot.png" alt='Робот' width={214} height={200} />
          <div className={styles.navContainer}>
            <Navigation />
            <SearchBar />
            <HistoryTags />
          </div>
        </div>
      </nav>
    </main>
  );
}
