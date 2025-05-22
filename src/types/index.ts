export interface Bookmark {
  id: string;
  url: string; 
  title: string;
  clicks: number;
  isLoading?: boolean;
  addDate?: number; 
  lastClickDate?: number | null; 
  isArchived?: boolean; 
  isPinned?: boolean; // New field for pinning

  type: 'link' | 'group';
  parentId: string | null; 
  dynamicParamKeys?: string[]; 

  // New fields for link status checking
  status?: 'online' | 'offline' | 'unchecked' | 'checking'; // Status of the link
  lastCheckDate?: number | null; // Timestamp of the last status check
  offlineSince?: number | null; // Timestamp when link was first detected as offline
}