"use client";
import { useState, useRef } from 'react';
import styles from './SearchBar.module.scss';
import Modal from './Modal';
import ChatContent from './ChatContent';
import { useChatStore } from '../store/chatStore';
import Image from 'next/image';

export default function SearchBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedURL, setRecordedURL] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const createChat = useChatStore((state) => state.createChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const chats = useChatStore((state) => state.chats);
  const currentChatId = useChatStore((state) => state.currentChatId);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      handleChatButtonClick();
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    try {
      setSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

      mediaRecorder.current.onstop = () => {
        const recordedBlob = new Blob(chunks.current, { type: 'audio/mp3' });
        const url = URL.createObjectURL(recordedBlob);
        setRecordedURL(url);
        chunks.current = [];
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.current.start();
    } catch (error) {
      console.error('Ошибка при записи:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorder.current && mediaStream.current) {
      mediaRecorder.current.stop();
      mediaStream.current.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleChatButtonClick = async () => {
    try {
      const randomName = `Чат ${Math.floor(Math.random() * 1000)}`;
      const newChat = await createChat(randomName);
      setCurrentChatId(newChat.id);
      // Добавляем приветственное сообщение сразу при создании чата
      const welcomeMessage = {
        id: 'welcome',
        chat_id: newChat.id,
        content: "Привет! Я твой помощник. Задай любой вопрос и я найду оптимальное решение",
        role: 'Assistant' as const,
        is_user: false,
        timestamp: new Date().toISOString(),
        likes: false,
        dislikes: false,
        sources: [],
        chat_new_name: undefined
      };
      const updateChats = useChatStore.getState().chats.map((chat) =>
        chat.id === newChat.id
          ? { ...chat, messages: [welcomeMessage] }
          : chat
      );
      useChatStore.setState({ chats: updateChats });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleCloseModal = () => {
    if (currentChatId) {
      const currentChat = chats.find(chat => chat.id === currentChatId);
      // Проверяем, что в чате нет сообщений или только приветственное сообщение
      if (currentChat && (!currentChat.messages ||
        currentChat.messages.length === 0 ||
        (currentChat.messages.length === 1 && currentChat.messages[0].id === 'welcome'))) {
        deleteChat(currentChatId);
      }
      setCurrentChatId(null);
    }
    setIsModalOpen(false);
  };

  const handleSendButtonClick = async () => {
    if (searchText.trim()) {
      try {
        const randomName = `Чат ${Math.floor(Math.random() * 1000)}`;
        const newChat = await createChat(randomName);
        setCurrentChatId(newChat.id);
        
        // Добавляем приветственное сообщение сразу при создании чата
        const welcomeMessage = {
          id: 'welcome',
          chat_id: newChat.id,
          content: "Привет! Я твой помощник. Задай любой вопрос и я найду оптимальное решение",
          role: 'Assistant' as const,
          is_user: false,
          timestamp: new Date().toISOString(),
          likes: false,
          dislikes: false,
          sources: [],
          chat_new_name: undefined
        };
        
        const updateChats = useChatStore.getState().chats.map((chat) =>
          chat.id === newChat.id
            ? { ...chat, messages: [welcomeMessage] }
            : chat
        );
        useChatStore.setState({ chats: updateChats });
        
        // Открываем модальное окно
        setIsModalOpen(true);
        
        // Отправляем сообщение на сервер (функция sendMessage сама добавит сообщение пользователя)
        const response = await useChatStore.getState().sendMessage(newChat.id, searchText);
        
        // Переименовываем чат, если сервер вернул новое имя
        if (response && response.chat_new_name) {
          await useChatStore.getState().renameChat(newChat.id, response.chat_new_name);
        }
        
        // Очищаем поле ввода
        setSearchText('');
      } catch (error) {
        console.error('Failed to create chat or send message:', error);
      }
    }
  };

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Введите тему или ключевое слово..."
          className={styles.searchInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button className={styles.chatButton} onClick={handleChatButtonClick}>
          Чат с ассистентом
        </button>
        <button
          className={`${styles.voiceButton}`}
          onClick={handleSendButtonClick}
        >
          <img
            src={"/send.svg"}
            alt={"Отправить"}
            width={14}
            height={20}
          />
        </button> 
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ChatContent />
      </Modal>
    </div>
  );
} 