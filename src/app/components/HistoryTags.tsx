"use client";
import styles from './HistoryTags.module.scss';
import { useChatStore } from '../store/chatStore';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import ChatContent from './ChatContent';

export default function HistoryTags() {
  const { chats, fetchChats, fetchMessages, setCurrentChatId } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

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

  return (
    <div className={styles.historySection}>
      <p>История запросов</p>
      <div className={styles.tags}>
        {chats.map((chat) => (
          <span 
            key={chat.id} 
            className={styles.tag}
            onClick={() => handleTagClick(chat.id)}
          >
            {chat.name}
          </span>
        ))}
        <span className={styles.all}>Все {chats.length}</span>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ChatContent />
      </Modal>
    </div>
  );
} 