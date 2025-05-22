import React from 'react';
import { Bookmark } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LinkMetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookmark: Bookmark | null;
  allBookmarks?: Bookmark[]; // Optional: for resolving parent group name
}

const formatDate = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const MetadataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-1">{label}</dt>
    <dd className="text-sm text-gray-800 dark:text-gray-200 col-span-2 break-words">{value || 'N/A'}</dd>
  </div>
);

const LinkMetadataDialog: React.FC<LinkMetadataDialogProps> = ({
  isOpen,
  onClose,
  bookmark,
  allBookmarks,
}) => {
  if (!bookmark) return null;

  const getParentGroupName = (parentId: string | null): string => {
    if (!parentId || !allBookmarks) return 'Top Level';
    const parent = allBookmarks.find(b => b.id === parentId && b.type === 'group');
    return parent ? parent.title : 'Unknown Parent';
  };

  const getStatusBadgeVariant = (status?: Bookmark['status']) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'destructive';
      case 'checking': return 'secondary';
      case 'unchecked':
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bookmark Details</DialogTitle>
          <DialogDescription>
            Viewing metadata for: <span className="font-semibold">{bookmark.title}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6 mb-4">
          <dl className="space-y-1 text-sm">
            <MetadataRow label="ID" value={bookmark.id} />
            <MetadataRow label="Title" value={bookmark.title} />
            {bookmark.type === 'link' && <MetadataRow label="URL" value={bookmark.url} />}
            <MetadataRow label="Type" value={bookmark.type === 'link' ? 'Link' : 'Group'} />
            <MetadataRow label="Clicks" value={bookmark.clicks.toString()} />
            <MetadataRow label="Date Added" value={formatDate(bookmark.addDate)} />
            <MetadataRow label="Last Clicked" value={formatDate(bookmark.lastClickDate)} />
            <MetadataRow label="Archived" value={bookmark.isArchived ? 'Yes' : 'No'} />
            {!bookmark.isArchived && ( // Pinned status is only relevant for non-archived items
              <MetadataRow label="Pinned" value={bookmark.isPinned ? 'Yes' : 'No'} />
            )}
            
            {bookmark.type === 'link' && (
              <>
                <MetadataRow 
                  label="Status" 
                  value={
                    <Badge variant={getStatusBadgeVariant(bookmark.status)} className="capitalize">
                      {bookmark.status || 'Unchecked'}
                    </Badge>
                  } 
                />
                <MetadataRow label="Last Checked" value={formatDate(bookmark.lastCheckDate)} />
                {bookmark.status === 'offline' && (
                  <MetadataRow label="Offline Since" value={formatDate(bookmark.offlineSince)} />
                )}
              </>
            )}

            <MetadataRow label="Parent Group" value={getParentGroupName(bookmark.parentId)} />

            {bookmark.dynamicParamKeys && bookmark.dynamicParamKeys.length > 0 && (
              <MetadataRow 
                label="Dynamic Params" 
                value={bookmark.dynamicParamKeys.join(', ')} 
              />
            )}
          </dl>
        </ScrollArea>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkMetadataDialog;