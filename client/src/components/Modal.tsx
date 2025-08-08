import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, useFolders, getFoldersArray } from '../store/store';
import { itemsApi, foldersApi } from '../hooks/useSocket';
import { COMMON_ICONS, IconType, Item, Folder } from '../types';

export const Modal: React.FC = () => {
  // Get state from store using stable selectors
  const showItemModal = useAppStore((state) => state.showItemModal);
  const showFolderModal = useAppStore((state) => state.showFolderModal);
  const editingItem = useAppStore((state) => state.editingItem);
  const editingFolder = useAppStore((state) => state.editingFolder);
  const defaultFolderId = useAppStore((state) => state.defaultFolderId);
  const items = useAppStore((state) => state.items);
  const folders = useFolders();
  
  // Get actions from store
  const closeModals = useAppStore((state) => state.closeModals);
  
  // Get folders array using helper function
  const foldersList = getFoldersArray(folders);
  const modalRef = useRef<HTMLDivElement>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    title: '',
    icon: '📄' as IconType,
    folderId: null as string | null,
  });

  const [folderForm, setFolderForm] = useState({
    name: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingItem) {
      setItemForm({
        title: editingItem.title,
        icon: editingItem.icon as IconType,
        folderId: editingItem.folderId,
      });
    } else {
      setItemForm({
        title: '',
        icon: '📄',
        folderId: defaultFolderId,
      });
    }
  }, [editingItem, defaultFolderId]);

  useEffect(() => {
    if (editingFolder) {
      setFolderForm({
        name: editingFolder.name,
      });
    } else {
      setFolderForm({
        name: '',
      });
    }
  }, [editingFolder]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModals();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModals]);

  // Handle click outside modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModals();
    }
  };

  // Handle icon selection
  const handleIconSelect = (icon: IconType) => {
    setItemForm(prev => ({ ...prev, icon }));
    setShowIconPicker(false);
  };

  // Handle item form submission
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemForm.title.trim()) {
      // eslint-disable-next-line no-restricted-globals
      alert('Please enter a title for the item.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingItem) {
        // Update existing item
        const result = await itemsApi.update(editingItem.id, {
          title: itemForm.title.trim(),
          icon: itemForm.icon,
          folderId: itemForm.folderId,
          order: editingItem.order, // Keep existing order
        });

        if (result.success) {
          console.log('✅ Item updated successfully');
          closeModals();
        } else {
          // eslint-disable-next-line no-restricted-globals
          alert(`Failed to update item: ${result.error}`);
        }
      } else {
        // Create new item
        const allItems = Object.values(items);
        const itemsInContainer = allItems.filter(item => item.folderId === itemForm.folderId);
        const maxOrder = itemsInContainer.length > 0 
          ? Math.max(...itemsInContainer.map(item => item.order)) 
          : -1;
        
        const result = await itemsApi.create({
          title: itemForm.title.trim(),
          icon: itemForm.icon,
          folderId: itemForm.folderId,
          order: maxOrder + 1,
        });

        if (result.success) {
          console.log('✅ Item created successfully');
          closeModals();
        } else {
          // eslint-disable-next-line no-restricted-globals
          alert(`Failed to create item: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error submitting item:', error);
      // eslint-disable-next-line no-restricted-globals
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle folder form submission
  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderForm.name.trim()) {
      // eslint-disable-next-line no-restricted-globals
      alert('Please enter a name for the folder.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingFolder) {
        // Update existing folder
        const result = await foldersApi.update(editingFolder.id, {
          name: folderForm.name.trim(),
          isOpen: editingFolder.isOpen, // Keep existing state
          order: editingFolder.order, // Keep existing order
        });

        if (result.success) {
          console.log('✅ Folder updated successfully');
          closeModals();
        } else {
          // eslint-disable-next-line no-restricted-globals
          alert(`Failed to update folder: ${result.error}`);
        }
      } else {
        // Create new folder
        const allFolders = Object.values(folders);
        const maxOrder = allFolders.length > 0 
          ? Math.max(...allFolders.map(folder => folder.order)) 
          : -1;
        
        const result = await foldersApi.create({
          name: folderForm.name.trim(),
          order: maxOrder + 1,
        });

        if (result.success) {
          console.log('✅ Folder created successfully');
          closeModals();
        } else {
          // eslint-disable-next-line no-restricted-globals
          alert(`Failed to create folder: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error submitting folder:', error);
      // eslint-disable-next-line no-restricted-globals
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if no modal is open
  if (!showItemModal && !showFolderModal) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        ref={modalRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {showItemModal && (editingItem ? 'Edit Item' : 'Create New Item')}
            {showFolderModal && (editingFolder ? 'Edit Folder' : 'Create New Folder')}
          </h2>
          
          <button
            onClick={closeModals}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Item Form */}
        {showItemModal && (
          <form onSubmit={handleItemSubmit} className="space-y-4">
            {/* Title Field */}
            <div>
              <label htmlFor="item-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                id="item-title"
                type="text"
                value={itemForm.title}
                onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                className="input-field"
                placeholder="Enter item title..."
                required
                autoFocus
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="flex items-center space-x-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <span className="text-xl">{itemForm.icon}</span>
                  <span className="text-sm">Click to change icon</span>
                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Icon Grid */}
                {showIconPicker && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                    <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {COMMON_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => handleIconSelect(icon)}
                          className={`
                            p-2 text-xl rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-600
                            ${itemForm.icon === icon ? 'bg-primary-100 dark:bg-primary-900' : ''}
                          `}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Folder Selection */}
            <div>
              <label htmlFor="item-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Folder (optional)
              </label>
              <select
                id="item-folder"
                value={itemForm.folderId || ''}
                onChange={(e) => setItemForm(prev => ({ ...prev, folderId: e.target.value || null }))}
                className="input-field"
              >
                <option value="">No folder (loose item)</option>
                {foldersList.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeModals}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{editingItem ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{editingItem ? 'Update Item' : 'Create Item'}</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Folder Form */}
        {showFolderModal && (
          <form onSubmit={handleFolderSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Folder Name *
              </label>
              <input
                id="folder-name"
                type="text"
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="Enter folder name..."
                required
                autoFocus
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeModals}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{editingFolder ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{editingFolder ? 'Update Folder' : 'Create Folder'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Modal; 