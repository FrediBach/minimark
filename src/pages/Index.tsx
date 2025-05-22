import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Bookmark } from '@/types';
import { SortKey, ItemDisplayMode, GroupLinkDisplayOrder, ArchiveThresholdKey, ARCHIVE_THRESHOLDS } from '@/types/viewTypes';
import {
  MIN_WORD_LENGTH,
  MAX_WORDS_IN_DIALOG,
  SEPARATOR_DISPLAY_THRESHOLD,
  MIN_ITEMS_FOR_OWN_SEPARATOR,
} from '@/config/constants';

import BookmarkItem from '@/components/BookmarkItem';
import HelpDialog from '@/components/HelpDialog';
import GroupNameDialog from '@/components/GroupNameDialog'; 
import WordFrequencyDialog from '@/components/WordFrequencyDialog'; 
import LinkMetadataDialog from '@/components/LinkMetadataDialog'; 
import SelectionRectangle from '@/components/SelectionRectangle'; // New component
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { 
  getGroupSeparatorInfo,
} from '@/lib/bookmarkUtils'; 

import { useNavigation } from '@/hooks/useNavigation';
import { useViewSettings } from '@/hooks/useViewSettings';
import { useBookmarks } from '@/hooks/useBookmarks'; 
import { useLinkChecker } from '@/hooks/useLinkChecker';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { useSearchAndFilter } from '@/hooks/useSearchAndFilter';
import { useDialogManager, WordFrequencyStat } from '@/hooks/useDialogManager';

import { Settings2, X, Search, CheckSquare, Trash2, FolderPlus, FolderSymlink, ListChecks, CircleSlash, Replace as ReplaceIcon, Tags, Archive, ArchiveRestore, WifiOff, Brain } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils'; 

const Index = () => {
  const [userOnlineStatus, setUserOnlineStatus] = useState(navigator.onLine);

  const {
    currentGroupId,
    isArchiveView,
    handleNavigateToGroup,
    getBreadcrumbs, 
    navigate,
  } = useNavigation();

  const {
    sortKey, setSortKey,
    truncationLength, setTruncationLength,
    itemDisplayMode, setItemDisplayMode,
    groupLinkDisplayOrder, setGroupLinkDisplayOrder,
    isFuzzySearchEnabled, setIsFuzzySearchEnabled,
    autoArchiveEnabled, setAutoArchiveEnabled,
    autoArchiveThresholdKey, setAutoArchiveThresholdKey,
    itemWidthClass,
  } = useViewSettings();
  
  const {
    allBookmarks,
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
    togglePinBookmarkInList,
  } = useBookmarks({
    currentGroupId,
    isArchiveView,
    autoArchiveEnabled,
    autoArchiveThresholdKey,
    navigateToGroupId: handleNavigateToGroup,
  });
  
  const { 
    initiateLinkCheck, 
    currentlyCheckingId 
  } = useLinkChecker({
    allBookmarks,
    updateBookmarkInList,
    userOnlineStatus,
  });

  const {
    searchTerm,
    setSearchTerm,
    clearSearchTerm,
    baseCurrentViewItems, 
    sortedAndFilteredItems,
  } = useSearchAndFilter({
    allBookmarks,
    currentGroupId,
    isArchiveView,
    isFuzzySearchEnabled,
    sortKey,
    groupLinkDisplayOrder,
  });

  const {
    isCheckboxModeActive,
    selectedItemIds,
    toggleCheckboxMode,
    toggleSelectItem,
    selectAllVisibleLinks,
    addItemsToSelection,
    resetMultiSelect,
  } = useMultiSelect({ visibleItems: sortedAndFilteredItems });

  const {
    isMetadataDialogOpen, selectedBookmarkForMetadata, openMetadataDialog, closeMetadataDialog,
    isGroupNameDialogOpen, groupNameDialogProps, openGroupNameDialog, closeGroupNameDialog,
    isWordFrequencyDialogOpen, wordStatsForDialog, openWordFrequencyDialog, closeWordFrequencyDialog,
  } = useDialogManager();

  const breadcrumbs = useMemo(() => getBreadcrumbs(allBookmarks), [getBreadcrumbs, allBookmarks]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReplaceModeActive, setIsReplaceModeActive] = useState(false);
  const [replaceTerm, setReplaceTerm] = useState("");

  // State for drag selection
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number; visible: boolean } | null>(null);
  const bookmarkItemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const mainContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleOnline = () => setUserOnlineStatus(true);
    const handleOffline = () => setUserOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleForceRecheck = useCallback(async (itemId: string) => {
    const itemToRecheck = allBookmarks.find(bm => bm.id === itemId);
    if (itemToRecheck && itemToRecheck.type === 'link') {
      initiateLinkCheck(itemToRecheck, true);
    }
  }, [allBookmarks, initiateLinkCheck]);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (isArchiveView) return; 
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      const newBookmark = await addPastedBookmarkOptimistic(pastedText);
      if (newBookmark) {
        const statusForCheck: Bookmark['status'] = userOnlineStatus ? 'checking' : 'unchecked';
        const bookmarkForCheck = { ...newBookmark, status: statusForCheck, isLoading: userOnlineStatus };
        updateBookmarkInList(bookmarkForCheck, false); 
        if (userOnlineStatus) {
            initiateLinkCheck(bookmarkForCheck);
        }
      }
    }
  }, [addPastedBookmarkOptimistic, isArchiveView, userOnlineStatus, initiateLinkCheck, updateBookmarkInList]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleItemClick = async (item: Bookmark, _constructedUrl?: string) => {
    if (isCheckboxModeActive && item.type === 'link') {
      toggleSelectItem(item.id); 
      return;
    }
    if (item.type === 'group') { 
      handleNavigateToGroup(item.id);
      const group = allBookmarks.find(b => b.id === item.id);
      if (group) updateClickedBookmark(group); 
      return;
    }
    updateClickedBookmark(item);
  };
  
  const handleActualCreateGroupFromLink = (linkId: string) => {
    if (isArchiveView) return;
    const link = allBookmarks.find(b => b.id === linkId);
    if (!link) return;
    openGroupNameDialog(
      async (groupName: string) => {
        await createGroupFromLinkInList(linkId, groupName);
      },
      "Create Group from Link",
      `Enter a name for the new group that will contain "${link.title.substring(0,30)}...".`
    );
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearchAndReplace = () => {
    clearSearchTerm(); 
    if (isReplaceModeActive) {
      setIsReplaceModeActive(false);
      setReplaceTerm("");
    }
  };

  const onFileSelectedForImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importBookmarksFromFile(file);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };
  
  const handleDeleteSelected = async () => {
    if (selectedItemIds.size === 0) { showError("No items selected."); return; }
    const itemsToDeleteArray = Array.from(selectedItemIds);
    const loadingToast = showLoading(`Deleting ${itemsToDeleteArray.length} items...`);
    let successCount = 0;
    for (const id of itemsToDeleteArray) {
        const item = allBookmarks.find(bm => bm.id === id);
        if (item) {
            await removeItemFromList(item); 
            successCount++;
        }
    }
    dismissToast(loadingToast);
    showSuccess(`${successCount} items deleted.`);
    resetMultiSelect(); 
  };

  const handleMoveSelectedToNewGroup = () => {
    if (isArchiveView || selectedItemIds.size === 0) {
      showError(isArchiveView ? "Cannot move from archive." : "No items selected."); return;
    }
    openGroupNameDialog(
      async (groupName: string) => {
        const newGroupId = crypto.randomUUID(); 
        const itemsToMove = Array.from(selectedItemIds);
        const loadingToast = showLoading(`Moving ${itemsToMove.length} items...`);
        
        const tempNewGroup: Bookmark = {
          id: newGroupId, title: groupName, type: 'group', url: `group:${newGroupId}`,
          clicks: 0, addDate: Date.now(), parentId: currentGroupId, isLoading: false, isArchived: false,
          isPinned: false, dynamicParamKeys: [], status: 'unchecked', lastClickDate: null, lastCheckDate: null, offlineSince: null,
        };
        try {
          await updateBookmarkInList(tempNewGroup, false); 
          
          for (const itemId of itemsToMove) {
              await moveItemToGroupInList(itemId, newGroupId);
          }
          dismissToast(loadingToast);
          showSuccess(`${itemsToMove.length} items moved.`);
          resetMultiSelect(); 
          handleNavigateToGroup(newGroupId);
        } catch (e) {
          dismissToast(loadingToast);
          showError("Failed to move items to new group.");
        }
      },
      "Move to New Group",
      `Enter a name for the new group to move ${selectedItemIds.size} item(s) into.`
    );
  };
  
  const handleMoveSelectedToExistingGroup = async (targetGroupId: string) => {
    if (isArchiveView || selectedItemIds.size === 0) {
      showError(isArchiveView ? "Cannot move from archive." : "No items selected."); return;
    }
    const targetGroup = allBookmarks.find(bm => bm.id === targetGroupId && bm.type === 'group');
    if (!targetGroup) { showError("Target group not found."); return; }
    const itemsToMove = Array.from(selectedItemIds);
    const loadingToast = showLoading(`Moving ${itemsToMove.length} items...`);
    for (const itemId of itemsToMove) {
        await moveItemToGroupInList(itemId, targetGroupId);
    }
    dismissToast(loadingToast);
    showSuccess(`${itemsToMove.length} items moved.`);
    resetMultiSelect(); 
  };

  const handleToggleReplaceMode = () => setIsReplaceModeActive(prev => !prev && setReplaceTerm(""));
  const handleReplaceAll = async () => {
    if (!searchTerm.trim()) { showError("Search term is empty."); return; }
    const itemsToUpdate = sortedAndFilteredItems.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (itemsToUpdate.length === 0) { showError("No matching titles."); return; }
    const loadingToast = showLoading(`Replacing in ${itemsToUpdate.length} titles...`);
    let successCount = 0;
    for (const item of itemsToUpdate) {
      const newTitle = item.title.replace(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceTerm);
      if (newTitle !== item.title) {
        await updateBookmarkTitleInList(item.id, newTitle); successCount++;
      }
    }
    dismissToast(loadingToast);
    showSuccess(successCount > 0 ? `${successCount} titles updated.` : "No titles changed.");
  };

  const calculateAndShowWordFrequencyDialog = () => {
    const wordMap: Map<string, number> = new Map();
    sortedAndFilteredItems.forEach(item => {
      item.title.toLowerCase().split(/\W+/).filter(word => word.length >= MIN_WORD_LENGTH)
        .forEach(word => wordMap.set(word, (wordMap.get(word) || 0) + 1));
    });
    const sortedWordStats: WordFrequencyStat[] = Array.from(wordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, MAX_WORDS_IN_DIALOG);
    openWordFrequencyDialog(sortedWordStats);
  };

  const handleApplyWordFrequencySelection = (selectedWordsFromDialog: string[]) => {
    if (selectedWordsFromDialog.length === 0) return;
    const idsToAdd: string[] = [];
    let itemsAddedCount = 0;
    sortedAndFilteredItems.forEach(item => {
      if (item.type === 'link' && selectedWordsFromDialog.some(selWord => item.title.toLowerCase().includes(selWord.toLowerCase()))) {
        if (!selectedItemIds.has(item.id)) { 
            idsToAdd.push(item.id);
            itemsAddedCount++;
        }
      }
    });
    if (idsToAdd.length > 0) {
        addItemsToSelection(idsToAdd); 
    }
    showSuccess(itemsAddedCount > 0 ? `${itemsAddedCount} items added to selection.` : "No new items matched.");
  };

  const registerBookmarkItemRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      bookmarkItemRefs.current.set(id, element);
    } else {
      bookmarkItemRefs.current.delete(id);
    }
  }, []);

  const handleMouseDownOnContainer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCheckboxModeActive || event.button !== 0 || event.target !== mainContentRef.current) {
      // Only activate on left-click directly on the container when checkbox mode is on
      return;
    }
    event.preventDefault();
    setIsDraggingSelection(true);
    setDragStartPoint({ x: event.clientX, y: event.clientY });
    setSelectionRect({ x: event.clientX, y: event.clientY, width: 0, height: 0, visible: true });
  };

  const handleMouseMoveOnContainer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSelection || !dragStartPoint) return;
    event.preventDefault();
    const currentX = event.clientX;
    const currentY = event.clientY;

    const x = Math.min(dragStartPoint.x, currentX);
    const y = Math.min(dragStartPoint.y, currentY);
    const width = Math.abs(dragStartPoint.x - currentX);
    const height = Math.abs(dragStartPoint.y - currentY);
    setSelectionRect({ x, y, width, height, visible: true });
  };

  const handleMouseUpOnContainer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSelection || !selectionRect) return;
    event.preventDefault();
    setIsDraggingSelection(false);
    setDragStartPoint(null);
    setSelectionRect(prev => prev ? { ...prev, visible: false } : null);

    const itemsToSelectById: string[] = [];
    bookmarkItemRefs.current.forEach((element, id) => {
      const item = sortedAndFilteredItems.find(bm => bm.id === id);
      if (element && item && item.type === 'link') { // Only select links
        const itemRect = element.getBoundingClientRect();
        const intersects =
          itemRect.left < selectionRect.x + selectionRect.width &&
          itemRect.left + itemRect.width > selectionRect.x &&
          itemRect.top < selectionRect.y + selectionRect.height &&
          itemRect.top + itemRect.height > selectionRect.y;

        if (intersects) {
          itemsToSelectById.push(id);
        }
      }
    });

    if (itemsToSelectById.length > 0) {
      addItemsToSelection(itemsToSelectById);
    }
  };


  const displayModeOptions: { value: ItemDisplayMode; label: string; titleLengthSubMenu?: boolean }[] = [
    { value: "dynamic", label: "Dynamic Width", titleLengthSubMenu: true }, { value: "s", label: "Small (Fixed)" },
    { value: "m", label: "Medium (Fixed)" }, { value: "l", label: "Large (Fixed)" }, { value: "xl", label: "X-Large (Fixed)" },
  ];
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "default", label: "Default (Oldest First)" }, { key: "addDateDesc", label: "Date Added (Newest First)" },
    { key: "addDateAsc", label: "Date Added (Oldest First)" }, { key: "lastClickDateDesc", label: "Last Opened (Most Recent)" },
    { key: "lastClickDateAsc", label: "Last Opened (Least Recent)" }, { key: "clicksDesc", label: "Clicks (Most First)" },
    { key: "clicksAsc", label: "Clicks (Least First)" }, { key: "titleAsc", label: "Title (A-Z)" }, { key: "titleDesc", label: "Title (Z-A)" },
  ];
  const groupLinkDisplayOptions: { value: GroupLinkDisplayOrder; label: string }[] = [
    { value: "mixed", label: "Mixed (Default)" }, { value: "groupsFirst", label: "Groups First" }, { value: "linksFirst", label: "Links First" },
  ];
  const truncationOptions = [
    { valueStr: "10", label: "10 Chars", numericValue: 10 }, { valueStr: "20", label: "20 Chars", numericValue: 20 },
    { valueStr: "30", label: "30 Chars", numericValue: 30 }, { valueStr: "50", label: "50 Chars", numericValue: 50 },
    { valueStr: "off", label: "Off", numericValue: Infinity },
  ];
  const archiveThresholdOptions: { key: ArchiveThresholdKey; label: string }[] = Object.entries(ARCHIVE_THRESHOLDS).map(([key, val]) => {
      const num = val / (30 * 24 * 60 * 60 * 1000); // approx months
      if (num < 12) return { key: key as ArchiveThresholdKey, label: `${num} Month${num > 1 ? 's' : ''}`};
      const years = Math.floor(num/12);
      return { key: key as ArchiveThresholdKey, label: `${years} Year${years > 1 ? 's' : ''}`};
  });
  archiveThresholdOptions.sort((a,b) => ARCHIVE_THRESHOLDS[a.key] - ARCHIVE_THRESHOLDS[b.key]);


  const existingGroupsInView = useMemo(() => baseCurrentViewItems.filter(item => item.type === 'group' && !item.isArchived), [baseCurrentViewItems]);

  const renderItemsWithSeparators = () => {
    const elements: JSX.Element[] = [];
    if (sortedAndFilteredItems.length === 0 && searchTerm.trim()) return <span className="text-gray-500 italic ml-1 text-base w-full">No matching items.</span>;
    if (sortedAndFilteredItems.length === 0) return <span className="text-gray-500 italic ml-1 text-base w-full">{isArchiveView ? "Archive empty." : (baseCurrentViewItems.length === 0 && !currentGroupId ? "Paste URL to start!" : "Group empty.")}</span>;
    
    const pinnedItems = sortedAndFilteredItems.filter(item => item.isPinned && !item.isArchived);
    const unpinnedItemsToRender = sortedAndFilteredItems.filter(item => !item.isPinned || item.isArchived);

    if (pinnedItems.length > 0) {
      elements.push(<div key="pinned-separator" className={cn("w-full mt-6 mb-3 py-1 text-sm font-semibold text-yellow-700 dark:text-yellow-500", itemDisplayMode === 'dynamic' ? 'border-b border-yellow-400 dark:border-yellow-600' : 'pl-1')}>Pinned Items</div>);
      pinnedItems.forEach((item, index) => {
        elements.push(<React.Fragment key={item.id}><BookmarkItem item={item} siblingItems={baseCurrentViewItems} onItemClick={handleItemClick} onUpdateTitle={updateBookmarkTitleInList} onRemoveItem={removeItemFromList} onCreateGroupFromLink={handleActualCreateGroupFromLink} onToggleDynamicParam={toggleDynamicParamInList} onMoveItemToGroup={moveItemToGroupInList} onForceRecheck={handleForceRecheck} onViewDetails={openMetadataDialog} onTogglePinItem={togglePinBookmarkInList} truncationLength={itemDisplayMode === 'dynamic' ? truncationLength : Infinity} isCheckboxModeActive={isCheckboxModeActive && !isArchiveView} isSelected={selectedItemIds.has(item.id)} onToggleSelectItem={toggleSelectItem} searchTermForHighlight={isReplaceModeActive ? searchTerm : ""} itemWidthClass={itemWidthClass} currentlyCheckingId={currentlyCheckingId} registerRef={registerBookmarkItemRef} />{itemDisplayMode === 'dynamic' && index < pinnedItems.length - 1 && (<>, </>)}</React.Fragment>);
      });
    }
    
    if (unpinnedItemsToRender.length <= SEPARATOR_DISPLAY_THRESHOLD && unpinnedItemsToRender.length > 0) {
      if (pinnedItems.length > 0 && unpinnedItemsToRender.length > 0) {
         elements.push(<Separator key="pinned-unpinned-sep" className="my-4 border-dashed" />);
      }
      unpinnedItemsToRender.forEach((item, index) => {
        elements.push(<React.Fragment key={item.id}><BookmarkItem item={item} siblingItems={baseCurrentViewItems} onItemClick={handleItemClick} onUpdateTitle={updateBookmarkTitleInList} onRemoveItem={removeItemFromList} onCreateGroupFromLink={handleActualCreateGroupFromLink} onToggleDynamicParam={toggleDynamicParamInList} onMoveItemToGroup={moveItemToGroupInList} onForceRecheck={handleForceRecheck} onViewDetails={openMetadataDialog} onTogglePinItem={togglePinBookmarkInList} truncationLength={itemDisplayMode === 'dynamic' ? truncationLength : Infinity} isCheckboxModeActive={isCheckboxModeActive && !isArchiveView} isSelected={selectedItemIds.has(item.id)} onToggleSelectItem={toggleSelectItem} searchTermForHighlight={isReplaceModeActive ? searchTerm : ""} itemWidthClass={itemWidthClass} currentlyCheckingId={currentlyCheckingId} registerRef={registerBookmarkItemRef} />{itemDisplayMode === 'dynamic' && index < unpinnedItemsToRender.length - 1 && (<>, </>)}</React.Fragment>);
      });
      return elements;
    }
    
    if (unpinnedItemsToRender.length === 0) return elements;

    if (pinnedItems.length > 0 && unpinnedItemsToRender.length > 0) {
       elements.push(<Separator key="pinned-unpinned-sep-main" className="my-4 border-dashed" />);
    }

    type Chunk = { key: string; label: string; items: Bookmark[] };
    const initialChunks: Chunk[] = [];
    if (unpinnedItemsToRender.length > 0) {
      let currentChunkItems: Bookmark[] = []; let currentKey: string | null = null; let currentLabel: string | null = null;
      unpinnedItemsToRender.forEach((item) => {
        const { key: itemKey, label: itemLabel } = getGroupSeparatorInfo(item, sortKey);
        if (itemKey !== currentKey && currentChunkItems.length > 0 && currentKey !== null && currentLabel !== null) { initialChunks.push({ key: currentKey, label: currentLabel, items: currentChunkItems }); currentChunkItems = []; }
        currentChunkItems.push(item); currentKey = itemKey; currentLabel = itemLabel;
      });
      if (currentChunkItems.length > 0 && currentKey !== null && currentLabel !== null) initialChunks.push({ key: currentKey, label: currentLabel, items: currentChunkItems });
    }
    
    if (initialChunks.length === 0 && unpinnedItemsToRender.length > 0) { 
      unpinnedItemsToRender.forEach((item, index) => {
        elements.push(<React.Fragment key={item.id}><BookmarkItem item={item} siblingItems={baseCurrentViewItems} onItemClick={handleItemClick} onUpdateTitle={updateBookmarkTitleInList} onRemoveItem={removeItemFromList} onCreateGroupFromLink={handleActualCreateGroupFromLink} onToggleDynamicParam={toggleDynamicParamInList} onMoveItemToGroup={moveItemToGroupInList} onForceRecheck={handleForceRecheck} onViewDetails={openMetadataDialog} onTogglePinItem={togglePinBookmarkInList} truncationLength={itemDisplayMode === 'dynamic' ? truncationLength : Infinity} isCheckboxModeActive={isCheckboxModeActive && !isArchiveView} isSelected={selectedItemIds.has(item.id)} onToggleSelectItem={toggleSelectItem} searchTermForHighlight={isReplaceModeActive ? searchTerm : ""} itemWidthClass={itemWidthClass} currentlyCheckingId={currentlyCheckingId} registerRef={registerBookmarkItemRef} />{itemDisplayMode === 'dynamic' && index < unpinnedItemsToRender.length - 1 && (<>, </>)}</React.Fragment>);
      });
      return elements;
    }
    
    const mergedDisplayChunks: Chunk[] = []; let i = 0;
    while (i < initialChunks.length) {
      const currentInitialChunk = initialChunks[i];
      if (currentInitialChunk.items.length >= MIN_ITEMS_FOR_OWN_SEPARATOR) { mergedDisplayChunks.push(currentInitialChunk); i++; }
      else {
        let smallGroupAccumulator = [currentInitialChunk]; let j = i + 1;
        while (j < initialChunks.length && initialChunks[j].items.length < MIN_ITEMS_FOR_OWN_SEPARATOR) { smallGroupAccumulator.push(initialChunks[j]); j++; }
        if (smallGroupAccumulator.length > 1) {
          const firstSmall = smallGroupAccumulator[0], lastSmall = smallGroupAccumulator[smallGroupAccumulator.length - 1];
          mergedDisplayChunks.push({ key: `${firstSmall.key}_to_${lastSmall.key}_${i}`, label: firstSmall.label === lastSmall.label ? firstSmall.label : `${firstSmall.label} - ${lastSmall.label}`, items: smallGroupAccumulator.flatMap(c => c.items) }); i = j;
        } else { mergedDisplayChunks.push(currentInitialChunk); i++; }
      }
    }

    mergedDisplayChunks.forEach((chunk, chunkIndex) => {
      elements.push(<div key={`sep-${chunk.key}-${chunkIndex}`} className={cn("w-full mt-6 mb-3 py-1 text-sm font-semibold text-gray-600 dark:text-gray-400", itemDisplayMode === 'dynamic' ? 'border-b' : 'pl-1')}>{chunk.label}</div>);
      chunk.items.forEach((item, itemIndex) => elements.push(<React.Fragment key={item.id}><BookmarkItem item={item} siblingItems={baseCurrentViewItems} onItemClick={handleItemClick} onUpdateTitle={updateBookmarkTitleInList} onRemoveItem={removeItemFromList} onCreateGroupFromLink={handleActualCreateGroupFromLink} onToggleDynamicParam={toggleDynamicParamInList} onMoveItemToGroup={moveItemToGroupInList} onForceRecheck={handleForceRecheck} onViewDetails={openMetadataDialog} onTogglePinItem={togglePinBookmarkInList} truncationLength={itemDisplayMode === 'dynamic' ? truncationLength : Infinity} isCheckboxModeActive={isCheckboxModeActive && !isArchiveView} isSelected={selectedItemIds.has(item.id)} onToggleSelectItem={toggleSelectItem} searchTermForHighlight={isReplaceModeActive ? searchTerm : ""} itemWidthClass={itemWidthClass} currentlyCheckingId={currentlyCheckingId} registerRef={registerBookmarkItemRef} />{itemDisplayMode === 'dynamic' && (itemIndex < chunk.items.length - 1 || chunkIndex < mergedDisplayChunks.length - 1) && (<>, </>)}</React.Fragment>));
    });
    return elements;
  };
  
  return (
    <div className="min-h-screen w-full bg-gray-200 p-8 flex flex-col relative font-sans">
      <LinkMetadataDialog 
        isOpen={isMetadataDialogOpen} 
        onClose={closeMetadataDialog} 
        bookmark={selectedBookmarkForMetadata} 
        allBookmarks={allBookmarks} 
      />
      <GroupNameDialog 
        isOpen={isGroupNameDialogOpen} 
        onClose={closeGroupNameDialog} 
        onSubmit={(name) => {
          if (groupNameDialogProps?.onSubmit) {
            groupNameDialogProps.onSubmit(name);
          }
        }}
        title={groupNameDialogProps?.title}
        description={groupNameDialogProps?.description}
        inputLabel={groupNameDialogProps?.inputLabel}
        submitButtonText={groupNameDialogProps?.submitButtonText}
      />
      <WordFrequencyDialog 
        isOpen={isWordFrequencyDialogOpen} 
        onClose={closeWordFrequencyDialog} 
        wordStats={wordStatsForDialog} 
        onApplySelection={handleApplyWordFrequencySelection} 
      />
      <SelectionRectangle rect={selectionRect} />
      
      <div className="absolute top-4 left-4 flex items-center"><h1 className="text-2xl font-bold text-gray-700">Minimark</h1><HelpDialog /></div>
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800 hover:bg-gray-300"><Settings2 className="h-6 w-6" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub><DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>{sortOptions.map(opt => (<DropdownMenuRadioItem key={opt.key} value={opt.key}>{opt.label}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuSub><DropdownMenuSubTrigger>Group/Link Order</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={groupLinkDisplayOrder} onValueChange={(v) => setGroupLinkDisplayOrder(v as GroupLinkDisplayOrder)}>{groupLinkDisplayOptions.map(opt => (<DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuSub><DropdownMenuSubTrigger>Item Layout</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={itemDisplayMode} onValueChange={(v) => setItemDisplayMode(v as ItemDisplayMode)}>{displayModeOptions.map(opt => (opt.titleLengthSubMenu ? (<DropdownMenuSub key={opt.value}><DropdownMenuSubTrigger><DropdownMenuRadioItem value={opt.value} className="w-full justify-start p-0 m-0"><span className="pl-2 pr-1 py-1.5">{opt.label}</span></DropdownMenuRadioItem></DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={truncationLength === Infinity ? "off" : truncationLength.toString()} onValueChange={(v) => {const o=truncationOptions.find(opt=>opt.valueStr===v); if(o)setTruncationLength(o.numericValue); setItemDisplayMode('dynamic');}}><DropdownMenuItem disabled className="text-xs text-muted-foreground px-2 pt-1 pb-0.5">Title Length:</DropdownMenuItem>{truncationOptions.map(tOpt=>(<DropdownMenuRadioItem key={tOpt.valueStr} value={tOpt.valueStr} disabled={itemDisplayMode!=='dynamic'}>{tOpt.label}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>) : (<DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>)))}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={isFuzzySearchEnabled} onCheckedChange={setIsFuzzySearchEnabled}><Brain className="mr-2 h-4 w-4" />Fuzzy Search</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={autoArchiveEnabled} onCheckedChange={setAutoArchiveEnabled}>Enable Auto-Archive</DropdownMenuCheckboxItem>
            {autoArchiveEnabled && (<DropdownMenuSub><DropdownMenuSubTrigger>Archive older than...</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={autoArchiveThresholdKey} onValueChange={(v) => setAutoArchiveThresholdKey(v as ArchiveThresholdKey)}>{archiveThresholdOptions.map(opt => (<DropdownMenuRadioItem key={opt.key} value={opt.key}>{opt.label}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exportBookmarks}>Export All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Import Items</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={removeAllDeadLinksFromList} className="text-red-600 focus:text-red-600 focus:bg-red-50"><WifiOff className="mr-2 h-4 w-4" />Remove Dead Links</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input type="file" ref={fileInputRef} accept=".json,.html,.htm" style={{display:'none'}} onChange={onFileSelectedForImport} />
      </div>

      {(() => {
        if (allBookmarks.length === 0 && !searchTerm.trim() && !currentGroupId && !isArchiveView && !isCheckboxModeActive && !isReplaceModeActive) return (<div className="text-center text-gray-500 text-xl m-auto"><p>Welcome!</p><p className="mt-2">Paste a URL to add a bookmark.</p><p className="mt-2">Right-click for options.</p></div>);
        return (<>
          <div 
            ref={mainContentRef}
            className={cn("mt-16 flex-grow", itemDisplayMode === 'dynamic' ? "text-xl leading-relaxed" : "flex flex-wrap gap-x-2 content-start")}
            onMouseDown={handleMouseDownOnContainer}
            onMouseMove={handleMouseMoveOnContainer}
            onMouseUp={handleMouseUpOnContainer}
            onMouseLeave={handleMouseUpOnContainer} // Also end drag if mouse leaves container
          > 
            <div className="flex items-center space-x-2 mb-4 flex-wrap w-full"> 
              <div className="inline-flex items-center relative align-baseline border border-dashed border-gray-400 rounded-md h-7 focus-within:ring-1 focus-within:ring-indigo-500 flex-none">
                <Search className="h-3 w-3 text-gray-500 ml-1.5" /><Input type="text" placeholder={isArchiveView ? "Search archive..." : "Search view..."} value={searchTerm} onChange={handleSearchChange} className="h-full text-sm px-1.5 pr-7 bg-transparent border-none focus:ring-0" style={{boxShadow:'none'}} />{searchTerm && (<Button variant="ghost" onClick={clearSearchAndReplace} className="absolute right-0 top-1/2 transform -translate-y-1/2 h-full px-1.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></Button>)}
              </div>
              {!isArchiveView && (<>
                <Button variant="ghost" size="icon" onClick={handleToggleReplaceMode} className={cn("h-7 w-7 text-gray-500 hover:text-gray-700", isReplaceModeActive && "text-indigo-600 bg-indigo-100 hover:bg-indigo-200")} title={isReplaceModeActive?"Exit Replace":"Enter Replace"}><ReplaceIcon className="h-4 w-4" /></Button>
                {isCheckboxModeActive ? (<>
                  <Button variant="ghost" size="icon" onClick={calculateAndShowWordFrequencyDialog} className="h-7 w-7 text-gray-500 hover:text-gray-700" title="Select by Words"><Tags className="h-4 w-4" /></Button>
                  {selectedItemIds.size > 0 ? (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Actions ({selectedItemIds.size})<ListChecks className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onClick={selectAllVisibleLinks}>{sortedAndFilteredItems.filter(i=>i.type==='link').every(id=>selectedItemIds.has(id.id))&&sortedAndFilteredItems.filter(i=>i.type==='link').length>0?'Deselect All':'Select All'}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={handleMoveSelectedToNewGroup}><FolderPlus className="mr-2 h-4 w-4"/>Move to New Group</DropdownMenuItem>{existingGroupsInView.length>0 && (<DropdownMenuSub><DropdownMenuSubTrigger><FolderSymlink className="mr-2 h-4 w-4"/>Move to Existing</DropdownMenuSubTrigger><DropdownMenuSubContent>{existingGroupsInView.map(g=>(<DropdownMenuItem key={g.id} onClick={()=>handleMoveSelectedToExistingGroup(g.id)}>{g.title.substring(0,20)}</DropdownMenuItem>))}</DropdownMenuSubContent></DropdownMenuSub>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={handleDeleteSelected} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Delete Selected</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={toggleCheckboxMode}><CircleSlash className="mr-2 h-4 w-4"/>Exit Select</DropdownMenuItem></DropdownMenuContent></DropdownMenu>) : (<Button variant="ghost" size="icon" onClick={toggleCheckboxMode} className="h-7 w-7 text-gray-500 hover:text-gray-700" title="Exit Select"><CircleSlash className="h-4 w-4"/></Button>)}
                </>) : (<Button variant="ghost" size="icon" onClick={toggleCheckboxMode} className="h-7 w-7 text-gray-500 hover:text-gray-700" title="Enter Select"><CheckSquare className="h-4 w-4"/></Button>)}
              </>)}
              {isReplaceModeActive && !isArchiveView && (<div className="inline-flex items-center space-x-1 mt-2 sm:mt-0"><Input type="text" placeholder="Replace with..." value={replaceTerm} onChange={(e)=>setReplaceTerm(e.target.value)} className="h-7 text-sm px-1.5 border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500" /><Button onClick={handleReplaceAll} size="sm" className="h-7 px-2 py-1 text-xs" disabled={!searchTerm.trim()}>Replace</Button></div>)}
              {breadcrumbs.length > 0 && (<div className="flex items-baseline text-xl flex-shrink min-w-0 mt-2 sm:mt-0 w-full sm:w-auto">{breadcrumbs.map((c,i)=>(<React.Fragment key={c.id||'top'} >{i>0&&<span className="mx-1 text-gray-400">/</span>}{i<breadcrumbs.length-1||(c.id===null||c.id==='ARCHIVE_VIEW_CRUMB')&&breadcrumbs.length-1===i?(<span className="cursor-pointer hover:underline text-gray-600 hover:text-gray-800" onClick={()=>handleNavigateToGroup(c.id)} title={c.title}>{c.title.length>15?`${c.title.substring(0,12)}...`:c.title}</span>):(<span className="font-bold text-gray-700" title={c.title}>{c.title.length>20?`${c.title.substring(0,17)}...`:c.title}</span>)}</React.Fragment>))}</div>)}
            </div> 
            {renderItemsWithSeparators()}
          </div>
          <Separator className="my-6 border-dashed" />
          <div className="pb-8 text-center">{isArchiveView ? (<Button variant="outline" onClick={()=>navigate('/')}><ArchiveRestore className="mr-2 h-4 w-4"/>Back to Main</Button>) : (<Button variant="outline" onClick={()=>navigate('/archive')}><Archive className="mr-2 h-4 w-4"/>View Archive</Button>)}</div>
        </>);
      })()}
    </div>
  );
};

export default Index;