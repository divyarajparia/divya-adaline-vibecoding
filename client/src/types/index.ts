//we are definign what an every piece of data (item, folder etc) looks like. it is an object with so and so attributes
//this ensures that every componrnt, function, api etc uses data in exactly the same way
export interface Item {
  id: string;
  title: string;
  icon: string;
  folderId: string | null; //null means its a loose item (not in any folder)
  order: number;
}

export interface Folder {
  id: string;
  name: string;
  isOpen: boolean;
  order: number;
}

//ui-specific types for drag and drop functionality
//this is basically a temoprary data strcutre for dnd funcionality
//why do we not take icon, folderID in the list of attributes?
export interface DragItem {
  id: string;
  type: 'item' | 'folder';
  title?: string;
  name?: string;
}

//state management types
//this is for the global application state
export interface AppState {
  //data
  items: Record<string, Item>; // Object map for fast lookups by ID
  folders: Record<string, Folder>;
  
  //ui state
  isLoading: boolean;
  searchQuery: string;
  selectedItems: string[]; //trying to do multi select functinality :)
  
  //modal states

  //this basically tells us if a particular entity is being edited(open) or not
  //explanation provided: 
  // Modal State: What modal is open, what's being edited
  
  showItemModal: boolean;
  showFolderModal: boolean;
  editingItem: Item | null;
  editingFolder: Folder | null;
  defaultFolderId: string | null;
  
  //real-time connection
  isConnected: boolean;
  connectedClients: number;
}

//actions for state management
//here we define the function type signatures - the exact parameters and return types of all functions
export interface AppActions {
  //we have functions defined inside this app interface, and here we describe what shape they must have
  //data operations
  setItems: (items: Item[]) => void;
  setFolders: (folders: Folder[]) => void;
  addItem: (item: Item) => void;
  addFolder: (folder: Folder) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteItem: (id: string) => void;
  deleteFolder: (id: string) => void;
  
  //ui operations
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleItemSelection: (id: string) => void;
  clearSelection: () => void;
  
  //modal operations
  //these operations basically deals with the modals
  //if we want to open a modal, we use openItem/Foldermodal function
  openItemModal: (item?: Item, defaultFolderId?: string) => void;
  openFolderModal: (folder?: Folder) => void;
  closeModals: () => void;
  
  //real-time operations
  setConnectionStatus: (connected: boolean) => void;
  setClientCount: (count: number) => void;
  
  //bulk operations for drag & drop
  reorderItems: (updates: { id: string; order: number; folderId: string | null }[]) => void; //array of objects here
  reorderFolders: (updates: { id: string; order: number }[]) => void;
}

//combined store type
//this obejct now has both state properties and action functions
//This is what our Zustand store implements
export type AppStore = AppState & AppActions;

//API response types (what we get from backend)
//we will do a generic type <T> here, resuable, that can work with different data types
export interface ApiResponse<T> {
  data?: T; //optional, present on success
  error?: string;//optional, present on failure
  success: boolean;
}

//Socket.io event types
export interface SocketEvents {
  //outgoing events (client to server)
  requestInitialData: () => void;
  //syntax - updates is an object, which can take items and folders array (both optional)
  bulkUpdate: (updates: {
    items?: { id: string; title: string; icon: string; folderId: string | null; order: number }[];
    folders?: { id: string; name: string; isOpen: boolean; order: number }[];
  }) => void;
  
  //incoming events (server to client)
  initialData: (data: Array<{
    type: 'item' | 'folder';
    id: string;
    title?: string;
    name?: string;
    icon?: string;
    isOpen?: boolean;
    folderId?: string | null;
    order: number;
  }>) => void;
  
//cleitn stuff happens via http requests, we used socket emit there to handle ir. 
//socket.io is only used to broadcast updates from server to all clients.

folderCreated: (folder: Folder) => void;
  itemCreated: (item: Item) => void;
  itemUpdated: (item: Item) => void;
  folderUpdated: (folder: Folder) => void;
  itemDeleted: (data: { id: string }) => void;
  folderDeleted: (data: { id: string }) => void;
  bulkUpdateReceived: (updates: any) => void;
  clientCount: (count: number) => void;
  error: (error: { message: string }) => void;
}

//form types for modals
//this is the data that we will pass to the modal
export interface ItemFormData {
  title: string;
  icon: string;
  folderId: string | null;
}

export interface FolderFormData {
  name: string;
}

// Common icon options for the icon picker
export const COMMON_ICONS = [
  '📄', '📁', '📷', '🎵', '🎬', '📊', '💼', '📝', 
  '🔧', '⚙️', '🎯', '💡', '📚', '🔗', '📱', '💻',
  '🎨', '📦', '🔒', '⭐', '❤️', '🔥', '💎', '🚀'
] as const;

export type IconType = typeof COMMON_ICONS[number];

//drag and drop types (for dnd-kit)
export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current?: {
        type: 'item' | 'folder';
        sortable: {
          containerId: string;
          index: number;
        };
      };
    };
  };
  over: {
    id: string;
    data: {
      current?: {
        type: 'droppable';
        accepts: string[];
      };
    };
  } | null;
}

// Search and filter types
export interface FilterOptions {
  query: string;
  showOnlyFavorites?: boolean;
  folderFilter?: string | null; // Filter by specific folder
} 