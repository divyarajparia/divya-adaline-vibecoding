import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Folder } from '../types';
import { useAppStore, useItems, useSelectedItems, getFolderItems } from '../store/store';
import { foldersApi } from '../hooks/useSocket';
import MemoizedItemCard from './ItemCard';

interface FolderBoxProps {
  folder: Folder;
  isOverlay?: boolean; // Used for drag overlay
}

export const FolderBox: React.FC<FolderBoxProps> = ({ 
  folder, 
  isOverlay = false 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get state from store using stable selectors
  const items = useItems();
  const selectedItems = useSelectedItems();
  
  // Get actions from store
  const updateFolder = useAppStore((state) => state.updateFolder);
  const openFolderModal = useAppStore((state) => state.openFolderModal);
  const openItemModal = useAppStore((state) => state.openItemModal);
  
  // Get items in this folder using helper function
  const folderItems = getFolderItems(items, folder.id);
  
  // Set up drag functionality for the folder itself
  const {
    attributes: folderAttributes,
    listeners: folderListeners,
    setNodeRef: setFolderRef,
    transform,
    transition,
    isDragging: isFolderDragging,
  } = useSortable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
  });

  // Set up drop functionality for items being dropped into this folder
  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      accepts: ['item'],
      folder,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isFolderDragging ? 0.5 : 1,
  };

  // Handle folder toggle (open/close)
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      const result = await foldersApi.update(folder.id, {
        ...folder,
        isOpen: !folder.isOpen
      });
      
      if (result.success) {
        // The updateFolder in store will be called via socket event
        console.log('✅ Folder toggle successful');
      } else {
        console.error('❌ Failed to toggle folder:', result.error);
      }
    } catch (error) {
      console.error('❌ Error toggling folder:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle edit action
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFolderModal(folder);
  };

  // Handle delete action
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const itemCount = folderItems.length;
    const message = itemCount > 0 
      ? `Are you sure you want to delete "${folder.name}"?\n\nThis will move ${itemCount} item(s) to loose items.`
      : `Are you sure you want to delete "${folder.name}"?`;
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(message)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const result = await foldersApi.delete(folder.id);
      if (result.success) {
        // The deleteFolder in store will be called via socket event
        console.log('✅ Folder deleted successfully');
      } else {
        console.error('❌ Failed to delete folder:', result.error);
      }
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={setDroppableRef}
      style={style}
      className={`
        folder-box group relative
        ${isOverlay ? 'drag-overlay' : ''}
        ${isFolderDragging ? 'opacity-50' : ''}
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Folder Header */}
      <div className="folder-header">
        {/* Drag Handle for Folder */}
        <div
          ref={setFolderRef}     
          {...folderAttributes}
          {...folderListeners}
          className="drag-handle flex items-center space-x-2 flex-grow cursor-grab active:cursor-grabbing"
          aria-label={`Drag folder ${folder.name}`}
        >
          {/* Folder Icon */}
          <span className="text-lg" role="img" aria-label="Folder">
            📁
          </span>
          
          {/* Folder Name */}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {folder.name}
          </h2>
          
          {/* Item Count */}
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
            {folderItems.length} item{folderItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Folder Actions */}
        <div className="flex items-center space-x-1">
          {/* Edit Button */}
          <button
            onClick={handleEdit}
            className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 opacity-0 group-hover:opacity-100"
            aria-label={`Edit folder ${folder.name}`}
            title="Edit folder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50"
            aria-label={`Delete folder ${folder.name}`}
            title="Delete folder"
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>

          {/* Toggle Button */}
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200"
            aria-label={folder.isOpen ? 'Collapse folder' : 'Expand folder'}
            title={folder.isOpen ? 'Collapse folder' : 'Expand folder'}
          >
            {isUpdating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${folder.isOpen ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Folder Content */}
      <div
        className={`
          mt-3 transition-all duration-300 ease-in-out overflow-hidden
          ${folder.isOpen ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {folder.isOpen && (
          <div className="space-y-2">
            {folderItems.length === 0 ? (
              // Empty State
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm mb-3">
                  Drop items here or create a new one
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openItemModal(undefined, folder.id);
                  }}
                  className="btn-primary text-sm"
                >
                  ➕ Add Item
                </button>
              </div>
            ) : (
              // Items List
              <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {folderItems.map((item) => (
                  <MemoizedItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                  />
                ))}
              </div>
                
                {/* Add Item Button for Folders with Items */}
                <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-600">
                                     <button
                     onClick={(e) => {
                       e.stopPropagation();
                       openItemModal(undefined, folder.id);
                     }}
                     className="btn-secondary text-sm flex items-center space-x-1"
                   >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag Preview Shadow (when dragging folder) */}
      {isFolderDragging && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-xl opacity-30" />
      )}
    </div>
  );
};

// Optimized memo version for better performance
export const MemoizedFolderBox = React.memo(FolderBox, (prevProps, nextProps) => {
  return (
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.name === nextProps.folder.name &&
    prevProps.folder.isOpen === nextProps.folder.isOpen &&
    prevProps.folder.order === nextProps.folder.order &&
    prevProps.isOverlay === nextProps.isOverlay
  );
});

MemoizedFolderBox.displayName = 'MemoizedFolderBox';

// Export both versions
export default MemoizedFolderBox; 