import { ArchiveThresholdKey } from '@/types/viewTypes';

export const DEFAULT_TRUNCATION_LENGTH = 20;
export const TRUNCATION_SETTING_KEY = 'minimark-truncationSetting';
export const ITEM_DISPLAY_MODE_KEY = 'minimark-itemDisplayModeSetting';
export const AUTO_ARCHIVE_ENABLED_KEY = 'minimark-autoArchiveEnabled';
export const AUTO_ARCHIVE_THRESHOLD_KEY = 'minimark-autoArchiveThreshold';
export const GROUP_LINK_DISPLAY_ORDER_KEY = 'minimark-groupLinkDisplayOrder';
export const FUZZY_SEARCH_ENABLED_KEY = 'minimark-fuzzySearchEnabled';

export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_ARCHIVE_THRESHOLD_KEY: ArchiveThresholdKey = '6m';

export const MIN_WORD_LENGTH = 3;
export const MAX_WORDS_IN_DIALOG = 50;
export const LINK_CHECK_INTERVAL_MS = 30000;
export const LINK_RECHECK_THRESHOLD_MS = 24 * 60 * 60 * 1000;
export const SEPARATOR_DISPLAY_THRESHOLD = 100;
export const MIN_ITEMS_FOR_OWN_SEPARATOR = 5;