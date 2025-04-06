import styles from './ChatContent.module.scss';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useChatStore } from '../store/chatStore';
import { Scrollbar } from 'react-scrollbars-custom';
import { VoiceRecorder } from '../utils/voiceRecorder';

interface FeedbackFormData {
  fullName: string;
  phone: string;
  email: string;
}

export default function ChatContent() {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackFormData, setFeedbackFormData] = useState<FeedbackFormData>({
    fullName: '',
    phone: '',
    email: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);

  const { chats, loading, error, sendMessage, likeMessage, dislikeMessage, renameChat, streamingContent } = useChatStore();
  const currentChatId = useChatStore((state) => state.currentChatId);
  const currentChat = chats.find(chat => chat.id === currentChatId);
  
  // Проверяем, есть ли сообщение с support=true
  const hasSupportMessage = currentChat?.messages?.some(message => message.support === true);

  useEffect(() => {
    voiceRecorderRef.current = new VoiceRecorder(
      (newSeconds) => setSeconds(newSeconds),
      (blob) => setRecordedBlob(blob)
    );

    return () => {
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.cleanup();
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "Верни форму обратной связи") {
      setShowFeedbackForm(true);
      setInputValue('');
      return;
    }

    if ((inputValue.trim() || selectedImage || recordedBlob) && currentChat) {
      const response = await sendMessage(
        currentChat.id, 
        inputValue, 
        selectedImage || undefined, 
        recordedBlob || undefined
      );
      setInputValue('');
      setSelectedImage(null);
      setRecordedBlob(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (response && response.chat_new_name) {
        await renameChat(currentChat.id, response.chat_new_name);
      }
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь можно добавить логику отправки формы
    console.log('Отправка формы:', feedbackFormData);
    setShowFeedbackForm(false);
    setFeedbackFormData({ fullName: '', phone: '', email: '' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    if (voiceRecorderRef.current) {
      const success = await voiceRecorderRef.current.startRecording();
      if (success) {
        setIsRecording(true);
        setSeconds(0);
      }
    }
  };

  const stopRecording = async () => {
    if (voiceRecorderRef.current) {
      setIsRecording(false);
      const blob = await voiceRecorderRef.current.stopRecording();
      setRecordedBlob(blob);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Находим последнее сообщение ассистента
  const lastAssistantMessage = currentChat?.messages
    ?.slice()
    .reverse()
    .find(message => message.role !== 'User' && message.id !== 'welcome');

  return (
    <div className={styles.chatModal}>
      <Image src="/maskot.png" alt='Робот' width={160} height={150} />
      <div className={styles.chatContent}>
        <Scrollbar style={{ height: '100%' }}>
          <div className={styles.messagesContainer}>
            {currentChat?.messages?.map((message) => (
              <div key={message.id}>
                <div
                  className={`${styles.message} ${message.role === 'User' ? styles.userMessage : styles.assistantMessage}`}
                >
                  {message.content}
                  {message.image_url && (
                    <div className={styles.messageImage}>
                      <Image
                        src={message.image_url}
                        alt="Прикрепленное изображение"
                        width={200}
                        height={200}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
                {message.role === 'Assistant' && message.id !== 'welcome' && (
                  <div className={styles.feedbackContainer}>
                    <button
                      className={`${styles.feedbackButton} ${message.likes ? styles.active : ''}`}
                      onClick={() => likeMessage(message.id)}
                    >
                      <Image src="/like.svg" alt="Понравилось" width={20} height={20} />
                    </button>
                    <button
                      className={`${styles.feedbackButton} ${message.dislikes ? styles.active : ''}`}
                      onClick={() => dislikeMessage(message.id)}
                    >
                      <Image src="/dislike.svg" alt="Не понравилось" width={20} height={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {streamingContent && (
              <div className={`${styles.message} ${styles.assistantMessage} ${styles.streaming}`}>
                {streamingContent}
                <span className={styles.cursor}>▋</span>
              </div>
            )}
            {hasSupportMessage && (
              <div className={styles.supportMessage}>
                Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время
              </div>
            )}
            {showFeedbackForm && (
              <div className={styles.feedbackForm}>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      placeholder="ФИО"
                      value={feedbackFormData.fullName}
                      onChange={(e) => setFeedbackFormData({...feedbackFormData, fullName: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="tel"
                      placeholder="Номер телефона"
                      value={feedbackFormData.phone}
                      onChange={(e) => setFeedbackFormData({...feedbackFormData, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={feedbackFormData.email}
                      onChange={(e) => setFeedbackFormData({...feedbackFormData, email: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className={styles.submitButton}>
                    Отправить
                  </button>
                </form>
              </div>
            )}
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
        </Scrollbar>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className={styles.input}
            disabled={hasSupportMessage}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            disabled={hasSupportMessage}
          />
          <button
            className={`${styles.imageButton} ${selectedImage ? styles.active : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={hasSupportMessage}
          >
            <Image
              src="/image.svg"
              alt="Прикрепить изображение"
              width={20}
              height={20}
            />
          </button>
          <button
            onClick={inputValue || selectedImage || recordedBlob ? handleSendMessage : (isRecording ? stopRecording : startRecording)}
            className={`${styles.sendButton} ${isRecording ? styles.recording : ''}`}
            disabled={hasSupportMessage}
          >
            {isRecording ? (
              <div className={styles.recordingIndicator}>
                <span className={styles.recordingDot}></span>
                <span className={styles.recordingTime}>{formatTime(seconds)}</span>
              </div>
            ) : (
              <Image
                src={inputValue || selectedImage || recordedBlob ? "/send.svg" : "/mic-icon.svg"}
                alt={inputValue || selectedImage || recordedBlob ? "Отправить" : "Голосовой ввод"}
                width={14}
                height={20}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 