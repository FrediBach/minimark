import { Bookmark } from '@/types';
import { extractPseudoTitleFromUrl, isValidHttpUrl } from './bookmarkUtils';
import { showError } from '@/utils/toast'; // Assuming toast utils are globally accessible or passed

const parseHtmlDlNodeRecursive = (
  dlElement: HTMLDListElement,
  parentId: string | null,
  parsedBookmarks: Partial<Bookmark>[]
): void => {
  for (const childNode of Array.from(dlElement.children)) {
    if (childNode.tagName === 'DT') {
      const dtElement = childNode as HTMLElement;
      const firstChildOfDt = dtElement.firstElementChild;

      if (firstChildOfDt) {
        if (firstChildOfDt.tagName === 'H3' || firstChildOfDt.tagName === 'H1') { 
          const hElement = firstChildOfDt as HTMLHeadingElement;
          const groupId = crypto.randomUUID();
          const addDateAttr = hElement.getAttribute('ADD_DATE') || hElement.getAttribute('add_date');
          const addDate = addDateAttr ? parseInt(addDateAttr, 10) * 1000 : Date.now();

          const group: Partial<Bookmark> = {
            id: groupId,
            title: hElement.textContent?.trim() || 'Untitled Group',
            type: 'group',
            url: `group:${groupId}`,
            parentId: parentId,
            addDate: addDate,
            clicks: 0,
            lastClickDate: null,
            isArchived: false, 
            dynamicParamKeys: [],
            status: 'unchecked', lastCheckDate: null, offlineSince: null,
          };
          parsedBookmarks.push(group);

          const nextSiblingDl = dtElement.nextElementSibling;
          if (nextSiblingDl && nextSiblingDl.tagName === 'DL') {
            parseHtmlDlNodeRecursive(nextSiblingDl as HTMLDListElement, groupId, parsedBookmarks);
          }
        } else if (firstChildOfDt.tagName === 'A') { 
          const aElement = firstChildOfDt as HTMLAnchorElement;
          const addDateAttr = aElement.getAttribute('ADD_DATE') || aElement.getAttribute('add_date');
          const addDate = addDateAttr ? parseInt(addDateAttr, 10) * 1000 : Date.now();

          const link: Partial<Bookmark> = {
            id: crypto.randomUUID(),
            title: aElement.textContent?.trim() || extractPseudoTitleFromUrl(aElement.href),
            url: aElement.href,
            type: 'link',
            parentId: parentId,
            addDate: addDate,
            clicks: 0,
            lastClickDate: null, 
            isArchived: false, 
            dynamicParamKeys: [],
            status: 'unchecked', lastCheckDate: null, offlineSince: null,
          };
          if (link.url && (link.url.startsWith('http:') || link.url.startsWith('https:'))) {
             if (isValidHttpUrl(link.url)) {
               parsedBookmarks.push(link);
             } else {
                console.warn(`Skipping invalid URL from HTML import (isValidHttpUrl failed): ${link.url}`);
             }
          } else {
            console.warn(`Skipping non-HTTP/HTTPS URL from HTML import: ${link.url}`);
          }
        }
      }
    }
  }
};

export const parseBookmarksHTML = (htmlText: string): Partial<Bookmark>[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const bookmarks: Partial<Bookmark>[] = [];
  const firstDl = doc.body.querySelector('dl');
  if (firstDl) {
     parseHtmlDlNodeRecursive(firstDl, null, bookmarks);
  } else {
    const allLinks = doc.body.querySelectorAll('a');
    if (allLinks.length > 0 && bookmarks.length === 0) { 
        showError("Found links but no standard folder structure. Importing all links to top level.");
        allLinks.forEach(aElement => {
            const addDateAttr = aElement.getAttribute('ADD_DATE') || aElement.getAttribute('add_date');
            const addDate = addDateAttr ? parseInt(addDateAttr, 10) * 1000 : Date.now();
            const link: Partial<Bookmark> = {
                id: crypto.randomUUID(),
                title: aElement.textContent?.trim() || extractPseudoTitleFromUrl(aElement.href),
                url: aElement.href,
                type: 'link',
                parentId: null, 
                addDate: addDate,
                clicks: 0,
                lastClickDate: null,
                isArchived: false,
                dynamicParamKeys: [],
                status: 'unchecked', lastCheckDate: null, offlineSince: null,
            };
            if (link.url && (link.url.startsWith('http:') || link.url.startsWith('https:'))) {
                if (isValidHttpUrl(link.url)) {
                    bookmarks.push(link);
                } else {
                    console.warn(`Skipping invalid URL (flat structure): ${link.url}`);
                }
            } else {
                console.warn(`Skipping non-HTTP/HTTPS URL (flat structure): ${link.url}`);
            }
        });
    }
  }
  if (bookmarks.length === 0 && !firstDl && doc.body.querySelectorAll('a').length === 0) {
      showError("Could not parse any bookmarks from the HTML file. The structure might be unsupported.");
  }
  return bookmarks;
};