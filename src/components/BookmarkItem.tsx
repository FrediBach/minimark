import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Bookmark } from '@/types';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showError } from '@/utils/toast';
import { Folder, Settings, AlertTriangle, ArrowRightCircle, Trash2, Recycle, RefreshCw, WifiOff, CheckCircle2, Info, Pin, PinOff } from 'lucide-react'; 

interface BookmarkItemProps {
  item: Bookmark;
  siblingItems: Bookmark[];
  onItemClick: (item: Bookmark, constructedUrl?: string) => void; 
  onUpdateTitle: (id: string, newTitle: string) => void;
  onRemoveItem: (item: Bookmark, options?: { deleteContents?: boolean }) => void;
  onCreateGroupFromLink: (linkId: string) => void;
  onToggleDynamicParam: (bookmarkId: string, paramKey: string) => void;
  onMoveItemToGroup: (itemId: string, newParentId: string) => void;
  onForceRecheck: (itemId: string) => void; 
  onViewDetails: (bookmark: Bookmark) => void;
  onTogglePinItem: (itemId: string) => void;
  truncationLength: number;
  isCheckboxModeActive: boolean; 
  isSelected: boolean; 
  onToggleSelectItem: (itemId: string) => void; 
  searchTermForHighlight?: string; 
  itemWidthClass?: string;
  currentlyCheckingId?: string | null; 
  registerRef: (id: string, element: HTMLSpanElement | null) => void; // New prop
}

const TEXT_COLORS = ['text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900', 'text-black'];
const BACKGROUND_COLORS = ['bg-transparent', 'bg-gray-100', 'bg-gray-50', 'bg-white'];
const spinnerFrames = ['/', '-', '\\', '|'];
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getHighlightedText = (text: string, highlight: string): React.ReactNode => {
  if (!highlight.trim()) {
    return text;
  }
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={index} className="bg-yellow-300 text-black px-0.5 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};


const BookmarkItem: React.FC<BookmarkItemProps> = ({ 
  item, 
  siblingItems,
  onItemClick, 
  onUpdateTitle, 
  onRemoveItem, 
  onCreateGroupFromLink,
  onToggleDynamicParam,
  onMoveItemToGroup,
  onForceRecheck,
  onViewDetails,
  onTogglePinItem,
  truncationLength,
  isCheckboxModeActive,
  isSelected,
  onToggleSelectItem,
  searchTermForHighlight,
  itemWidthClass,
  currentlyCheckingId,
  registerRef, // Destructure new prop
}) => {
  const itemElementRef = useRef<HTMLSpanElement>(null); // Ref for the main span
  const [currentSpinnerFrame, setCurrentSpinnerFrame] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(item.title);
  const [paramInputValues, setParamInputValues] = useState<{ [key: string]: string }>({});
  const [hasInvalidUrl, setHasInvalidUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (itemElementRef.current) {
      registerRef(item.id, itemElementRef.current);
    }
    return () => {
      registerRef(item.id, null); // Clean up on unmount or if id changes
    };
  }, [item.id, registerRef]);

  const isActuallyLoading = item.isLoading || (item.type === 'link' && item.status === 'checking') || (item.type === 'link' && currentlyCheckingId === item.id);
  const isDeadLink = item.type === 'link' && item.status === 'offline' && item.offlineSince && (Date.now() - item.offlineSince > ONE_WEEK_MS);

  const initializeParamInputValues = useCallback(() => {
    const newValues: { [key: string]: string } = {};
    if (item.type === 'link' && item.url) {
      try {
        const parsedUrl = new URL(item.url);
        setHasInvalidUrl(false);
        (item.dynamicParamKeys || []).forEach(key => {
          newValues[key] = parsedUrl.searchParams.get(key) || '';
        });
      } catch (e) {
        console.warn(`BookmarkItem: Invalid URL for item ${item.id}: ${item.url}`);
        setHasInvalidUrl(true);
      }
    }
    setParamInputValues(newValues);
  }, [item.url, item.dynamicParamKeys, item.type, item.id]);

  useEffect(() => {
    initializeParamInputValues();
  }, [initializeParamInputValues]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isActuallyLoading && item.type === 'link') {
      intervalId = setInterval(() => {
        setCurrentSpinnerFrame((prevFrame) => (prevFrame + 1) % spinnerFrames.length);
      }, 200);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActuallyLoading, item.type]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (!isEditing) {
      setEditableTitle(item.title);
    }
  }, [item.title, isEditing]);

  const actualHref = useMemo(() => {
    if (item.type !== 'link' || !item.url || hasInvalidUrl) return item.url || '#';
    if (!item.dynamicParamKeys || item.dynamicParamKeys.length === 0) return item.url;

    try {
      const constructedUrl = new URL(item.url);
      item.dynamicParamKeys.forEach(key => {
        if (paramInputValues[key] !== undefined) {
          constructedUrl.searchParams.set(key, paramInputValues[key]);
        }
      });
      return constructedUrl.toString();
    } catch (e) {
      console.error("Error constructing dynamic URL:", e);
      return item.url; 
    }
  }, [item.url, item.dynamicParamKeys, paramInputValues, item.type, hasInvalidUrl]);

  const handleItemClickInternal = (e: React.MouseEvent) => {
    if (isEditing) {
      e.preventDefault(); 
      return;
    }
    if (isCheckboxModeActive && item.type === 'link') {
      e.preventDefault(); 
      onToggleSelectItem(item.id);
      return;
    }
    onItemClick(item, item.type === 'link' ? actualHref : undefined);
  };
  
  const handleParamInputChange = (key: string, value: string) => {
    setParamInputValues(prev => ({ ...prev, [key]: value }));
  };

  const clicks = item.clicks;
  let effectiveTextColor = TEXT_COLORS[Math.min(clicks, TEXT_COLORS.length - 1)];
  let effectiveBgColor = 'bg-transparent';
  let textPadding = '';

  if (clicks >= TEXT_COLORS.length - 1) {
    const bgIndex = Math.min(clicks - (TEXT_COLORS.length - 1), BACKGROUND_COLORS.length - 1);
    effectiveBgColor = BACKGROUND_COLORS[bgIndex];
    if (effectiveBgColor !== 'bg-transparent') textPadding = 'px-1 py-0.5';
  }
  
  if (isCheckboxModeActive && isSelected && item.type === 'link') {
    effectiveBgColor = 'bg-blue-100'; 
    if (textPadding === '') textPadding = 'px-1 py-0.5';
  }
  if (item.isPinned && !item.isArchived) {
    effectiveBgColor = 'bg-yellow-100 dark:bg-yellow-800';
    if (textPadding === '') textPadding = 'px-1 py-0.5';
  }


  const titleDisplayContent = useMemo(() => {
    let baseTitle = item.title;
    if (isActuallyLoading && item.type === 'link') {
      baseTitle = `${spinnerFrames[currentSpinnerFrame]} Checking...`;
    } else if (truncationLength !== Infinity && item.title.length > truncationLength && !itemWidthClass) { 
      baseTitle = `${item.title.substring(0, truncationLength)}...`;
    } else if (itemWidthClass && item.title.length > 50) { 
        baseTitle = `${item.title.substring(0, 47)}...`;
    }
    
    if (searchTermForHighlight && !isActuallyLoading) {
      return getHighlightedText(baseTitle, searchTermForHighlight);
    }
    return baseTitle;
  }, [item.title, isActuallyLoading, item.type, truncationLength, searchTermForHighlight, currentSpinnerFrame, itemWidthClass]);


  const handleEdit = () => {
    setEditableTitle(item.title);
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    if (isEditing) {
      const trimmedTitle = editableTitle.trim();
      if (trimmedTitle && trimmedTitle !== item.title) {
        onUpdateTitle(item.id, trimmedTitle);
      } else if (!trimmedTitle) {
        showError("Title cannot be empty. Reverted to original.");
        setEditableTitle(item.title);
      }
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveTitle();
    else if (e.key === 'Escape') {
      setEditableTitle(item.title);
      setIsEditing(false);
    }
  };

  const handleRemoveGrouping = () => onRemoveItem(item, { deleteContents: false });
  const handleDeleteGroupAndContents = () => onRemoveItem(item, { deleteContents: true });
  const handleRemoveLink = () => onRemoveItem(item);

  const handleCreateGroup = () => {
    if (item.type === 'link') {
      onCreateGroupFromLink(item.id);
    }
  };
  
  const itemIcon = item.type === 'group' 
    ? <Folder className="h-4 w-4 mr-1 inline-block flex-shrink-0" /> 
    : null; 

  const pinIcon = item.isPinned && !item.isArchived
    ? <Pin className="h-3 w-3 mr-1 text-yellow-600 dark:text-yellow-400 flex-shrink-0" title="Pinned Item" />
    : null;

  const urlParamsForMenu = useMemo(() => { 
    if (item.type === 'link' && item.url && !hasInvalidUrl) {
      try {
        return new URL(item.url).searchParams;
      } catch (e) { return null; }
    }
    return null;
  }, [item.url, item.type, hasInvalidUrl]);

  const dynamicParamOptions = useMemo(() => {
    if (!urlParamsForMenu || item.type !== 'link') return [];
    const options: React.ReactNode[] = [];
    const uniqueKeys = new Set<string>();
    urlParamsForMenu.forEach((_, key) => uniqueKeys.add(key));

    if (uniqueKeys.size > 0) {
       options.push(<ContextMenuSeparator key="dyn-sep-before" />);
       options.push(
        <ContextMenuSub key="dynamic-params-sub">
          <ContextMenuSubTrigger>
            <Settings className="mr-2 h-4 w-4" /> Dynamic Parameters
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {Array.from(uniqueKeys).map(paramKey => {
              const isDynamic = item.dynamicParamKeys?.includes(paramKey);
              return (
                <ContextMenuItem 
                  key={paramKey} 
                  onClick={() => onToggleDynamicParam(item.id, paramKey)}
                >
                  {isDynamic ? `Make '${paramKey}' static` : `Make '${paramKey}' dynamic`}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>
       );
    }
    return options;
  }, [urlParamsForMenu, item.id, item.dynamicParamKeys, item.type, onToggleDynamicParam]);

  const moveToGroupOptions = useMemo(() => {
    if (item.type !== 'link' || item.isArchived) return null; 

    const targetGroups = siblingItems.filter(
      (sibling) => sibling.type === 'group' && sibling.id !== item.parentId && !sibling.isArchived
    );

    if (targetGroups.length === 0) {
      return (
        <ContextMenuItem disabled>
          <ArrowRightCircle className="mr-2 h-4 w-4" /> Move to Group (No other groups)
        </ContextMenuItem>
      );
    }

    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <ArrowRightCircle className="mr-2 h-4 w-4" /> Move to Group
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {targetGroups.map((group) => (
            <ContextMenuItem
              key={group.id}
              onClick={() => onMoveItemToGroup(item.id, group.id)}
            >
              {group.title.length > 25 ? `${group.title.substring(0, 22)}...` : group.title}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }, [item, siblingItems, onMoveItemToGroup]);

  const dynamicInputs = useMemo(() => {
    if (item.type !== 'link' || !item.dynamicParamKeys || item.dynamicParamKeys.length === 0 || hasInvalidUrl) {
      return null;
    }
    return (
      <div className={cn("flex flex-wrap items-center mt-0.5", itemWidthClass ? "justify-start" : "")}>
        {item.dynamicParamKeys.map(key => (
          <React.Fragment key={key}>
            <span className="text-xs text-gray-500 mr-0.5 whitespace-nowrap">{key}=</span>
            <Input
              type="text"
              value={paramInputValues[key] || ''}
              onChange={(e) => handleParamInputChange(key, e.target.value)}
              onClick={(e) => e.stopPropagation()} 
              onMouseDown={(e) => e.stopPropagation()} 
              className="h-5 px-1 py-0 text-xs inline-block w-20 border-gray-300 rounded-sm focus:ring-indigo-500 focus:border-indigo-500 mr-1"
              placeholder={key}
            />
          </React.Fragment>
        ))}
      </div>
    );
  }, [item.type, item.dynamicParamKeys, paramInputValues, hasInvalidUrl, itemWidthClass]);


  if (isEditing) {
    return (
      <span 
        ref={itemElementRef} // Add ref here
        className={cn(
          "inline-flex items-center rounded align-baseline", 
          effectiveBgColor, 
          textPadding, 
          "transition-colors duration-150 ease-in-out",
          itemWidthClass, 
          itemWidthClass ? "p-1.5 border border-transparent hover:border-gray-300" : "" 
        )}
      >
        {isCheckboxModeActive && item.type === 'link' && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelectItem(item.id)}
            className="mr-2 align-middle flex-shrink-0"
            onClick={(e) => e.stopPropagation()} 
          />
        )}
        {pinIcon}
        {itemIcon}
        <Input
          ref={inputRef}
          type="text"
          value={editableTitle}
          onChange={(e) => setEditableTitle(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-auto p-0 m-0 border-none focus:ring-0 bg-transparent text-xl leading-relaxed", 
            effectiveTextColor,
            "w-auto inline-block align-middle flex-grow min-w-0" 
          )}
          style={{ boxShadow: 'none' }}
        />
      </span>
    );
  }

  const commonSpanClasses = cn(
    effectiveTextColor,
    "hover:opacity-80 transition-opacity duration-150 ease-in-out",
    { 'italic': isActuallyLoading && item.type === 'link' },
    { 'line-through text-red-400 hover:text-red-500': isDeadLink }
  );
  
  const titleElement = (
    <span className={cn("truncate", itemWidthClass ? "block" : "inline")}>
      {titleDisplayContent}
    </span>
  );

  const linkStatusIcon = useMemo(() => {
    if (item.type !== 'link' || item.isArchived) return null; 
    if (isActuallyLoading) return null; 

    if (item.status === 'offline') {
      return <WifiOff className={cn("h-3 w-3 ml-1 flex-shrink-0", isDeadLink ? "text-red-400" : "text-orange-500")} title={`Offline since ${item.offlineSince ? new Date(item.offlineSince).toLocaleDateString() : 'unknown'}`} />;
    }
    if (item.status === 'online') {
      return <CheckCircle2 className="h-3 w-3 ml-1 text-green-500 flex-shrink-0" title={`Online (Checked: ${item.lastCheckDate ? new Date(item.lastCheckDate).toLocaleDateString() : 'N/A'})`} />;
    }
    return null;
  }, [item.type, item.status, item.offlineSince, item.lastCheckDate, isDeadLink, isActuallyLoading, item.isArchived]);

  const titleAndIcon = (
    <div className={cn("flex items-center", itemWidthClass ? "flex-grow min-w-0" : "")}>
      {pinIcon}
      {itemIcon}
      {titleElement}
      {linkStatusIcon}
    </div>
  );
  
  const contentWrapperClasses = cn(
    "inline-flex flex-col rounded cursor-pointer align-top", 
    effectiveBgColor, 
    textPadding, 
    "transition-colors duration-150 ease-in-out",
    itemWidthClass,
    itemWidthClass ? "p-1.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden" : "items-center align-baseline" 
  );

  // The `content` variable will be the element that gets the ref
  const content = item.type === 'link' ? (
    <span ref={itemElementRef} className={contentWrapperClasses} onClick={handleItemClickInternal}>
      <div className="flex items-center w-full">
        {isCheckboxModeActive && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelectItem(item.id)}
            className="mr-2 flex-shrink-0"
            onClick={(e) => e.stopPropagation()} 
          />
        )}
        <a
          href={actualHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { 
            if (isCheckboxModeActive) e.preventDefault();
          }}
          className={cn(commonSpanClasses, "flex items-center w-full min-w-0")} 
          title={actualHref} 
          onContextMenu={(e) => { if (isActuallyLoading || hasInvalidUrl || isCheckboxModeActive) e.preventDefault(); }} 
        >
          {hasInvalidUrl && <AlertTriangle className="h-3 w-3 mr-1 inline-block text-red-500 flex-shrink-0" title="Invalid base URL for this bookmark!" />}
          {titleAndIcon}
        </a>
      </div>
      {dynamicInputs} 
    </span>
  ) : ( 
    <span 
      ref={itemElementRef}
      onClick={handleItemClickInternal} 
      className={cn(contentWrapperClasses, commonSpanClasses)} 
      title={`Group: ${item.title} (${item.clicks} opens)`}
    >
      {titleAndIcon}
    </span>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isCheckboxModeActive}>
        {content}
      </ContextMenuTrigger>
      {!(isActuallyLoading && item.type === 'link') && !hasInvalidUrl && !isCheckboxModeActive && (
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onViewDetails(item)}>
            <Info className="mr-2 h-4 w-4" /> View Details
          </ContextMenuItem>
          {!item.isArchived && (
            <ContextMenuItem onClick={() => onTogglePinItem(item.id)}>
              {item.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {item.isPinned ? "Unpin Item" : "Pin Item"}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleEdit}>Edit Title</ContextMenuItem>
          {item.type === 'link' && (
            <>
              {!item.isArchived && ( 
                <>
                  <ContextMenuItem onClick={handleCreateGroup}>Create Group from this Link</ContextMenuItem>
                  {moveToGroupOptions}
                  {dynamicParamOptions}
                </>
              )}
              {(item.status === 'offline' || isDeadLink) && (
                <ContextMenuItem onClick={() => onForceRecheck(item.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Re-check Link Status
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleRemoveLink} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />{item.isArchived ? "Delete Permanently" : "Remove Link"}
              </ContextMenuItem>
            </>
          )}
          {item.type === 'group' && ( 
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleRemoveGrouping}>
                <Recycle className="mr-2 h-4 w-4" />Remove Grouping (Move Contents Up)
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDeleteGroupAndContents} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />Delete Group and All Contents
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
};

export default BookmarkItem;