import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Item, Folder, AppStore } from '../types';

//storing the initial state. items and floders, ui stuff, and real time connection
//basically we are creating an object that stores the default initial values for our app's state
const initialState = {
  // Data
  items: {} as Record<string, Item>,
  folders: {} as Record<string, Folder>,
  
  //ui state
  isLoading: false,
  searchQuery: '',
  selectedItems: [] as string[],
  
  //modal states
  showItemModal: false,
  showFolderModal: false,
  editingItem: null as Item | null,
  editingFolder: null as Folder | null,
  defaultFolderId: null as string | null,
  
  //real-time connection
  isConnected: false,
  connectedClients: 0,
};

//create the store with actions
//this is a react "hook"
export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      //data operations
      
      setItems: (items: Item[]) => {
        const itemsMap = items.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, Item>);
        
        set({ items: itemsMap }, false, 'setItems');
      },

      setFolders: (folders: Folder[]) => {
        const foldersMap = folders.reduce((acc, folder) => {
          acc[folder.id] = folder;
          return acc;
        }, {} as Record<string, Folder>);
        
        set({ folders: foldersMap }, false, 'setFolders');
      },

      addItem: (item: Item) => {
        set(
          (state) => ({
            items: { ...state.items, [item.id]: item }
          }),
          false,
          'addItem'
        );
      },

      addFolder: (folder: Folder) => {
        set(
          (state) => ({
            folders: { ...state.folders, [folder.id]: folder }
          }),
          false,
          'addFolder'
        );
      },

      updateItem: (id: string, updates: Partial<Item>) => {
        set(
          (state) => ({
            items: {
              ...state.items,
              [id]: { ...state.items[id], ...updates }
              //gotta write the state.items[id] becayse it is possible only some of the attributes of item are updated
            }
          }),
          false,
          'updateItem'
        );
      },

      updateFolder: (id: string, updates: Partial<Folder>) => {
        set(
          (state) => ({
            folders: {
              ...state.folders,
              [id]: { ...state.folders[id], ...updates }
            }
          }),
          false,
          'updateFolder'
        );
      },

      deleteItem: (id: string) => {
        set(
          (state) => {
            const newItems = { ...state.items };
            delete newItems[id];
            return {
              items: newItems,
              //as a safety check, we remove this item from selected items as well
              //(it is possible user woudl have selected this item before deleting it)
              selectedItems: state.selectedItems.filter(itemId => itemId !== id)
            };
          },
          false,
          'deleteItem'
        );
      },

      deleteFolder: (id: string) => {
        set(
          (state) => {
            const newFolders = { ...state.folders };
            delete newFolders[id];
            
            //move items from deleted folder to root level
            const updatedItems = { ...state.items };
            Object.values(updatedItems).forEach(item => {
              if (item.folderId === id) {
                updatedItems[item.id] = { ...item, folderId: null };
              }
            });
            
            return {
              folders: newFolders,
              items: updatedItems
            };
          },
          false,
          'deleteFolder'
        );
      },

      //ui operations

      setLoading: (loading: boolean) => {
        set({ isLoading: loading }, false, 'setLoading');
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query }, false, 'setSearchQuery');
      },

      toggleItemSelection: (id: string) => {
        set(
          (state) => ({
            selectedItems: state.selectedItems.includes(id)
              ? state.selectedItems.filter(itemId => itemId !== id)
              : [...state.selectedItems, id]
          }),
          false,
          'toggleItemSelection'
        );
      },

      clearSelection: () => {
        set({ selectedItems: [] }, false, 'clearSelection');
      },

      //modal operations
      //item is optional here as we can open new or edit existing
      //defaultFolderId is used when creating new items from within a folder
      openItemModal: (item?: Item, defaultFolderId?: string) => {
        set((state) => ({
          showItemModal: true,
          showFolderModal: false,
          editingItem: item || null,
          editingFolder: null,
          defaultFolderId: defaultFolderId || null
        }), false, 'openItemModal');
      },

      openFolderModal: (folder?: Folder) => {
        set({
          showFolderModal: true,
          showItemModal: false,
          editingFolder: folder || null,
          editingItem: null
        }, false, 'openFolderModal');
      },

      closeModals: () => {
        set({
          showItemModal: false,
          showFolderModal: false,
          editingItem: null,
          editingFolder: null,
          defaultFolderId: null
        }, false, 'closeModals');
      },

      //real-time operations

      setConnectionStatus: (connected: boolean) => {
        set({ isConnected: connected }, false, 'setConnectionStatus');
      },

      setClientCount: (count: number) => {
        set({ connectedClients: count }, false, 'setClientCount');
      },

      //bulk operations for drag & drop

      reorderItems: (updates: { id: string; order: number; folderId: string | null }[]) => {
        set(
          (state) => {
            const updatedItems = { ...state.items };
            
            updates.forEach(({ id, order, folderId }) => {
              if (updatedItems[id]) {
                updatedItems[id] = {
                  ...updatedItems[id],
                  order,
                  folderId
                };
              }
            });
            
            return { items: updatedItems };
          },
          false,
          'reorderItems'
        );
      },

      reorderFolders: (updates: { id: string; order: number }[]) => {
        set(
          (state) => {
            const updatedFolders = { ...state.folders };
            
            updates.forEach(({ id, order }) => {
              if (updatedFolders[id]) {
                updatedFolders[id] = {
                  ...updatedFolders[id],
                  order
                };
              }
            });
            
            return { folders: updatedFolders };
          },
          false,
          'reorderFolders'
        );
      },
    }),
    {
      name: 'adaline-app-store', //name for redux devtools
    }
  )
);

  //selector hooks for optimized rendering

//simple direct selectors - no object creation
export const useItems = () => useAppStore(state => state.items);
export const useFolders = () => useAppStore(state => state.folders);
export const useSearchQuery = () => useAppStore(state => state.searchQuery);
export const useIsConnected = () => useAppStore(state => state.isConnected);
export const useConnectedClients = () => useAppStore(state => state.connectedClients);
export const useSelectedItems = () => useAppStore(state => state.selectedItems);
export const useIsLoading = () => useAppStore(state => state.isLoading);

//derived data functions (not hooks - call manually)
//these do not alter the state. We take existing state, and d owgatever we want
//the functions inside useAppStore modify the state, unlike these
export const getItemsArray = (items: Record<string, Item>) => 
  Object.values(items).sort((a, b) => a.order - b.order);

export const getFoldersArray = (folders: Record<string, Folder>) => 
  Object.values(folders).sort((a, b) => a.order - b.order);

export const getLooseItems = (items: Record<string, Item>) => 
  Object.values(items)
    .filter(item => item.folderId === null)
    .sort((a, b) => a.order - b.order);

export const getFolderItems = (items: Record<string, Item>, folderId: string) => 
  Object.values(items)
    .filter(item => item.folderId === folderId)
    .sort((a, b) => a.order - b.order);

export const getFilteredItems = (items: Record<string, Item>, searchQuery: string) => {
  if (!searchQuery.trim()) {
    return Object.values(items);
  }
  
  const query = searchQuery.toLowerCase();
  return Object.values(items).filter(item =>
    item.title.toLowerCase().includes(query)
  );
};

  //reset store to initial state (useful for testing or logout)
export const resetStore = () => {
  useAppStore.setState(() => ({
    ...initialState,
      //re-add all the action functions
    setItems: useAppStore.getState().setItems,
    setFolders: useAppStore.getState().setFolders,
    addItem: useAppStore.getState().addItem,
    addFolder: useAppStore.getState().addFolder,
    updateItem: useAppStore.getState().updateItem,
    updateFolder: useAppStore.getState().updateFolder,
    deleteItem: useAppStore.getState().deleteItem,
    deleteFolder: useAppStore.getState().deleteFolder,
    setLoading: useAppStore.getState().setLoading,
    setSearchQuery: useAppStore.getState().setSearchQuery,
    toggleItemSelection: useAppStore.getState().toggleItemSelection,
    clearSelection: useAppStore.getState().clearSelection,
    openItemModal: useAppStore.getState().openItemModal,
    openFolderModal: useAppStore.getState().openFolderModal,
    closeModals: useAppStore.getState().closeModals,
    setConnectionStatus: useAppStore.getState().setConnectionStatus,
    setClientCount: useAppStore.getState().setClientCount,
    reorderItems: useAppStore.getState().reorderItems,
    reorderFolders: useAppStore.getState().reorderFolders,
  }));
}; 