import { Bookmark } from '@/types';
import { SortKey } from '@/types/viewTypes'; // Updated import
import { format } from 'date-fns';

export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) { return false; }
}

export function extractDomain(url: string): string | null {
  if (!url || !url.startsWith('http')) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function extractPseudoTitleFromUrl(url: string): string {
  if (!url || !url.startsWith('http')) return 'Untitled Link';
  try {
    const { hostname, pathname } = new URL(url);
    let title = hostname.replace(/^www\./, '');
    if (pathname && pathname !== '/') {
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        title += ` / ${lastPart.replace(/\.(html|htm|php|asp|aspx)$/i, '')}`;
      }
    }
    return title || 'Untitled Link';
  } catch { return url || 'Untitled Link'; }
}

export const getGroupSeparatorInfo = (item: Bookmark, sortKey: SortKey): { key: string | null; label: string | null } => {
  switch (sortKey) {
    case 'titleAsc':
    case 'titleDesc':
      if (item.title) {
        const firstChar = item.title.charAt(0).toUpperCase();
        return { key: firstChar, label: firstChar };
      }
      return { key: '#', label: '#' }; 

    case 'addDateAsc':
    case 'addDateDesc':
    case 'default': 
      if (item.addDate) {
        const date = new Date(item.addDate);
        return { key: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
      }
      return { key: 'no-add-date', label: 'Date Unknown' };

    case 'lastClickDateAsc':
    case 'lastClickDateDesc':
      if (item.lastClickDate === null || item.lastClickDate === undefined) {
        return { key: 'never-clicked', label: 'Never Clicked' };
      }
      const date = new Date(item.lastClickDate);
      return { key: format(date, 'yyyy-MM'), label: `Clicked: ${format(date, 'MMMM yyyy')}` };

    case 'clicksAsc':
    case 'clicksDesc':
      const clicks = item.clicks;
      if (clicks === 0) return { key: 'clicks_0', label: '0 Clicks' };
      if (clicks >= 1 && clicks <= 5) return { key: 'clicks_1-5', label: '1-5 Clicks' };
      if (clicks >= 6 && clicks <= 10) return { key: 'clicks_6-10', label: '6-10 Clicks' };
      if (clicks >= 11 && clicks <= 25) return { key: 'clicks_11-25', label: '11-25 Clicks' };
      if (clicks >= 26 && clicks <= 50) return { key: 'clicks_26-50', label: '26-50 Clicks' };
      if (clicks >= 51 && clicks <= 100) return { key: 'clicks_51-100', label: '51-100 Clicks' };
      if (clicks > 100) return { key: 'clicks_101+', label: '101+ Clicks' };
      return { key: `clicks_${clicks}`, label: `${clicks} Clicks` }; 

    default:
      return { key: null, label: null };
  }
};

export const getAllDescendantIds = (groupId: string, currentAllBookmarks: Bookmark[]): string[] => {
  let idsToDelete: string[] = [];
  const children = currentAllBookmarks.filter(bm => bm.parentId === groupId);
  for (const child of children) {
    idsToDelete.push(child.id);
    if (child.type === 'group') {
      idsToDelete = idsToDelete.concat(getAllDescendantIds(child.id, currentAllBookmarks));
    }
  }
  return idsToDelete;
};