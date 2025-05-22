import { Bookmark } from '@/types';
import { extractDomain } from '@/lib/bookmarkUtils';
import { updateBookmarkDB, addBookmarkDB } from '@/lib/db'; // Assuming direct import is okay
import { showSuccess } from '@/utils/toast'; // Assuming direct import

export async function checkAndPerformAutoGrouping(
    newlyFinalizedLink: Bookmark,
    currentBookmarksList: Bookmark[],
    // Pass navigate if direct navigation is needed from here, or handle navigation in the calling hook
    // navigate: (path: string) => void 
): Promise<{ modifiedBookmarks: Bookmark[], navigationTargetId: string | null }> {
    const linkDomain = extractDomain(newlyFinalizedLink.url);
    if (!linkDomain) return { modifiedBookmarks: currentBookmarksList, navigationTargetId: null };

    const parentContextId = newlyFinalizedLink.parentId;

    const otherSameDomainLinksInContext = currentBookmarksList.filter(
        bm => bm.parentId === parentContextId &&
              bm.type === 'link' &&
              bm.id !== newlyFinalizedLink.id &&
              !bm.isArchived && 
              extractDomain(bm.url) === linkDomain
    );

    if (otherSameDomainLinksInContext.length === 0) {
        return { modifiedBookmarks: currentBookmarksList, navigationTargetId: null };
    }

    const allLinksToGroup = [newlyFinalizedLink, ...otherSameDomainLinksInContext];

    let targetGroup = currentBookmarksList.find(
        bm => bm.type === 'group' &&
              bm.title === linkDomain &&
              bm.parentId === parentContextId &&
              !bm.isArchived
    );

    let modifiedBookmarks = [...currentBookmarksList];
    let newNavigationTargetId: string | null = null;

    if (targetGroup) { 
        newNavigationTargetId = targetGroup.id;
        let madeChangesToLinks = false;
        
        const updatedLinksPromises: Promise<void>[] = [];

        modifiedBookmarks = modifiedBookmarks.map(bm => {
            if (allLinksToGroup.some(linkToMove => linkToMove.id === bm.id) && bm.parentId !== targetGroup!.id) {
                madeChangesToLinks = true;
                const updatedLink = { ...bm, parentId: targetGroup!.id };
                updatedLinksPromises.push(updateBookmarkDB(updatedLink));
                return updatedLink;
            }
            return bm;
        });

        if (madeChangesToLinks) {
            await Promise.all(updatedLinksPromises);
            showSuccess(`Auto-moved links to existing group: ${linkDomain}`);
        }
    } else { 
        const newGroupObject: Bookmark = {
            id: crypto.randomUUID(),
            title: linkDomain,
            type: 'group',
            url: '', 
            clicks: 0, addDate: Date.now(), lastClickDate: null,
            parentId: parentContextId, isLoading: false, isArchived: false,
            dynamicParamKeys: [], status: 'unchecked', lastCheckDate: null, offlineSince: null,
        };
        newGroupObject.url = `group:${newGroupObject.id}`;
        newNavigationTargetId = newGroupObject.id;

        const updatedLinksForNewGroupPromises: Promise<void>[] = [];
        const linksToMoveToNewGroup: Bookmark[] = [];

        modifiedBookmarks = modifiedBookmarks.map(bm => {
            if (allLinksToGroup.some(linkToMove => linkToMove.id === bm.id)) {
                const updatedLink = { ...bm, parentId: newGroupObject.id };
                linksToMoveToNewGroup.push(updatedLink);
                updatedLinksForNewGroupPromises.push(updateBookmarkDB(updatedLink));
                return updatedLink;
            }
            return bm;
        });
        modifiedBookmarks.push(newGroupObject);

        await addBookmarkDB(newGroupObject);
        await Promise.all(updatedLinksForNewGroupPromises);
        showSuccess(`Auto-created group '${linkDomain}' and moved links.`);
    }
    
    // Check if the newly finalized link itself was moved to the target group
    const finalStateOfLink = modifiedBookmarks.find(bm => bm.id === newlyFinalizedLink.id);
    if (finalStateOfLink && finalStateOfLink.parentId === newNavigationTargetId) {
        return { modifiedBookmarks, navigationTargetId: newNavigationTargetId };
    }
    // This case handles if the target group already existed and the link was one of the "otherSameDomainLinksInContext"
    // and was correctly moved.
    if (targetGroup && newNavigationTargetId === targetGroup.id) {
        const originalLinkInAllLinksToGroup = allLinksToGroup.find(l => l.id === newlyFinalizedLink.id);
        if (originalLinkInAllLinksToGroup) { // Check if the link was part of the group to be moved
             const linkAfterModification = modifiedBookmarks.find(bm => bm.id === newlyFinalizedLink.id);
             if (linkAfterModification && linkAfterModification.parentId === targetGroup.id) {
                return { modifiedBookmarks, navigationTargetId: newNavigationTargetId };
             }
        }
    }

    return { modifiedBookmarks, navigationTargetId: null };
}