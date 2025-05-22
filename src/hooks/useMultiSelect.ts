import { useState, useCallback } from 'react';
import { Bookmark } from '@/types';

interface UseMultiSelectProps {
  visibleItems: Bookmark[]; // To determine which items are currently selectable for "select all"
}

export const useMultiSelect = ({ visibleItems }: UseMultiSelectProps) => {
  const [isCheckboxModeActive, setIsCheckboxModeActive] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggleCheckboxMode = useCallback(() => {
    setIsCheckboxModeActive(prev => {
      if (prev) { // Exiting checkbox mode
        setSelectedItemIds(new Set()); // Clear selection
      }
      return !prev;
    });
  }, []);

  const toggleSelectItem = useCallback((itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const selectAllVisibleLinks = useCallback(() => {
    const visibleLinkIds = visibleItems
      .filter(item => item.type === 'link' && !item.isArchived) // Only select active links
      .map(item => item.id);
    
    // If all visible links are already selected, deselect them. Otherwise, select them.
    const allCurrentlySelected = visibleLinkIds.length > 0 && visibleLinkIds.every(id => selectedItemIds.has(id));

    if (allCurrentlySelected) {
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        visibleLinkIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedItemIds(prev => new Set([...prev, ...visibleLinkIds]));
    }
  }, [visibleItems, selectedItemIds]);

  const deselectAllItems = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);
  
  const addItemsToSelection = useCallback((itemIdsToAdd: string[]) => {
    setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        itemIdsToAdd.forEach(id => newSet.add(id));
        return newSet;
    });
  }, []);

  const resetMultiSelect = useCallback(() => {
    setSelectedItemIds(new Set());
    setIsCheckboxModeActive(false);
  }, []);

  return {
    isCheckboxModeActive,
    selectedItemIds,
    toggleCheckboxMode,
    toggleSelectItem,
    selectAllVisibleLinks,
    deselectAllItems,
    addItemsToSelection,
    resetMultiSelect, // Useful for completing an action
  };
};