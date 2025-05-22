import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '@/types';
import {
  getAllBookmarksDB,
  addBookmarkDB,
  updateBookmarkDB,
  getBookmarkByUrlDB,
  deleteBookmarkDB,
  addMultipleBookmarksDB,
} from '@/lib/db';
import {
  extractDomain,
  extractPseudoTitleFromUrl,
  getAllDescendantIds,
  isValidHttpUrl,
} from '@/lib/bookmarkUtils';
import { fetchPageTitleWithProxy } from '@/lib/apiUtils';
import { parseBookmarksHTML } from '@/lib/importUtils';
import { checkAndPerformAutoGrouping } from '@/lib/autoGroupUtils';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { ArchiveThresholdKey, ARCHIVE_THRESHOLDS } from '@/types/viewTypes';

interface UseBookmarksProps {
  currentGroupId: string | null;
  isArchiveView: boolean;
  autoArchiveEnabled: boolean;
  autoArchiveThresholdKey: ArchiveThresholdKey;
  navigateToGroupId: (groupId: string | null) => void;
}

export const useBookmarks = ({
  currentGroupId,
  isArchiveView,
  autoArchiveEnabled,
  autoArchiveThresholdKey,
  navigateToGroupId,
}: UseBookmarksProps) => {
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [lastFinalizedLinkId, setLastFinalizedLinkId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    const loadingToast = showLoading("Loading items...");
    try {
      const storedBookmarks = await getAllBookmarksDB();
      setAllBookmarks(storedBookmarks);
      dismissToast(loadingToast);
      if (storedBookmarks.length > 0) showSuccess("Items loaded!");
    } catch (error) {
      dismissToast(loadingToast);
      showError("Failed to load items.");
      console.error("Error loading items from DB:", error);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const runAutoArchive = useCallback(async () => {
    if (!autoArchiveEnabled) return;

    const thresholdTime = Date.now() - ARCHIVE_THRESHOLDS[autoArchiveThresholdKey];
    let archivedCount = 0;
    
    let bookmarksToUpdateInDB: Bookmark[] = [];
    const nextAllBookmarks = allBookmarks.map(bm => {
      if (bm.type === 'link' && !bm.isArchived && bm.lastClickDate && bm.lastClickDate < thresholdTime) {
        const updatedBm = { ...bm, isArchived: true };
        bookmarksToUpdateInDB.push(updatedBm);
        archivedCount++;
        return updatedBm;
      }
      return bm;
    });

    if (archivedCount > 0) {
      try {
        for (const bmToArchive of bookmarksToUpdateInDB) {
          await updateBookmarkDB(bmToArchive);
        }
        setAllBookmarks(nextAllBookmarks); 
        showSuccess(`${archivedCount} item(s) auto-archived.`);
      } catch (error) {
        showError("Error during auto-archiving some items.");
        console.error("Auto-archive DB update failed:", error);
        loadBookmarks(); 
      }
    }
  }, [allBookmarks, autoArchiveEnabled, autoArchiveThresholdKey, loadBookmarks]);

  useEffect(() => {
    if (allBookmarks.length > 0) {
      runAutoArchive();
    }
  }, [autoArchiveEnabled, autoArchiveThresholdKey, allBookmarks, runAutoArchive]);

  useEffect(() => {
    if (!lastFinalizedLinkId) return;

    const newlyFinalizedLink = allBookmarks.find(bm => bm.id === lastFinalizedLinkId);
    if (!newlyFinalizedLink || newlyFinalizedLink.type !== 'link' || newlyFinalizedLink.isArchived) {
      setLastFinalizedLinkId(null);
      return;
    }

    const performGrouping = async () => {
      const { modifiedBookmarks, navigationTargetId } = await checkAndPerformAutoGrouping(
        newlyFinalizedLink,
        allBookmarks
      );
      setAllBookmarks(modifiedBookmarks);
      if (navigationTargetId) {
        navigateToGroupId(navigationTargetId);
      }
      setLastFinalizedLinkId(null);
    };

    performGrouping();
  }, [lastFinalizedLinkId, allBookmarks, navigateToGroupId]);

  const addPastedBookmarkOptimistic = useCallback(async (url: string): Promise<Bookmark | null> => {
    if (isArchiveView) {
      showError("Cannot add bookmarks directly to the archive.");
      return null;
    }
    if (!isValidHttpUrl(url)) {
      showError("Pasted text is not a valid URL.");
      return null;
    }

    const existingInDb = await getBookmarkByUrlDB(url);
    if (existingInDb && !existingInDb.isArchived && existingInDb.parentId === currentGroupId) {
      showError("This bookmark already exists in the current group.");
      return null;
    }
    if (existingInDb && !existingInDb.isArchived && existingInDb.parentId !== currentGroupId && existingInDb.type === 'link') {
      const domainOfExisting = extractDomain(existingInDb.url);
      const domainOfNew = extractDomain(url);
      if (domainOfExisting === domainOfNew) {
        showError("This exact bookmark URL already exists elsewhere (active).");
        return null;
      }
    }

    const newBookmarkId = crypto.randomUUID();
    const currentTime = Date.now();
    const tempVisualBookmark: Bookmark = {
      id: newBookmarkId,
      url,
      title: url, 
      clicks: 0,
      addDate: currentTime,
      lastClickDate: currentTime, 
      type: 'link',
      parentId: currentGroupId,
      isLoading: true, 
      isArchived: false,
      isPinned: false, // Default new bookmarks as not pinned
      dynamicParamKeys: [],
      status: 'unchecked', 
      lastCheckDate: null,
      offlineSince: null,
    };

    setAllBookmarks((prev) => [...prev, tempVisualBookmark]);
    
    fetchPageTitleWithProxy(url, newBookmarkId).then(async ({ title: fetchedTitle, id: fetchedId }) => {
      const currentBookmarkState = allBookmarks.find(bm => bm.id === fetchedId) || tempVisualBookmark;
      const finalBookmarkForDB: Bookmark = {
        ...currentBookmarkState,
        id: fetchedId,        
        title: fetchedTitle,  
        isLoading: false, 
      };

      try {
        await addBookmarkDB(finalBookmarkForDB); 
        setAllBookmarks(prev => prev.map(bm => bm.id === fetchedId ? finalBookmarkForDB : bm));
        setLastFinalizedLinkId(finalBookmarkForDB.id);
      } catch (dbError) {
        showError(`Failed to save '${finalBookmarkForDB.title.substring(0,20)}...' to storage.`);
        console.error("DB error after title fetch:", dbError);
        setAllBookmarks(prev => prev.filter(bm => bm.id !== finalBookmarkForDB.id));
      }
    }).catch(error => {
        console.error("Error in title fetching promise chain:", error);
        setAllBookmarks(prev => prev.map(bm => bm.id === newBookmarkId ? {...bm, isLoading: false, title: extractPseudoTitleFromUrl(url) } : bm));
    });

    return tempVisualBookmark; 
  }, [isArchiveView, currentGroupId, allBookmarks, navigateToGroupId]);


  const updateBookmarkInList = useCallback(async (updatedBookmark: Bookmark, showToast: boolean = true) => {
    try {
      await updateBookmarkDB(updatedBookmark);
      setAllBookmarks(prev => prev.map(bm => bm.id === updatedBookmark.id ? updatedBookmark : bm));
      if (showToast) showSuccess(`'${updatedBookmark.title.substring(0,15)}...' updated.`);
    } catch (error) {
      showError("Failed to update item in storage.");
      console.error("Error updating item in DB:", error);
      loadBookmarks();
    }
  }, [loadBookmarks]);
  
  const updateBookmarkTitleInList = useCallback((id: string, newTitle: string) => {
    const item = allBookmarks.find(bm => bm.id === id);
    if (item) {
      updateBookmarkInList({ ...item, title: newTitle });
    }
  }, [allBookmarks, updateBookmarkInList]);

  const toggleDynamicParamInList = useCallback((bookmarkId: string, paramKey: string) => {
    const item = allBookmarks.find(bm => bm.id === bookmarkId);
    if (item) {
      const currentDynamicKeys = item.dynamicParamKeys || [];
      const isDynamic = currentDynamicKeys.includes(paramKey);
      const newDynamicKeys = isDynamic
        ? currentDynamicKeys.filter(k => k !== paramKey)
        : [...currentDynamicKeys, paramKey];
      updateBookmarkInList({ ...item, dynamicParamKeys: newDynamicKeys }, false); 
      const action = newDynamicKeys.includes(paramKey) ? "dynamic" : "static";
      showSuccess(`Parameter '${paramKey}' is now ${action}.`);
    }
  }, [allBookmarks, updateBookmarkInList]);

  const moveItemToGroupInList = useCallback(async (itemId: string, newParentId: string) => {
    if (isArchiveView) {
      showError("Cannot move items from the archive directly. Unarchive first.");
      return;
    }
    const item = allBookmarks.find(bm => bm.id === itemId);
    if (item) {
      await updateBookmarkInList({ ...item, parentId: newParentId });
    }
  }, [allBookmarks, updateBookmarkInList, isArchiveView]);

  const removeItemFromList = useCallback(async (itemToRemove: Bookmark, options?: { deleteContents?: boolean }) => {
    if (itemToRemove.isArchived && itemToRemove.type === 'link') {
      try {
        await deleteBookmarkDB(itemToRemove.id);
        setAllBookmarks((prev) => prev.filter((bm) => bm.id !== itemToRemove.id));
        showSuccess(`Archived link '${itemToRemove.title.substring(0,15)}...' permanently deleted.`);
      } catch (error) {
        showError("Failed to delete archived link from storage.");
      }
      return;
    }

    if (itemToRemove.type === 'group' && options?.deleteContents) {
      const loadingToast = showLoading(`Deleting group '${itemToRemove.title.substring(0,15)}...' and contents...`);
      const descendantIds = getAllDescendantIds(itemToRemove.id, allBookmarks);
      const allIdsToDelete = [itemToRemove.id, ...descendantIds];
      try {
        for (const id of allIdsToDelete) await deleteBookmarkDB(id);
        setAllBookmarks(prev => prev.filter(bm => !allIdsToDelete.includes(bm.id)));
        dismissToast(loadingToast);
        showSuccess(`Group '${itemToRemove.title.substring(0,15)}...' and contents deleted.`);
      } catch (error) {
        dismissToast(loadingToast);
        showError("Failed to delete group and contents.");
      }
    } else if (itemToRemove.type === 'group') {
      const childrenOfGroup = allBookmarks.filter(b => b.parentId === itemToRemove.id);
      const updatedChildren = childrenOfGroup.map(child => ({ ...child, parentId: itemToRemove.parentId }));
      try {
        await Promise.all(updatedChildren.map(child => updateBookmarkDB(child)));
        await deleteBookmarkDB(itemToRemove.id);
        setAllBookmarks(prev => {
          const withoutGroup = prev.filter(b => b.id !== itemToRemove.id);
          return withoutGroup.map(b => updatedChildren.find(uc => uc.id === b.id) || b);
        });
        showSuccess(`Group '${itemToRemove.title.substring(0,15)}...' removed, contents moved up.`);
      } catch (error) {
        showError("Failed to remove group or update children.");
      }
    } else { 
      try {
        await deleteBookmarkDB(itemToRemove.id);
        setAllBookmarks((prev) => prev.filter((bm) => bm.id !== itemToRemove.id));
        showSuccess(`Link '${itemToRemove.title.substring(0,15)}...' removed.`);
      } catch (error) {
        showError("Failed to remove link from storage.");
      }
    }
  }, [allBookmarks]);

  const createGroupFromLinkInList = useCallback(async (linkId: string, groupName: string) => {
    if (isArchiveView) return;
    const link = allBookmarks.find(b => b.id === linkId);
    if (!link) return;

    const newGroupId = crypto.randomUUID();
    const newGroup: Bookmark = {
      id: newGroupId, title: groupName, type: 'group', url: `group:${newGroupId}`,
      clicks: 0, addDate: Date.now(), lastClickDate: null,
      parentId: link.parentId, isLoading: false, isArchived: false, isPinned: false, dynamicParamKeys: [],
      status: 'unchecked', lastCheckDate: null, offlineSince: null,
    };
    const updatedLink: Bookmark = { ...link, parentId: newGroupId };
    try {
      await addBookmarkDB(newGroup);
      await updateBookmarkDB(updatedLink);
      setAllBookmarks(prev => [...prev.filter(b => b.id !== linkId), newGroup, updatedLink]);
      showSuccess(`Group '${newGroup.title}' created with link '${link.title.substring(0,10)}...'.`);
      navigateToGroupId(newGroupId);
    } catch (error) {
      showError("Failed to create group or move link.");
    }
  }, [allBookmarks, isArchiveView, navigateToGroupId]);

  const exportBookmarks = useCallback(async () => {
    const exportData = allBookmarks.map(bm => ({
      ...bm,
      dynamicParamKeys: bm.dynamicParamKeys || [],
      isArchived: bm.isArchived || false,
      isPinned: bm.isPinned || false, // Include isPinned in export
      status: bm.status || 'unchecked',
      lastCheckDate: bm.lastCheckDate === undefined ? null : bm.lastCheckDate,
      offlineSince: bm.offlineSince === undefined ? null : bm.offlineSince,
      isLoading: undefined,
    }));
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "bookmarks_export.json";
    link.click();
    showSuccess("All items exported!");
  }, [allBookmarks]);

  const importBookmarksFromFile = useCallback(async (file: File) => {
    const loadingToastId = showLoading("Importing items...");
    let bookmarksToImport: Partial<Bookmark>[] = [];
    try {
      const fileText = await file.text();
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json')) {
        bookmarksToImport = JSON.parse(fileText).map((item: any) => ({ 
          id: item.id || crypto.randomUUID(), url: item.url || '', title: item.title || extractPseudoTitleFromUrl(item.url || ''),
          clicks: Number(item.clicks) || 0, addDate: Number(item.addDate) || Date.now(),
          lastClickDate: item.lastClickDate === undefined || item.lastClickDate === null ? null : Number(item.lastClickDate),
          type: item.type === 'group' ? 'group' : 'link', parentId: item.parentId === undefined ? null : item.parentId,
          isArchived: item.isArchived || false, 
          isPinned: item.isPinned || false, // Handle isPinned for imports
          dynamicParamKeys: Array.isArray(item.dynamicParamKeys) ? item.dynamicParamKeys : [],
          status: item.status || 'unchecked', lastCheckDate: item.lastCheckDate === undefined ? null : Number(item.lastCheckDate),
          offlineSince: item.offlineSince === undefined ? null : Number(item.offlineSince),
        }));
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        bookmarksToImport = parseBookmarksHTML(fileText); // parseBookmarksHTML already defaults isPinned to false
      } else {
        throw new Error("Unsupported file type.");
      }
      if (bookmarksToImport.length > 0) {
        const { added, skipped } = await addMultipleBookmarksDB(bookmarksToImport);
        await loadBookmarks();
        showSuccess(`Import complete! Added: ${added}, Skipped: ${skipped}.`);
      } else {
        showError("No items found in file to import.");
      }
    } catch (error) {
      showError(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      dismissToast(loadingToastId);
    }
  }, [loadBookmarks]);

  const removeAllDeadLinksFromList = useCallback(async () => {
    const deadLinks = allBookmarks.filter(bm =>
      bm.type === 'link' && !bm.isArchived && bm.status === 'offline' &&
      bm.offlineSince && (Date.now() - bm.offlineSince > (7 * 24 * 60 * 60 * 1000)) 
    );
    if (deadLinks.length === 0) {
      showSuccess("No dead links found."); return;
    }
    if (!window.confirm(`Remove ${deadLinks.length} dead link(s)?`)) return;

    const loadingToast = showLoading(`Removing ${deadLinks.length} dead links...`);
    let removedCount = 0;
    for (const link of deadLinks) {
      try {
        await deleteBookmarkDB(link.id);
        removedCount++;
      } catch (error) { console.error(`Failed to delete ${link.id}`); }
    }
    setAllBookmarks(prev => prev.filter(bm => !deadLinks.some(dl => dl.id === bm.id)));
    dismissToast(loadingToast);
    showSuccess(`Removed ${removedCount} dead links.`);
  }, [allBookmarks]);
  
  const updateClickedBookmark = useCallback((item: Bookmark) => {
    const currentTime = Date.now();
    let updatedItem: Bookmark;
    if (item.isArchived) {
      updatedItem = { ...item, clicks: item.clicks + 1, lastClickDate: currentTime, isArchived: false };
      updateBookmarkInList(updatedItem, false); 
      showSuccess(`'${updatedItem.title.substring(0,15)}...' unarchived.`);
    } else {
      updatedItem = { ...item, clicks: item.clicks + 1, lastClickDate: currentTime };
      updateBookmarkInList(updatedItem, false); 
    }
    return updatedItem; 
  }, [updateBookmarkInList]);

  const togglePinBookmarkInList = useCallback(async (bookmarkId: string) => {
    const item = allBookmarks.find(bm => bm.id === bookmarkId);
    if (item) {
      if (item.isArchived) {
        showError("Cannot pin an archived item. Unarchive it first.");
        return;
      }
      const updatedItem = { ...item, isPinned: !item.isPinned };
      await updateBookmarkInList(updatedItem, false);
      showSuccess(`Item '${item.title.substring(0,15)}...' ${updatedItem.isPinned ? 'pinned' : 'unpinned'}.`);
    }
  }, [allBookmarks, updateBookmarkInList]);


  return {
    allBookmarks,
    setAllBookmarks, 
    loadBookmarks,
    addPastedBookmarkOptimistic,
    updateBookmarkTitleInList,
    toggleDynamicParamInList,
    moveItemToGroupInList,
    removeItemFromList,
    createGroupFromLinkInList,
    exportBookmarks,
    importBookmarksFromFile,
    removeAllDeadLinksFromList,
    updateClickedBookmark, 
    updateBookmarkInList, 
    togglePinBookmarkInList, // Expose new function
  };
};