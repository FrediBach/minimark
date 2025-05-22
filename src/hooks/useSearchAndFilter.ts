import { useState, useMemo } from 'react';
import { Bookmark } from '@/types';
import { SortKey, GroupLinkDisplayOrder } from '@/types/viewTypes';
import Fuse from 'fuse.js';

interface UseSearchAndFilterProps {
  allBookmarks: Bookmark[];
  currentGroupId: string | null;
  isArchiveView: boolean;
  isFuzzySearchEnabled: boolean;
  sortKey: SortKey;
  groupLinkDisplayOrder: GroupLinkDisplayOrder;
}

export const useSearchAndFilter = ({
  allBookmarks,
  currentGroupId,
  isArchiveView,
  isFuzzySearchEnabled,
  sortKey,
  groupLinkDisplayOrder,
}: UseSearchAndFilterProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const baseCurrentViewItems = useMemo(() => {
    return allBookmarks.filter(item => {
      if (isArchiveView) {
        // Pinned items are not shown in archive view directly
        return item.isArchived === true && item.type === 'link';
      }
      // For non-archive view, filter by parentId and not archived
      return item.isArchived === false && item.parentId === currentGroupId;
    });
  }, [allBookmarks, currentGroupId, isArchiveView]);

  const fuseInstance = useMemo(() => {
    if (!isFuzzySearchEnabled) return null;
    return new Fuse(baseCurrentViewItems, {
      keys: ['title', 'url'],
      threshold: 0.4,
      minMatchCharLength: 2,
      includeScore: false,
    });
  }, [baseCurrentViewItems, isFuzzySearchEnabled]);

  const filteredCurrentViewItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return baseCurrentViewItems;
    }
    if (isFuzzySearchEnabled && fuseInstance) {
      const results = fuseInstance.search(searchTerm);
      return results.map(result => result.item);
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      return baseCurrentViewItems.filter(
        (item) =>
          item.title.toLowerCase().includes(lowercasedSearchTerm) ||
          (item.type === 'link' && item.url.toLowerCase().includes(lowercasedSearchTerm))
      );
    }
  }, [baseCurrentViewItems, searchTerm, isFuzzySearchEnabled, fuseInstance]);

  const sortedAndFilteredItems = useMemo(() => {
    let itemsToProcess = [...filteredCurrentViewItems];

    // Separate pinned items (only if not in archive view)
    const pinnedItems = isArchiveView ? [] : itemsToProcess.filter(item => item.isPinned);
    const unpinnedItems = isArchiveView ? itemsToProcess : itemsToProcess.filter(item => !item.isPinned);

    // Sort pinned items by addDate (newest first) or any other desired default for pinned items
    pinnedItems.sort((a, b) => (b.addDate || 0) - (a.addDate || 0));
    
    const applyPrimarySort = (arr: Bookmark[]) => {
      const sortedArr = [...arr];
      switch (sortKey) {
        case "addDateDesc": sortedArr.sort((a, b) => (b.addDate || 0) - (a.addDate || 0)); break;
        case "addDateAsc": sortedArr.sort((a, b) => (a.addDate || 0) - (b.addDate || 0)); break;
        case "lastClickDateDesc": sortedArr.sort((a, b) => (b.lastClickDate || -Infinity) - (a.lastClickDate || -Infinity)); break;
        case "lastClickDateAsc": sortedArr.sort((a, b) => (a.lastClickDate === null ? -Infinity : a.lastClickDate) - (b.lastClickDate === null ? -Infinity : b.lastClickDate)); break;
        case "clicksDesc": sortedArr.sort((a, b) => b.clicks - a.clicks); break;
        case "clicksAsc": sortedArr.sort((a, b) => a.clicks - b.clicks); break;
        case "titleAsc": sortedArr.sort((a, b) => a.title.localeCompare(b.title)); break;
        case "titleDesc": sortedArr.sort((a, b) => b.title.localeCompare(a.title)); break;
        case "default":
        default: sortedArr.sort((a, b) => (a.addDate || 0) - (b.addDate || 0)); break;
      }
      return sortedArr;
    };

    let sortedUnpinnedItems: Bookmark[];
    if (groupLinkDisplayOrder === 'mixed' || isArchiveView) { // Archive view doesn't have groups
      sortedUnpinnedItems = applyPrimarySort(unpinnedItems);
    } else {
      const unpinnedGroups = unpinnedItems.filter(item => item.type === 'group');
      const unpinnedLinks = unpinnedItems.filter(item => item.type === 'link');
      const sortedUnpinnedGroups = applyPrimarySort(unpinnedGroups);
      const sortedUnpinnedLinks = applyPrimarySort(unpinnedLinks);
      sortedUnpinnedItems = groupLinkDisplayOrder === 'groupsFirst' 
        ? [...sortedUnpinnedGroups, ...sortedUnpinnedLinks] 
        : [...sortedUnpinnedLinks, ...sortedUnpinnedGroups];
    }
    
    return [...pinnedItems, ...sortedUnpinnedItems];
  }, [filteredCurrentViewItems, sortKey, groupLinkDisplayOrder, isArchiveView]);

  const clearSearchTerm = () => {
    setSearchTerm("");
  };

  return {
    searchTerm,
    setSearchTerm,
    clearSearchTerm,
    baseCurrentViewItems, 
    sortedAndFilteredItems,
  };
};