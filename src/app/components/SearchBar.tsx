"use client";
import { useState } from 'react';
import styles from './SearchBar.module.scss';
import Modal from './Modal';
import ChatContent from './ChatContent';

export default function SearchBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Введите тему или ключевое слово..."
          className={styles.searchInput}
        />
        <button className={styles.chatButton} onClick={() => setIsModalOpen(true)}>
          Чат с ассистентом
        </button>
        <button className={styles.voiceButton}>
          <img src="/mic-icon.svg" alt="Voice Input" width={14} height={20} />
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ChatContent />
      </Modal>
    </div>
  );
} 