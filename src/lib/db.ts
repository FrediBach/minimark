import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Bookmark } from '@/types';

const DB_NAME = 'BookmarkDB';
const STORE_NAME = 'bookmarks';
const DB_VERSION = 5; // Incremented DB version

interface BookmarkDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: Bookmark;
    indexes: { 
      'url': string;
      'parentId': string | null;
      'isArchived': boolean;
      'status': string; 
      'lastCheckDate': number | null; 
      'isPinned': boolean; // New index for isPinned
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BookmarkDB>>;

function extractPseudoTitleFromUrlForDB(url: string): string {
  if (!url || !url.startsWith('http')) return 'Untitled Link';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled Link';
  }
}

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<BookmarkDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        let store;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('parentId', 'parentId', { unique: false });
          store.createIndex('isArchived', 'isArchived', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('lastCheckDate', 'lastCheckDate', { unique: false });
          store.createIndex('isPinned', 'isPinned', { unique: false }); // Add new index
        } else {
          store = tx.objectStore(STORE_NAME);
          if (oldVersion < 2 && !store.indexNames.contains('parentId')) {
            store.createIndex('parentId', 'parentId', { unique: false });
          }
          if (oldVersion < 3 && !store.indexNames.contains('isArchived')) {
            store.createIndex('isArchived', 'isArchived', { unique: false });
          }
          if (oldVersion < 4) {
            if (!store.indexNames.contains('status')) {
              store.createIndex('status', 'status', { unique: false });
            }
            if (!store.indexNames.contains('lastCheckDate')) {
              store.createIndex('lastCheckDate', 'lastCheckDate', { unique: false });
            }
          }
          if (oldVersion < 5 && !store.indexNames.contains('isPinned')) { // Add new index if upgrading
            store.createIndex('isPinned', 'isPinned', { unique: false });
          }
        }
      },
    });
  }
  return dbPromise;
};

const mapDbItemToBookmark = (item: Partial<Bookmark> & { id: string }): Bookmark => {
  const type = item.type || 'link';
  const id = item.id;
  let url = item.url;
  if (type === 'group') {
    url = `group:${id}`;
  } else if (type === 'link' && (url === undefined || url === null || url.trim() === '')) {
    url = item.url || ''; 
  }

  let title = item.title;
  if (!title || title.trim() === '') {
    if (type === 'link') {
      title = url ? extractPseudoTitleFromUrlForDB(url) : 'Untitled Link';
    } else {
      title = 'Untitled Group';
    }
  }

  return {
    id: id,
    url: url!, 
    title: title!, 
    clicks: Number(item.clicks) || 0,
    addDate: Number(item.addDate) || Date.now(),
    lastClickDate: (item.lastClickDate === undefined || item.lastClickDate === null) ? null : Number(item.lastClickDate),
    isArchived: item.isArchived || false,
    isPinned: item.isPinned || false, // Default to false
    isLoading: false, 
    type: type,
    parentId: item.parentId === undefined ? null : item.parentId,
    dynamicParamKeys: item.dynamicParamKeys || [],
    status: item.status || 'unchecked',
    lastCheckDate: item.lastCheckDate === undefined ? null : Number(item.lastCheckDate),
    offlineSince: item.offlineSince === undefined ? null : Number(item.offlineSince),
  };
};

export const getAllBookmarksDB = async (): Promise<Bookmark[]> => {
  const db = await initDB();
  const allItemsFromDB = await db.getAll(STORE_NAME);
  return allItemsFromDB.map(dbItem => mapDbItemToBookmark(dbItem as Partial<Bookmark> & { id: string }));
};

export const addBookmarkDB = async (bookmark: Bookmark): Promise<void> => {
  const db = await initDB();
  const type = bookmark.type || 'link';
  const id = bookmark.id || crypto.randomUUID();
  
  const bookmarkToStore: Bookmark = {
    id: id,
    url: bookmark.url || (type === 'group' ? `group:${id}` : ''),
    title: bookmark.title || (type === 'link' ? extractPseudoTitleFromUrlForDB(bookmark.url || '') : 'Untitled Group'),
    clicks: Number(bookmark.clicks) || 0,
    addDate: Number(bookmark.addDate) || Date.now(),
    lastClickDate: (bookmark.lastClickDate === undefined || bookmark.lastClickDate === null) ? null : Number(bookmark.lastClickDate),
    isArchived: bookmark.isArchived || false,
    isPinned: bookmark.isPinned || false, // Ensure isPinned is handled
    isLoading: false, // isLoading is transient, not stored
    type: type,
    parentId: bookmark.parentId === undefined ? null : bookmark.parentId,
    dynamicParamKeys: bookmark.dynamicParamKeys || [],
    status: bookmark.status || 'unchecked',
    lastCheckDate: bookmark.lastCheckDate === undefined ? null : Number(bookmark.lastCheckDate),
    offlineSince: bookmark.offlineSince === undefined ? null : Number(bookmark.offlineSince),
  };
  
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  if (bookmarkToStore.type === 'link' && bookmarkToStore.url) {
    const existingByUrl = await store.index('url').get(bookmarkToStore.url);
    if (existingByUrl && existingByUrl.id !== bookmarkToStore.id && !existingByUrl.isArchived && !bookmarkToStore.isArchived) {
      await tx.done; 
      throw new Error("Active bookmark with this URL already exists.");
    }
  }

  try {
    await store.put(bookmarkToStore);
    await tx.done;
  } catch (error) {
    console.error("Error adding/updating bookmark to DB:", error);
    throw error;
  }
};

export const updateBookmarkDB = async (bookmark: Bookmark): Promise<void> => {
  const bookmarkToUpdate: Bookmark = { 
    ...bookmark, 
    dynamicParamKeys: bookmark.dynamicParamKeys || [],
    isArchived: bookmark.isArchived || false,
    isPinned: bookmark.isPinned || false, // Ensure isPinned is handled
    status: bookmark.status || 'unchecked',
    lastCheckDate: bookmark.lastCheckDate === undefined ? null : Number(bookmark.lastCheckDate),
    offlineSince: bookmark.offlineSince === undefined ? null : Number(bookmark.offlineSince),
    isLoading: undefined, 
  };
  await addBookmarkDB(bookmarkToUpdate); 
};

export const getBookmarkByUrlDB = async (url: string): Promise<Bookmark | undefined> => {
  const db = await initDB();
  if (!url) return undefined;
  const item = await db.getFromIndex(STORE_NAME, 'url', url);
  if (item && item.type === 'link') { 
    return mapDbItemToBookmark(item as Partial<Bookmark> & { id: string });
  }
  return undefined; 
};

export const deleteBookmarkDB = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const clearAllBookmarksDB = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_NAME);
};

export const addMultipleBookmarksDB = async (bookmarks: Partial<Bookmark>[]): Promise<{ added: number, skipped: number }> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  let addedCount = 0;
  let skippedCount = 0;

  for (const importedItem of bookmarks) {
    try {
      const id = importedItem.id || crypto.randomUUID();
      const type = importedItem.type || 'link';
      
      let url = importedItem.url;
      if (type === 'group') {
        url = `group:${id}`;
      } else if (type === 'link' && (url === undefined || url === null || url.trim() === '')) {
        url = ''; 
      }

      let title = importedItem.title;
      if (!title || title.trim() === '') {
        if (type === 'link') {
          title = url ? extractPseudoTitleFromUrlForDB(url) : 'Untitled Link';
        } else {
          title = 'Untitled Group';
        }
      }

      const bookmarkToAdd: Bookmark = {
        id: id,
        url: url!,
        title: title!,
        clicks: Number(importedItem.clicks) || 0,
        addDate: Number(importedItem.addDate) || Date.now(),
        lastClickDate: (importedItem.lastClickDate === undefined || importedItem.lastClickDate === null) ? null : Number(importedItem.lastClickDate),
        isArchived: importedItem.isArchived || false,
        isPinned: importedItem.isPinned || false, // Handle isPinned for imports
        isLoading: false,
        type: type,
        parentId: importedItem.parentId === undefined ? null : importedItem.parentId,
        dynamicParamKeys: importedItem.dynamicParamKeys || [],
        status: importedItem.status || 'unchecked',
        lastCheckDate: importedItem.lastCheckDate === undefined ? null : Number(importedItem.lastCheckDate),
        offlineSince: importedItem.offlineSince === undefined ? null : Number(importedItem.offlineSince),
      };

      const existingById = await store.get(bookmarkToAdd.id);
      let existingByUrl = null;
      if (bookmarkToAdd.type === 'link' && bookmarkToAdd.url && bookmarkToAdd.url.trim() !== '') {
        const allWithUrl = await store.index('url').getAll(bookmarkToAdd.url);
        existingByUrl = allWithUrl.find(b => b.id !== bookmarkToAdd.id); 
      }
      
      if (existingById || existingByUrl) {
        skippedCount++;
      } else {
        await store.add(bookmarkToAdd);
        addedCount++;
      }
    } catch (e) {
      console.warn("Skipping bookmark during bulk add due to error:", importedItem.url || importedItem.title, e);
      skippedCount++;
    }
  }
  await tx.done;
  return { added: addedCount, skipped: skippedCount };
};