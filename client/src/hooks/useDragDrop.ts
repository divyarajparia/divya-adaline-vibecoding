import { useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppStore, useItems, useFolders, getLooseItems, getFolderItems } from '../store/store';
import { itemsApi, foldersApi } from './useSocket';
import { Item, Folder } from '../types';

export const useDragDrop = () => {
  const {
    reorderItems,
    reorderFolders,
    updateItem,
    updateFolder
  } = useAppStore();

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection – first try pointerWithin so dropping on board works,
  // then fall back to closestCorners for fine-grained ordering.
  const smartCollisionDetection = useCallback((args: any) => {
    // Prioritise whatever is directly beneath the pointer
    const hits = pointerWithin(args);
    if (hits.length) {
      // Prefer dropping into the dedicated loose-items area if present
      const looseHit = hits.find((h: any) => h.id === 'loose-items');
      if (looseHit) return [looseHit];
      // Otherwise fall back to board-wide drop target
      const boardHit = hits.find((h: any) => h.id === 'board');
      return boardHit ? [boardHit] : hits;
    }
    // Fallback to closest corners (for fine-grained re-ordering)
    const fallback = closestCorners(args);
    // Bias towards loose-items if it is one of the closest candidates
    const looseCandidate = fallback.find((h: any) => h.id === 'loose-items');
    if (looseCandidate) return [looseCandidate];
    return fallback;
  }, []);

  // Custom drop animation
  const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  // ===== DRAG EVENT HANDLERS =====

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    console.log('🟡 Drag started:', active.id);
    
    // You can add visual feedback here (e.g., dim other items)
    // Or update state to show drag indicators
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Don't do anything if dropping on self
    if (activeId === overId) return;

    // You can add visual feedback here (e.g., highlight drop zones)
    console.log('🟠 Dragging over:', { activeId, overId });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      console.log('🔴 Drag ended with no drop target');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('🟢 Drag ended:', { activeId, overId, activeType: active.data.current?.type, overType: over.data.current?.type });

    // Determine what was dragged and where it was dropped
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    try {
      if (activeType === 'item') {
        await handleItemDrop(activeId, overId, overType);
      } else if (activeType === 'folder') {
        await handleFolderDrop(activeId, overId);
      } else {
        console.warn('⚠️ Unknown drag type:', { activeType, activeId, overId, overType });
      }
    } catch (error) {
      console.error('❌ Error handling drag end:', error);
      // You could show an error toast here
    }
  }, []);

  // ===== ITEM DROP LOGIC =====

  const handleItemDrop = useCallback(async (
    itemId: string,
    dropTargetId: string,
    dropTargetType: string | undefined
  ) => {
    const allItems = useAppStore.getState().items;
    const allFolders = useAppStore.getState().folders;
    const draggedItem = allItems[itemId];

    if (!draggedItem) {
      console.error('❌ Dragged item not found:', itemId);
      return;
    }

    // Case 1: Dropping on a folder
    if (dropTargetType === 'folder') {
      const targetFolder = allFolders[dropTargetId];
      if (!targetFolder) {
        console.error('❌ Target folder not found:', dropTargetId);
        return;
      }

      const itemsInContainer = Object.values(allItems)
        .filter(item => item.folderId === targetFolder.id);

      // --- New logic ---
      // If we are dropping back into *the same* folder we came from, place it at the top.
      // Otherwise (moving to a different folder) append it to the bottom.
      const droppingIntoSameFolder = draggedItem.folderId === targetFolder.id;

      const newOrder = droppingIntoSameFolder
        ? (itemsInContainer.length > 0 ? Math.min(...itemsInContainer.map(i => i.order)) - 1 : 0) // top
        : (itemsInContainer.length > 0 ? Math.max(...itemsInContainer.map(i => i.order)) + 1 : 0); // bottom

      // Optimistic local update
      updateItem(itemId, { folderId: targetFolder.id, order: newOrder });

      // Persist to backend
      await itemsApi.update(itemId, {
        ...draggedItem,
        folderId: targetFolder.id,
        order: newOrder,
      });

      console.log('📋 Item moved into folder:', { itemId, folderId: targetFolder.id, order: newOrder });
      return;
    }
    
    // Case 2: Dropping on another item (reordering)
    else if (dropTargetType === 'item') {
      const targetItem = allItems[dropTargetId];
      if (!targetItem) {
        console.error('❌ Target item not found:', dropTargetId);
        return;
      }

      // Two sub-cases:
      // A) Same container  → reorder
      // B) Different container → treat as move into that container (append)

      if (targetItem.folderId === draggedItem.folderId) {
        // --- A) Reorder inside same folder or loose items ---
        const containerItems = Object.values(allItems)
          .filter(item => item.folderId === targetItem.folderId)
          .sort((a, b) => a.order - b.order);

        const oldIndex = containerItems.findIndex(item => item.id === itemId);
        const newIndex = containerItems.findIndex(item => item.id === dropTargetId);

        if (oldIndex === -1 || newIndex === -1) {
          console.error('❌ Could not find item indices for reordering');
          return;
        }

        const reorderedItems = arrayMove(containerItems, oldIndex, newIndex);

        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          order: index,
          folderId: item.folderId
        }));

        reorderItems(updates);

        for (const update of updates) {
          await itemsApi.update(update.id, {
            ...allItems[update.id],
            order: update.order,
          });
        }

        console.log('📋 Items reordered within container', targetItem.folderId);
      } else {
        // --- B) Move into the target item's folder (append to bottom) ---
        const targetFolderId = targetItem.folderId; // can be null for loose items

        const itemsInTarget = Object.values(allItems)
          .filter(item => item.folderId === targetFolderId);

        const newOrder = itemsInTarget.length > 0 ? Math.max(...itemsInTarget.map(i => i.order)) + 1 : 0;

        updateItem(itemId, { folderId: targetFolderId, order: newOrder });

        await itemsApi.update(itemId, {
          ...draggedItem,
          folderId: targetFolderId,
          order: newOrder,
        });

        console.log('📋 Item moved by dropping on another item', { itemId, targetFolderId, newOrder });
      }
      return;
    }
    
    // Case 3: Dropping on main board (remove from folder)
    else if (dropTargetType === 'board' || dropTargetType === 'loose-items') {
      // Get current loose items to calculate new order
      const looseItems = Object.values(allItems)
        .filter(item => item.folderId === null)
        .sort((a, b) => a.order - b.order);

      const newOrder = looseItems.length > 0 
        ? Math.max(...looseItems.map(item => item.order)) + 1 
        : 0;

      // Update item to move it to loose items
      updateItem(itemId, { folderId: null, order: newOrder });

      // Sync with backend
      await itemsApi.update(itemId, {
        ...draggedItem,
        folderId: null,
        order: newOrder
      });

      console.log('📋 Item moved to loose items:', { itemId, order: newOrder });
    }
  }, [updateItem, reorderItems]);

  // ===== FOLDER DROP LOGIC =====

  const handleFolderDrop = useCallback(async (
    folderId: string,
    dropTargetId: string
  ) => {
    console.log('📁 handleFolderDrop called:', { folderId, dropTargetId });
    
    const allFolders = useAppStore.getState().folders;
    const draggedFolder = allFolders[folderId];

    if (!draggedFolder) {
      console.error('❌ Dragged folder not found:', folderId);
      return;
    }

    // Case 1: Dropping on board (move to end of folder list)
    if (dropTargetId === 'board') {
      console.log('📁 Folder dropped on board (moving to end)');
      
      // Get all folders sorted by order
      const folderArray = Object.values(allFolders).sort((a, b) => a.order - b.order);
      const maxOrder = folderArray.length > 0 ? Math.max(...folderArray.map(f => f.order)) : -1;
      const newOrder = maxOrder + 1;
      
      // Update folder order
      updateFolder(folderId, { order: newOrder });
      
      // Sync with backend
      await foldersApi.update(folderId, {
        ...draggedFolder,
        order: newOrder
      });
      
      console.log('📁 Folder moved to end:', { folderId, order: newOrder });
      return;
    }

    // Case 2: Dropping on another folder (reordering)
    const targetFolder = allFolders[dropTargetId];
    if (!targetFolder) {
      console.error('❌ Target folder not found for reordering:', dropTargetId);
      return;
    }

    // Get all folders sorted by order
    const folderArray = Object.values(allFolders).sort((a, b) => a.order - b.order);
    
    const oldIndex = folderArray.findIndex(folder => folder.id === folderId);
    const newIndex = folderArray.findIndex(folder => folder.id === dropTargetId);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('❌ Could not find folder indices for reordering');
      return;
    }

    // Reorder folders
    const reorderedFolders = arrayMove(folderArray, oldIndex, newIndex);

    // Create update payload
    const updates = reorderedFolders.map((folder, index) => ({
      id: folder.id,
      order: index
    }));

    // Update locally first
    reorderFolders(updates);

    // Sync with backend
    for (const update of updates) {
      await foldersApi.update(update.id, { order: update.order });
    }

    console.log('📁 Folders reordered:', updates);
  }, [reorderFolders]);

  // ===== UTILITY FUNCTIONS =====

  const getItemsByContainer = useCallback((containerId: string | null) => {
    const allItems = useAppStore.getState().items;
    return Object.values(allItems)
      .filter(item => item.folderId === containerId)
      .sort((a, b) => a.order - b.order);
  }, []);

  const getDragOverlay = useCallback((activeId: string) => {
    const allItems = useAppStore.getState().items;
    const allFolders = useAppStore.getState().folders;
    
    const item = allItems[activeId];
    const folder = allFolders[activeId];
    
    if (item) {
      return { type: 'item' as const, data: item };
    } else if (folder) {
      return { type: 'folder' as const, data: folder };
    }
    
    return null;
  }, []);

  return {
    // DnD Context props
    sensors,
    collisionDetection: smartCollisionDetection,
    
    // Event handlers
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    
    // Utility functions
    getItemsByContainer,
    getDragOverlay,
    
    // Animation config
    dropAnimationConfig,
    
    // Sorting strategies
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
  };
}; 