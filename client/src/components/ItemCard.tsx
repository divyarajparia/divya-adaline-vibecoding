import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '../types';
import { useAppStore } from '../store/store';
import { itemsApi } from '../hooks/useSocket';

interface ItemCardProps {
  item: Item;
  isSelected?: boolean;
  isOverlay?: boolean; // Used for drag overlay
}

export const ItemCard: React.FC<ItemCardProps> = ({ 
  item, 
  isSelected = false, 
  isOverlay = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get state from store using individual selectors
  const toggleItemSelection = useAppStore((state) => state.toggleItemSelection);
  const openItemModal = useAppStore((state) => state.openItemModal);
  const deleteItem = useAppStore((state) => state.deleteItem);

  // Set up drag & drop sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle item selection (for multi-select)
  const handleSelect = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleItemSelection(item.id);
    }
  };

  // Handle edit action
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openItemModal(item);
  };

  // Handle delete action
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const result = await itemsApi.delete(item.id);
      if (result.success) {
        // The deleteItem in store will be called via socket event
        console.log('✅ Item deleted successfully');
      } else {
        console.error('❌ Failed to delete item:', result.error);
      }
    } catch (error) {
      console.error('❌ Error deleting item:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Render component
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        item-card group relative cursor-grab active:cursor-grabbing
        ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}
        ${isOverlay ? 'drag-overlay' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={handleSelect}
      aria-label={`Drag ${item.title}`}
    >

      {/* Item Content */}
      <div className="relative z-20 flex items-center space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <span className="text-2xl" role="img" aria-label="Item icon">
            {item.icon}
          </span>
        </div>

        {/* Title */}
        <div className="flex-grow min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h3>
          {item.folderId && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              In folder
            </p>
          )}
        </div>

        {/* Action Buttons (appear on hover) */}
        <div
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 pointer-events-none group-hover:pointer-events-auto relative z-20"
          // Prevent drag when interacting with action buttons
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Edit Button */}
          <button
            onClick={handleEdit}
            className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 relative z-20"
            aria-label={`Edit ${item.title}`}
            title="Edit item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 relative z-20 disabled:opacity-50"
            aria-label={`Delete ${item.title}`}
            title="Delete item"
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
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-primary-500 rounded-full animate-bounce-subtle" />
      )}

      {/* Drag Preview Shadow (when dragging) */}
      {isDragging && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg opacity-30" />
      )}
    </div>
  );
};

// Optimized memo version for better performance
export const MemoizedItemCard = React.memo(ItemCard, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.icon === nextProps.item.icon &&
    prevProps.item.order === nextProps.item.order &&
    prevProps.item.folderId === nextProps.item.folderId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isOverlay === nextProps.isOverlay
  );
});

MemoizedItemCard.displayName = 'MemoizedItemCard';

// Export both versions
export default MemoizedItemCard; 