import styles from './ChatContent.module.scss';
import { useState } from 'react';
import Image from 'next/image';
import { useChatStore } from '../store/chatStore';

export default function ChatContent() {
  const [inputValue, setInputValue] = useState('');
  const { chats, loading, error, sendMessage, likeMessage, dislikeMessage } = useChatStore();
  const currentChatId = useChatStore((state) => state.currentChatId);
  const currentChat = chats.find(chat => chat.id === currentChatId);

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

  // Находим последнее сообщение ассистента
  const lastAssistantMessage = currentChat?.messages
    ?.slice()
    .reverse()
    .find(message => !message.is_user && message.id !== 'welcome');

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
        {lastAssistantMessage?.sources && lastAssistantMessage.sources.length > 0 && (
          <div className={styles.sourcesContainer}>
            {lastAssistantMessage.sources.map((source) => (
              <div key={source.id} className={styles.sourceItem}>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.sourceTitle}
                >
                  {source.title}
                </a>
                <div className={styles.sourceInfo}>
                  <Image 
                    src="/exclamation-circle.svg" 
                    alt="Информация" 
                    width={16} 
                    height={16} 
                  />
                  <div className={styles.sourceTooltip}>
                    {source.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <Image 
              src={inputValue ? "/send.svg" : "/mic-icon.svg"} 
              alt={inputValue ? "Отправить" : "Голосовой ввод"} 
              width={14} 
              height={20} 
            />
          </button>
        </div>
      </div>
    </div>
  );
} 