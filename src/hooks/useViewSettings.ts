import { useState, useEffect, useMemo } from 'react';
import { SortKey, ItemDisplayMode, GroupLinkDisplayOrder, ArchiveThresholdKey } from '@/types/viewTypes';
import {
  DEFAULT_TRUNCATION_LENGTH,
  TRUNCATION_SETTING_KEY,
  ITEM_DISPLAY_MODE_KEY,
  AUTO_ARCHIVE_ENABLED_KEY,
  AUTO_ARCHIVE_THRESHOLD_KEY,
  GROUP_LINK_DISPLAY_ORDER_KEY,
  FUZZY_SEARCH_ENABLED_KEY,
  DEFAULT_ARCHIVE_THRESHOLD_KEY,
} from '@/config/constants';

const getTruncationValue = (setting: string | null): number => {
  if (setting === "off") return Infinity;
  if (setting) {
    const parsed = parseInt(setting, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TRUNCATION_LENGTH;
};

const getItemDisplayModeValue = (setting: string | null): ItemDisplayMode => {
  if (setting && ['dynamic', 's', 'm', 'l', 'xl'].includes(setting)) {
    return setting as ItemDisplayMode;
  }
  return 'm';
};

const getGroupLinkDisplayOrderValue = (setting: string | null): GroupLinkDisplayOrder => {
  if (setting && ['mixed', 'groupsFirst', 'linksFirst'].includes(setting)) {
    return setting as GroupLinkDisplayOrder;
  }
  return 'mixed';
};

export const useViewSettings = () => {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [truncationLength, setTruncationLength] = useState<number>(() => getTruncationValue(localStorage.getItem(TRUNCATION_SETTING_KEY)));
  const [itemDisplayMode, setItemDisplayMode] = useState<ItemDisplayMode>(() => getItemDisplayModeValue(localStorage.getItem(ITEM_DISPLAY_MODE_KEY)));
  const [groupLinkDisplayOrder, setGroupLinkDisplayOrder] = useState<GroupLinkDisplayOrder>(() => getGroupLinkDisplayOrderValue(localStorage.getItem(GROUP_LINK_DISPLAY_ORDER_KEY)));
  const [isFuzzySearchEnabled, setIsFuzzySearchEnabled] = useState<boolean>(() => localStorage.getItem(FUZZY_SEARCH_ENABLED_KEY) === 'true');
  
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState<boolean>(() => localStorage.getItem(AUTO_ARCHIVE_ENABLED_KEY) === 'true');
  const [autoArchiveThresholdKey, setAutoArchiveThresholdKey] = useState<ArchiveThresholdKey>(
    () => (localStorage.getItem(AUTO_ARCHIVE_THRESHOLD_KEY) as ArchiveThresholdKey | null) || DEFAULT_ARCHIVE_THRESHOLD_KEY
  );

  useEffect(() => {
    const storedTruncation = localStorage.getItem(TRUNCATION_SETTING_KEY);
    setTruncationLength(getTruncationValue(storedTruncation));
    const storedDisplayMode = localStorage.getItem(ITEM_DISPLAY_MODE_KEY);
    setItemDisplayMode(getItemDisplayModeValue(storedDisplayMode));
    const storedGroupLinkOrder = localStorage.getItem(GROUP_LINK_DISPLAY_ORDER_KEY);
    setGroupLinkDisplayOrder(getGroupLinkDisplayOrderValue(storedGroupLinkOrder));
    setIsFuzzySearchEnabled(localStorage.getItem(FUZZY_SEARCH_ENABLED_KEY) === 'true');
    
    setAutoArchiveEnabled(localStorage.getItem(AUTO_ARCHIVE_ENABLED_KEY) === 'true');
    setAutoArchiveThresholdKey((localStorage.getItem(AUTO_ARCHIVE_THRESHOLD_KEY) as ArchiveThresholdKey | null) || DEFAULT_ARCHIVE_THRESHOLD_KEY);
  }, []);

  useEffect(() => { localStorage.setItem(TRUNCATION_SETTING_KEY, truncationLength === Infinity ? "off" : truncationLength.toString()); }, [truncationLength]);
  useEffect(() => { localStorage.setItem(ITEM_DISPLAY_MODE_KEY, itemDisplayMode); }, [itemDisplayMode]);
  useEffect(() => { localStorage.setItem(GROUP_LINK_DISPLAY_ORDER_KEY, groupLinkDisplayOrder); }, [groupLinkDisplayOrder]);
  useEffect(() => { localStorage.setItem(FUZZY_SEARCH_ENABLED_KEY, isFuzzySearchEnabled.toString()); }, [isFuzzySearchEnabled]);
  useEffect(() => { localStorage.setItem(AUTO_ARCHIVE_ENABLED_KEY, autoArchiveEnabled.toString()); }, [autoArchiveEnabled]);
  useEffect(() => { localStorage.setItem(AUTO_ARCHIVE_THRESHOLD_KEY, autoArchiveThresholdKey); }, [autoArchiveThresholdKey]);

  const itemWidthClass = useMemo(() => {
    switch (itemDisplayMode) {
      case 's': return 'w-40';
      case 'm': return 'w-56';
      case 'l': return 'w-72';
      case 'xl': return 'w-96';
      case 'dynamic':
      default: return '';
    }
  }, [itemDisplayMode]);

  return {
    sortKey, setSortKey,
    truncationLength, setTruncationLength,
    itemDisplayMode, setItemDisplayMode,
    groupLinkDisplayOrder, setGroupLinkDisplayOrder,
    isFuzzySearchEnabled, setIsFuzzySearchEnabled,
    autoArchiveEnabled, setAutoArchiveEnabled,
    autoArchiveThresholdKey, setAutoArchiveThresholdKey,
    itemWidthClass,
  };
};