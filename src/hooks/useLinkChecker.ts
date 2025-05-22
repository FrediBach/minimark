import { useState, useCallback, useEffect } from 'react';
import { Bookmark } from '@/types';
import { isValidHttpUrl, extractPseudoTitleFromUrl } from '@/lib/bookmarkUtils';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast'; // Assuming toast is needed here
import { LINK_CHECK_INTERVAL_MS, LINK_RECHECK_THRESHOLD_MS } from '@/config/constants';

interface UseLinkCheckerProps {
  allBookmarks: Bookmark[];
  updateBookmarkInList: (bookmark: Bookmark, showToast?: boolean) => Promise<void>;
  userOnlineStatus: boolean;
}

export const useLinkChecker = ({
  allBookmarks,
  updateBookmarkInList,
  userOnlineStatus,
}: UseLinkCheckerProps) => {
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [currentlyCheckingId, setCurrentlyCheckingId] = useState<string | null>(null);

  const checkLinkStatus = useCallback(async (bookmark: Bookmark, isForcedRecheck = false) => {
    if (!userOnlineStatus) {
      if (bookmark.status === 'checking') {
        // If it was 'checking' and user went offline, revert to 'unchecked' or previous status
        const originalBookmark = allBookmarks.find(b => b.id === bookmark.id);
        const previousStatus = originalBookmark?.status !== 'checking' ? originalBookmark?.status : 'unchecked';
        await updateBookmarkInList({ ...bookmark, status: previousStatus, isLoading: false }, false);
      }
      setIsCheckingLink(false);
      setCurrentlyCheckingId(null);
      if (isForcedRecheck) showError("Cannot re-check: You are offline.");
      return;
    }

    if (!bookmark || bookmark.type !== 'link' || !bookmark.url || !isValidHttpUrl(bookmark.url)) {
      setIsCheckingLink(false);
      setCurrentlyCheckingId(null);
      return;
    }

    setIsCheckingLink(true);
    setCurrentlyCheckingId(bookmark.id);
    // Optimistically update UI to show 'checking'
    await updateBookmarkInList({ ...bookmark, status: 'checking', isLoading: true }, false);

    let finalStatus: Bookmark['status'] = 'offline'; // Default to offline
    let newOfflineSince = bookmark.offlineSince;
    let fetchedTitleFromCheck: string | null = null;
    let toastId: string | undefined;

    if (isForcedRecheck) {
        toastId = showLoading(`Re-checking '${bookmark.title.substring(0, 20)}...'`);
    }

    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(bookmark.url)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) }); // 15s timeout

      if (response.ok) {
        const data = await response.json();
        if (data && data.contents !== null) {
          finalStatus = 'online';
          newOfflineSince = null; // Reset if it was offline
          // Try to parse title only if it's a placeholder or forced recheck
          const isPlaceholderTitle = bookmark.title === bookmark.url || bookmark.title === extractPseudoTitleFromUrl(bookmark.url);
          if (isPlaceholderTitle || isForcedRecheck) {
            try {
              const doc = new DOMParser().parseFromString(data.contents, "text/html");
              const titleTag = doc.querySelector('title');
              fetchedTitleFromCheck = titleTag?.textContent?.trim() || null;
            } catch (titleError) {
              console.warn(`Error parsing title during link check for ${bookmark.id}:`, titleError);
            }
          }
        } else {
          // Proxy OK, but no content means link is likely problematic
          finalStatus = 'offline';
          if (bookmark.status !== 'offline') newOfflineSince = Date.now();
        }
      } else {
        // Proxy or network error
        finalStatus = 'offline';
        if (bookmark.status !== 'offline') newOfflineSince = Date.now();
      }
    } catch (error) {
      // Catch fetch errors (timeout, network down, CORS if direct, etc.)
      finalStatus = 'offline';
      if (bookmark.status !== 'offline') newOfflineSince = Date.now();
      console.warn(`Error during link check for ${bookmark.id}:`, error);
    } finally {
        if (toastId) dismissToast(toastId);
    }
    
    let titleToUpdate = bookmark.title;
    if (fetchedTitleFromCheck && fetchedTitleFromCheck.trim() !== "") {
        const isPlaceholderTitle = bookmark.title === bookmark.url || bookmark.title === extractPseudoTitleFromUrl(bookmark.url);
        if (isPlaceholderTitle || (isForcedRecheck && fetchedTitleFromCheck.trim() !== bookmark.title)) {
            titleToUpdate = fetchedTitleFromCheck.trim();
        }
    }

    const updatedBookmarkFinal: Bookmark = {
      ...bookmark,
      title: titleToUpdate,
      status: finalStatus,
      lastCheckDate: Date.now(),
      offlineSince: newOfflineSince,
      isLoading: false, // Done loading
    };

    await updateBookmarkInList(updatedBookmarkFinal, false); // Update in DB and global state

    if (isForcedRecheck) {
      showSuccess(`Re-check for '${bookmark.title.substring(0, 20)}...' complete. Status: ${finalStatus}.`);
    }
    if (titleToUpdate !== bookmark.title) {
      showSuccess(`Title for '${bookmark.url.substring(0,20)}...' updated to '${titleToUpdate.substring(0,20)}...'.`);
    }

    setIsCheckingLink(false);
    setCurrentlyCheckingId(null);
  }, [userOnlineStatus, allBookmarks, updateBookmarkInList]);

  // Effect for periodic background checks
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!userOnlineStatus || isCheckingLink || allBookmarks.length === 0) {
        return;
      }

      const now = Date.now();
      const candidates = allBookmarks
        .filter(bm =>
          bm.type === 'link' &&
          !bm.isArchived &&
          bm.url && isValidHttpUrl(bm.url) &&
          (bm.status === 'unchecked' || !bm.lastCheckDate || (now - (bm.lastCheckDate || 0) > LINK_RECHECK_THRESHOLD_MS))
        )
        .sort((a, b) => { // Prioritize 'unchecked', then oldest check
          if (a.status === 'unchecked' && b.status !== 'unchecked') return -1;
          if (b.status === 'unchecked' && a.status !== 'unchecked') return 1;
          return (a.lastCheckDate || 0) - (b.lastCheckDate || 0);
        });

      if (candidates.length > 0) {
        checkLinkStatus(candidates[0]); // No need for isForcedRecheck=true here
      }
    }, LINK_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [userOnlineStatus, isCheckingLink, allBookmarks, checkLinkStatus]);

  // This function can be passed to useBookmarks or called directly from Index if needed
  const initiateLinkCheck = useCallback((bookmark: Bookmark, isForced: boolean = false) => {
    checkLinkStatus(bookmark, isForced);
  }, [checkLinkStatus]);

  return {
    initiateLinkCheck,
    currentlyCheckingId, // Expose if BookmarkItem needs to show a specific spinner
  };
};