"use client";
import { useState } from 'react';
import styles from './SearchBar.module.scss';
import Modal from './Modal';
import ChatContent from './ChatContent';
import { useChatStore } from '../store/chatStore';

export default function SearchBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const createChat = useChatStore((state) => state.createChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const chats = useChatStore((state) => state.chats);

  const handleChatButtonClick = async () => {
    try {
      const randomName = `Чат ${Math.floor(Math.random() * 1000)}`;
      const newChat = await createChat(randomName);
      setCurrentChatId(newChat.id);
      // Очищаем сообщения для нового чата
      const updateChats = useChatStore.getState().chats.map((chat) => 
        chat.id === newChat.id 
          ? { ...chat, messages: [] }
          : chat
      );
      useChatStore.setState({ chats: updateChats });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleCloseModal = () => {
    const currentChatId = useChatStore.getState().currentChatId;
    if (currentChatId) {
      const currentChat = chats.find(chat => chat.id === currentChatId);
      if (currentChat && (!currentChat.messages || currentChat.messages.length === 0)) {
        deleteChat(currentChatId);
      }
      setCurrentChatId(null);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Введите тему или ключевое слово..."
          className={styles.searchInput}
        />
        <button className={styles.chatButton} onClick={handleChatButtonClick}>
          Чат с ассистентом
        </button>
        <button className={styles.voiceButton}>
          <img src="/mic-icon.svg" alt="Voice Input" width={14} height={20} />
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ChatContent />
      </Modal>
    </div>
  );
} 