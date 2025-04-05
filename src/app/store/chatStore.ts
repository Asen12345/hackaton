import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  is_user: boolean;
  timestamp: string;
  likes: boolean;
  dislikes: boolean;
  sources: Source[];
  chat_new_name: string | null;
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
  fetchChats: () => Promise<void>;
  createChat: (name: string) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  likeMessage: (messageId: string) => Promise<void>;
  dislikeMessage: (messageId: string) => Promise<void>;
  setCurrentChatId: (chatId: string | null) => void;
}

type ChatStorePersist = ChatStore & {
  _hasHydrated: boolean;
};

export const useChatStore = create<ChatStorePersist>()(
  persist(
    (set) => ({
      chats: [],
      loading: false,
      error: null,
      currentChatId: null,
      _hasHydrated: false,

      setCurrentChatId: (chatId: string | null) => set({ currentChatId: chatId }),

      fetchChats: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('http://wtfvibe.ru:8008/chats');
          if (!response.ok) throw new Error('Failed to fetch chats');
          const data = await response.json();
          set({ chats: data, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
        }
      },

      createChat: async (name: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('http://wtfvibe.ru:8008/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
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
          const response = await fetch(`http://wtfvibe.ru:8008/chats/${chatId}`, {
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
          const response = await fetch(`http://wtfvibe.ru:8008/chats/${chatId}/messages`);
          
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

      sendMessage: async (chatId: string, content: string) => {
        set({ loading: true, error: null });
        try {
          // Создаем временное сообщение пользователя
          const userMessage: Message = {
            id: `temp-${Date.now()}`,
            chat_id: chatId,
            content,
            is_user: true,
            timestamp: new Date().toISOString(),
            likes: false,
            dislikes: false,
            sources: [],
            chat_new_name: null
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

          const response = await fetch(`http://wtfvibe.ru:8008/chats/${chatId}/messages?content=${encodeURIComponent(content)}`, {
            method: 'POST',
          });
          
          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }
          
          if (response.status !== 201) throw new Error('Failed to send message');
          const newMessage = await response.json();
          
          // Обновляем состояние с ответом ассистента
          set((state) => ({
            chats: state.chats.map((chat) => 
              chat.id === chatId 
                ? { 
                    ...chat, 
                    messages: [...(chat.messages || []), newMessage] 
                  } 
                : chat
            ),
            loading: false
          }));
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
        }
      },

      likeMessage: async (messageId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`http://wtfvibe.ru:8008/messages/${messageId}/like`, {
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
          const response = await fetch(`http://wtfvibe.ru:8008/messages/${messageId}/dislike`, {
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
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ chats: state.chats }),
      onRehydrateStorage: () => (state) => {
        state?._hasHydrated && (state._hasHydrated = true);
      },
    }
  )
); 