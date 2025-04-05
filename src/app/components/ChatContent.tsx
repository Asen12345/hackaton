import styles from './ChatContent.module.scss';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useChatStore } from '../store/chatStore';

export default function ChatContent() {
  const [inputValue, setInputValue] = useState('');
  const { chats, loading, error, sendMessage, likeMessage, dislikeMessage } = useChatStore();
  const currentChatId = useChatStore((state) => state.currentChatId);
  const currentChat = chats.find(chat => chat.id === currentChatId);

  useEffect(() => {
    if (currentChat && (!currentChat.messages || currentChat.messages.length === 0)) {
      const welcomeMessage = {
        id: 'welcome',
        chat_id: currentChat.id,
        content: "Привет! Я твой помощник. Задай любой вопрос и я найду оптимальное решение",
        is_user: false,
        timestamp: new Date().toISOString(),
        likes: false,
        dislikes: false,
        sources: [],
        chat_new_name: null
      };
      
      if (!currentChat.messages) {
        currentChat.messages = [welcomeMessage];
      } else {
        currentChat.messages.push(welcomeMessage);
      }
    }
  }, [currentChat]);

  const handleSendMessage = async () => {
    if (inputValue.trim() && currentChat) {
      await sendMessage(currentChat.id, inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className={styles.chatModal}>
      <div className={styles.chatContent}>
        <div className={styles.messagesContainer}>
          {currentChat?.messages?.map((message) => (
            <div key={message.id}>
              <div
                className={`${styles.message} ${message.is_user ? styles.userMessage : styles.assistantMessage}`}
              >
                {message.content}
              </div>
              {!message.is_user && message.id !== 'welcome' && (
                <div className={styles.feedbackContainer}>
                  <button 
                    className={styles.feedbackButton}
                    onClick={() => likeMessage(message.id)}
                  >
                    <Image src="/like.svg" alt="Понравилось" width={20} height={20} />
                  </button>
                  <button 
                    className={styles.feedbackButton}
                    onClick={() => dislikeMessage(message.id)}
                  >
                    <Image src="/dislike.svg" alt="Не понравилось" width={20} height={20} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className={styles.input}
          />
          <button onClick={handleSendMessage} className={styles.sendButton}>
            <Image src="/mic-icon.svg" alt="Voice Input" width={14} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
} 