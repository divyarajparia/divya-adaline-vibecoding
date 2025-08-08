import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/store';
import { Item, Folder } from '../types';
//did not know a lot of stuff about sockets to be honest - so used AI while coding here
//socket connection configuration
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

//define the socket hook
export const useSocket = () => {
  //this is a ref to store the socket connection
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    //initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    //connection events
    
    socket.on('connect', () => {
      console.log('🔌 Connected to server:', socket.id);
      useAppStore.getState().setConnectionStatus(true);
      
      //request initial data when connected
      socket.emit('requestInitialData');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      useAppStore.getState().setConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      useAppStore.getState().setConnectionStatus(false);
    });

    //data events

    socket.on('initialData', (data: Array<{
      type: 'item' | 'folder';
      id: string;
      title?: string;
      name?: string;
      icon?: string;
      isOpen?: boolean;
      folderId?: string | null;
      order: number;
    }>) => {
      console.log('📊 Received initial data:', data);
      
      //separate items and folders
      const items: Item[] = [];
      const folders: Folder[] = [];
      
      data.forEach(item => {
        if (item.type === 'item' && item.title && item.icon !== undefined) {
          items.push({
            id: item.id,
            title: item.title,
            icon: item.icon,
            folderId: item.folderId || null,
            order: item.order
          });
        } else if (item.type === 'folder' && item.name && item.isOpen !== undefined) {
          folders.push({
            id: item.id,
            name: item.name,
            isOpen: item.isOpen,
            order: item.order
          });
        }
      });
      
      //once we receive the things at the client end, we uodate the Zustand store
      useAppStore.getState().setItems(items);
      useAppStore.getState().setFolders(folders);
      useAppStore.getState().setLoading(false);
    });

    //real-time update events
    //we are listening to the events from the server
    //we are updating the Zustand store with the new data
    socket.on('folderCreated', (folder: Folder) => {
      console.log('📁 Folder created:', folder);
      useAppStore.getState().addFolder(folder);
    });

    socket.on('itemCreated', (item: Item) => {
      console.log('📄 Item created:', item);
      useAppStore.getState().addItem(item);
    });

    socket.on('itemUpdated', (item: Item) => {
      console.log('🔄 Item updated:', item);
      useAppStore.getState().updateItem(item.id, item);
    });

    socket.on('folderUpdated', (folder: Folder) => {
      console.log('🔄 Folder updated:', folder);
      useAppStore.getState().updateFolder(folder.id, folder);
    });

    socket.on('itemDeleted', (data: { id: string }) => {
      console.log('🗑️ Item deleted:', data.id);
      useAppStore.getState().deleteItem(data.id);
    });

    socket.on('folderDeleted', (data: { id: string }) => {
      console.log('🗑️ Folder deleted:', data.id);
      useAppStore.getState().deleteFolder(data.id);
    });

    socket.on('bulkUpdateReceived', (updates: {
      items?: { id: string; title: string; icon: string; folderId: string | null; order: number }[];
      folders?: { id: string; name: string; isOpen: boolean; order: number }[];
    }) => {
      console.log('🔄 Bulk update received:', updates);
      
      if (updates.items) {
        const itemUpdates = updates.items.map(item => ({
          id: item.id,
          order: item.order,
          folderId: item.folderId
        }));
        useAppStore.getState().reorderItems(itemUpdates);
      }
      
      if (updates.folders) {
        const folderUpdates = updates.folders.map(folder => ({
          id: folder.id,
          order: folder.order
        }));
        useAppStore.getState().reorderFolders(folderUpdates);
      }
    });

    //system events

    socket.on('clientCount', (count: number) => {
      console.log('👥 Connected clients:', count);
      useAppStore.getState().setClientCount(count);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('❌ Server error:', error.message);
      // You could show a toast notification here
    });

    //cleanup
    
    return () => {
      console.log('🔌 Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty dependency array - only run once on mount

  //public methods

  const emitBulkUpdate = (updates: {
    items?: { id: string; title: string; icon: string; folderId: string | null; order: number }[];
    folders?: { id: string; name: string; isOpen: boolean; order: number }[];
  }) => {
    if (socketRef.current?.connected) {
      console.log('📤 Sending bulk update:', updates);
      socketRef.current.emit('bulkUpdate', updates);
    }
  };

  const requestInitialData = () => {
    if (socketRef.current?.connected) {
      console.log('📤 Requesting initial data');
      useAppStore.getState().setLoading(true);
      socketRef.current.emit('requestInitialData');
    }
  };

  const getConnectionStatus = () => {
    return {
      isConnected: socketRef.current?.connected || false,
      socketId: socketRef.current?.id || null
    };
  };

  return {
    socket: socketRef.current,
    emitBulkUpdate,
    requestInitialData,
    getConnectionStatus
  };
};

//api helper functions

//helper function to make API calls to the backend
//this is where it all starts. Thsi triggers an api call, the backend does the stuff
//and then it emits a message over socket, and then the client updates its state
//using the code just above  this
export const apiCall = async <T>(
  endpoint: string, //'/api/items' (creating a new item)
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', //'POST' 
  data?: any
): Promise<{ data?: T; error?: string; success: boolean }> => {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'; //backend url
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    return { data: result, success: true };
  } catch (error) {
    console.error(`API call failed for ${method} ${endpoint}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    };
  }
};

    //specific API functions for each operation - just a convenience.
    //can do the same thign by using the above apicall as well
export const itemsApi = {
  create: (data: { title: string; icon: string; folderId?: string | null; order?: number }) =>
    apiCall<Item>('/api/items', 'POST', data),

  //how to use this? await itemsApi.create({ title: "New Note", icon: smth here });

    
  update: (id: string, data: Partial<Item>) =>
    apiCall<Item>(`/api/items/${id}`, 'PUT', data),
    
  delete: (id: string) =>
    apiCall<{ id: string; deleted: boolean }>(`/api/items/${id}`, 'DELETE'),
};

export const foldersApi = {
  create: (data: { name: string; order?: number }) =>
    apiCall<Folder>('/api/folders', 'POST', data),
    
  update: (id: string, data: Partial<Folder>) =>
    apiCall<Folder>(`/api/folders/${id}`, 'PUT', data),
    
  delete: (id: string) =>
    apiCall<{ id: string; deleted: boolean }>(`/api/folders/${id}`, 'DELETE'),
};

export const dataApi = {
  getAll: () =>
    apiCall<Array<{ type: 'item' | 'folder'; [key: string]: any }>>('/api/data'),
}; 