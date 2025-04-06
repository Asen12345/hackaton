import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { debounce } from 'lodash';
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Функция для генерации случайного user_id
const generateUserId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Функция для получения или создания user_id
const getOrCreateUserId = () => {
  if (typeof window === 'undefined') {
    return generateUserId();
  }

  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

interface Source {
  id: string;
  title: string;
  text: string;
  url: string;
}

interface Message {
  id: string;
  chat_id: string;
  content: string;
  role: 'User' | 'Assistant';
  timestamp: string;
  likes: boolean;
  dislikes: boolean;
  sources: Source[];
  chat_new_name?: string;
  audio_url?: string;
  image_url?: string;
}

interface Chat {
  id: string;
  name: string;
  created_at?: string;
  messages?: Message[];
}

interface ErrorResponse {
  status_code: number;
  detail: string;
  extra: Record<string, unknown>;
}

interface ChatStore {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  currentChatId: string | null;
  userId: string;
  streamingContent: string;
  fetchChats: () => Promise<void>;
  createChat: (name: string) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, imageFile?: File, audioBlob?: Blob) => Promise<Message>;
  likeMessage: (messageId: string) => Promise<void>;
  dislikeMessage: (messageId: string) => Promise<void>;
  setCurrentChatId: (chatId: string | null) => void;
  renameChat: (chatId: string, name: string) => Promise<void>;
  setStreamingContent: (content: string) => void;
}

type ChatStorePersist = ChatStore & {
  _hasHydrated: boolean;
};

export const useChatStore = create<ChatStorePersist>()(
  persist(
    (set, get) => ({
      chats: [],
      loading: false,
      error: null,
      currentChatId: null,
      userId: getOrCreateUserId(),
      _hasHydrated: false,
      streamingContent: '',

      setCurrentChatId: (chatId: string | null) => set({ currentChatId: chatId }),

      setStreamingContent: (content: string) => set({ streamingContent: content }),

      fetchChats: debounce(async () => {
        if (get().loading) return;

        set({ loading: true, error: null });
        try {
          const userId = getOrCreateUserId();
          const response = await fetch(`${API_URL}/chats?user_id=${userId}`);
          if (!response.ok) throw new Error('Failed to fetch chats');
          const data = await response.json();
          set({ chats: data, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      }, 300) as () => Promise<void>,

      createChat: async (name: string) => {
        set({ loading: true, error: null });
        try {
          const userId = getOrCreateUserId();
          const response = await fetch(`${API_URL}/chats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, user_id: userId }),
          });

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to create chat');
          const data = await response.json();
          const newChat = data.chat;
          set((state) => ({ chats: [...state.chats, newChat], loading: false }));
          return newChat;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
          throw error;
        }
      },

      deleteChat: async (chatId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'DELETE',
          });

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to delete chat');
          set((state) => ({
            chats: state.chats.filter((chat) => chat.id !== chatId),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },

      fetchMessages: async (chatId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/chats/${chatId}/messages`);

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to fetch messages');
          const messages = await response.json();

          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId ? { ...chat, messages } : chat
            ),
            loading: false
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },

      sendMessage: async (chatId: string, content: string, imageFile?: File, audioBlob?: Blob) => {
        set({ loading: true, error: null, streamingContent: '' });
        try {
          let messageContent = content;
          if (audioBlob) {
            messageContent = content ? `${content} (Голосовое сообщение)` : "Голосовое сообщение";
          } else if (imageFile) {
            messageContent = content ? `${content} (Изображение)` : "Изображение";
          }

          // Создаем временное сообщение пользователя
          const userMessage: Message = {
            id: `temp-${Date.now()}`,
            chat_id: chatId,
            content: messageContent,
            role: 'User',
            timestamp: new Date().toISOString(),
            likes: false,
            dislikes: false,
            sources: [],
          };

          // Добавляем сообщение пользователя в состояние
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                  ...chat,
                  messages: [...(chat.messages || []), userMessage]
                }
                : chat
            )
          }));

          const requestBody: any = {
            content: messageContent
          };

          if (imageFile) {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            const base64Data = await new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
            });
            requestBody.image_base64 = base64Data;
          }

          if (audioBlob) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            const base64Data = await new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
            });
            requestBody.audio_base64 = base64Data;
          }

          let finalMessage: Message | null = null;

          await fetchEventSource(`${API_URL}/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            onmessage(event) {
              const data = JSON.parse(event.data);
              
              switch (event.event) {
                case 'processing':
                  // Начало обработки
                  break;
                case 'bot_response':
                  // Обновляем промежуточный контент
                  set((state) => ({ streamingContent: state.streamingContent + data.content }));
                  break;
                case 'complete':
                  // Финальное сообщение
                  finalMessage = data;
                  set((state) => ({
                    chats: state.chats.map((chat) =>
                      chat.id === chatId
                        ? {
                          ...chat,
                          messages: [...(chat.messages || []), data]
                        }
                        : chat
                    ),
                    streamingContent: '',
                    loading: false
                  }));
                  break;
              }
            },
            onerror(err) {
              set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
              throw err;
            }
          });

          if (!finalMessage) {
            throw new Error('No final message received');
          }

          return finalMessage;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
          // Удаляем временное сообщение пользователя в случае ошибки
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                  ...chat,
                  messages: chat.messages?.filter(msg => msg.id !== `temp-${Date.now()}`) || []
                }
                : chat
            )
          }));
          throw error;
        }
      },

      likeMessage: async (messageId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/messages/${messageId}/like`, {
            method: 'PUT',
          });

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to like message');

          // Обновляем состояние сообщения в хранилище
          set((state) => ({
            chats: state.chats.map((chat) => ({
              ...chat,
              messages: chat.messages?.map((message) =>
                message.id === messageId
                  ? { ...message, likes: true, dislikes: false }
                  : message
              ),
            })),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },

      dislikeMessage: async (messageId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/messages/${messageId}/dislike`, {
            method: 'PUT',
          });

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to dislike message');

          // Обновляем состояние сообщения в хранилище
          set((state) => ({
            chats: state.chats.map((chat) => ({
              ...chat,
              messages: chat.messages?.map((message) =>
                message.id === messageId
                  ? { ...message, likes: false, dislikes: true }
                  : message
              ),
            })),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },

      renameChat: async (chatId: string, name: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/chats/${chatId}/rename`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          });

          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }

          if (!response.ok) throw new Error('Failed to rename chat');

          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId ? { ...chat, name } : chat
            ),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { }
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({ chats: state.chats }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
); 