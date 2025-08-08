import React, { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { 
  useAppStore, 
  useItems,
  useFolders, 
  useSearchQuery,
  useSelectedItems,
  useIsLoading,
  getFoldersArray,
  getLooseItems,
  getFilteredItems
} from '../store/store';
import { useDragDrop } from '../hooks/useDragDrop';
import { useSocket } from '../hooks/useSocket';
import MemoizedItemCard from './ItemCard';
import MemoizedFolderBox from './FolderBox';
import HeaderBar from './HeaderBar';
import Modal from './Modal';

export const Board: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Get state from store using stable selectors
  const items = useItems();
  const folders = useFolders();
  const searchQuery = useSearchQuery();
  const selectedItems = useSelectedItems();
  const isLoading = useIsLoading();
  
  // Compute derived data using helper functions
  const foldersArray = getFoldersArray(folders);
  const looseItems = getLooseItems(items);
  const filteredItems = getFilteredItems(items, searchQuery);
  
  // Calculate total items across all folders and loose items
  const totalItemsCount = Object.keys(items).length;
  const hasAnyItems = totalItemsCount > 0;
  
  // Initialize socket connection
  useSocket();
  
  // Get drag and drop handlers
  const {
    sensors,
    collisionDetection,
    onDragStart,
    onDragOver,
    onDragEnd,
    getDragOverlay,
    dropAnimationConfig
  } = useDragDrop();

  // Set up droppable area for the main board
  const {
    setNodeRef: setBoardRef,
    isOver: isBoardOver,
  } = useDroppable({
    id: 'board',
    data: {
      type: 'board',
      accepts: ['item', 'folder'],
    },
  });

  // Dedicated droppable for the loose items grid so items can be dropped here
  const {
    setNodeRef: setLooseRef,
    isOver: isLooseOver,
  } = useDroppable({
    id: 'loose-items',
    data: {
      type: 'loose-items',
      accepts: ['item'],
    },
  });

  // Enhanced drag handlers with active state
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    onDragStart(event);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    onDragEnd(event);
  };

  // Filter items based on search query
  const getDisplayItems = () => {
    if (!searchQuery.trim()) {
      return looseItems;
    }
    
    // When searching, show all matching items regardless of folder
    return filteredItems.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const displayItems = getDisplayItems();

  // Filter folders based on search (show folders that contain matching items)
  const getDisplayFolders = () => {
    if (!searchQuery.trim()) {
      return foldersArray;
    }
    
    // Show folders that have matching items or names that match
    return foldersArray.filter(folder => {
      const folderNameMatches = folder.name.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingItems = filteredItems.some(item => item.folderId === folder.id);
      return folderNameMatches || hasMatchingItems;
    });
  };

  const displayFolders = getDisplayFolders();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <HeaderBar />

        {/* Main Content */}
        <main
          className={`
            relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-200
            min-h-40
            ${isBoardOver ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}
          `}
        >
          {/* Invisible board-wide drop zone */}
          <div
            ref={setBoardRef}
            id="board-dropzone"
            data-type="board"
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          />
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg text-gray-600 dark:text-gray-300">Loading your workspace...</span>
              </div>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Search Results Info */}
              {searchQuery && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Search Results
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Found {filteredItems.length} item(s) and {displayFolders.length} folder(s) matching "{searchQuery}"
                      </p>
                    </div>
                    <button
                      onClick={() => useAppStore.getState().setSearchQuery('')}
                      className="btn-secondary text-sm"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              )}

              {/* Folders Section */}
              {displayFolders.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      📁 Folders {searchQuery && `(${displayFolders.length})`}
                    </h2>
                  </div>
                  
                  <SortableContext
                    items={displayFolders.map(folder => folder.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {displayFolders.map((folder) => (
                        <MemoizedFolderBox
                          key={folder.id}
                          folder={folder}
                          isOverlay={false}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}

              {/* Loose Items Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📋 {searchQuery ? 'Matching Items' : 'Items'} {searchQuery && `(${displayItems.length})`}
                  </h2>
                  {!searchQuery && displayItems.length === 0 && !hasAnyItems && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get started by adding your first item or folder
                    </p>
                  )}
                </div>

                <div
                  ref={setLooseRef}
                  className={`relative rounded-lg ${isLooseOver ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}`}
                  style={{ minHeight: '120px' }}
                >
                {displayItems.length > 0 ? (
                    <SortableContext
                    items={displayItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {displayItems.map((item) => (
                        <MemoizedItemCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.includes(item.id)}
                          isOverlay={false}
                        />
                      ))}
                    </div>
                    </SortableContext>
                ) : (
                  // Empty State
                  <div className="text-center py-12">
                    {searchQuery ? (
                      // No Search Results
                      <div>
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No items found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Try adjusting your search or create a new item with this name.
                        </p>
                        <button
                          onClick={() => {
                            useAppStore.getState().openItemModal();
                            // Pre-fill title with search query
                          }}
                          className="btn-primary"
                        >
                          Create "{searchQuery}"
                        </button>
                      </div>
                    ) : !hasAnyItems ? (
                      // Welcome State (only when truly empty)
                      <div>
                        <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                          <svg className="w-12 h-12 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Welcome to your workspace!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                          Start organizing by creating your first item or folder. You can drag and drop to rearrange them however you like.
                        </p>
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={() => useAppStore.getState().openItemModal()}
                            className="btn-primary"
                          >
                            ➕ Create First Item
                          </button>
                          <button
                            onClick={() => useAppStore.getState().openFolderModal()}
                            className="btn-secondary"
                          >
                            📁 Create First Folder
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Has items in folders but no loose items
                      <div>
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          All items are organized in folders
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Your items are neatly organized in folders above. Create a new item to add it here, or drag items out of folders.
                        </p>
                        <button
                          onClick={() => useAppStore.getState().openItemModal()}
                          className="btn-primary"
                        >
                          ➕ Add Item
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>

              {/* Drop Zone Indicator */}
              {isBoardOver && (
                <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
                  <div className="bg-primary-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce-subtle">
                    Drop here to remove from folder
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeId ? (
            (() => {
              const dragData = getDragOverlay(activeId);
              if (dragData?.type === 'item') {
                return (
                  <MemoizedItemCard
                    item={dragData.data}
                    isOverlay={true}
                  />
                );
              } else if (dragData?.type === 'folder') {
                return (
                  <MemoizedFolderBox
                    folder={dragData.data}
                    isOverlay={true}
                  />
                );
              }
              return null;
            })()
          ) : null}
        </DragOverlay>

        {/* Modal */}
        <Modal />
      </div>
    </DndContext>
  );
};

export default Board; 