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
  fetchChats: () => Promise<void>;
  createChat: (name: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
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
      _hasHydrated: false,

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
          set((state) => ({ chats: [...state.chats, data.chat], loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
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
          const response = await fetch(`http://wtfvibe.ru:8008/chats/${chatId}/messages?content=${encodeURIComponent(content)}`, {
            method: 'POST',
          });
          
          if (response.status === 400) {
            const errorData: ErrorResponse = await response.json();
            throw new Error(errorData.detail);
          }
          
          if (response.status !== 201) throw new Error('Failed to send message');
          const newMessage = await response.json();
          
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