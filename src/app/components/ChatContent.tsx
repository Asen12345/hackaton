import styles from './ChatContent.module.scss';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ChatContent() {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setMessages([{
      text: "Привет! Я твой помощник. Задай любой вопрос и я найду оптимальное решение",
      isUser: false
    }]);
  }, []);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { text: inputValue, isUser: true }]);
      setInputValue('');
    }
  };

  return (
    <div className={styles.chatModal}>
      <div className={styles.chatContent}>
        <div className={styles.messagesContainer}>
          {messages.map((message, index) => (
            <div key={index}>
              <div
                className={`${styles.message} ${message.isUser ? styles.userMessage : styles.assistantMessage}`}
              >
                {message.text}
              </div>
              {!message.isUser && index > 0 && (
                <div className={styles.feedbackContainer}>
                  <button className={styles.feedbackButton}>
                    <Image src="/like.svg" alt="Понравилось" width={20} height={20} />
                  </button>
                  <button className={styles.feedbackButton}>
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