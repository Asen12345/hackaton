"use client";
import styles from './HistoryTags.module.scss';
import { useChatStore } from '../store/chatStore';
import { useState } from 'react';
import Modal from './Modal';
import ChatContent from './ChatContent';

export default function HistoryTags() {
  const { chats, fetchMessages, setCurrentChatId } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleTagClick = async (chatId: string) => {
    setSelectedChatId(chatId);
    setCurrentChatId(chatId);
    await fetchMessages(chatId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChatId(null);
  };

  const displayedChats = showAll ? chats : chats.slice(0, 4);

  return (
    <div className={styles.historySection}>
      <p>История запросов</p>
      <div className={styles.tags}>
        {displayedChats.map((chat) => (
          <span 
            key={chat.id} 
            className={styles.tag}
            onClick={() => handleTagClick(chat.id)}
          >
            {chat.name}
          </span>
        ))}
        {chats.length > 4 && (
          <span 
            className={styles.all} 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Скрыть' : `Все ${chats.length}`}
          </span>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ChatContent />
      </Modal>
    </div>
  );
} 