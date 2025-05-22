import { useState, useCallback } from 'react';
import { Bookmark } from '@/types';

export interface WordFrequencyStat {
  word: string;
  count: number;
}

export const useDialogManager = () => {
  // Metadata Dialog
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [selectedBookmarkForMetadata, setSelectedBookmarkForMetadata] = useState<Bookmark | null>(null);

  const openMetadataDialog = useCallback((bookmark: Bookmark) => {
    setSelectedBookmarkForMetadata(bookmark);
    setIsMetadataDialogOpen(true);
  }, []);

  const closeMetadataDialog = useCallback(() => {
    setIsMetadataDialogOpen(false);
    setSelectedBookmarkForMetadata(null);
  }, []);

  // Group Name Dialog
  const [isGroupNameDialogOpen, setIsGroupNameDialogOpen] = useState(false);
  const [groupNameDialogProps, setGroupNameDialogProps] = useState<{
    onSubmit: (name: string) => void;
    title?: string;
    description?: string;
    inputLabel?: string;
    submitButtonText?: string;
  } | null>(null);

  const openGroupNameDialog = useCallback(
    (
      onSubmit: (name: string) => void,
      title?: string,
      description?: string,
      inputLabel?: string,
      submitButtonText?: string
    ) => {
      setGroupNameDialogProps({ onSubmit, title, description, inputLabel, submitButtonText });
      setIsGroupNameDialogOpen(true);
    },
    []
  );

  const closeGroupNameDialog = useCallback(() => {
    setIsGroupNameDialogOpen(false);
    setGroupNameDialogProps(null);
  }, []);

  // Word Frequency Dialog
  const [isWordFrequencyDialogOpen, setIsWordFrequencyDialogOpen] = useState(false);
  const [wordStatsForDialog, setWordStatsForDialog] = useState<WordFrequencyStat[]>([]);

  const openWordFrequencyDialog = useCallback((stats: WordFrequencyStat[]) => {
    setWordStatsForDialog(stats);
    setIsWordFrequencyDialogOpen(true);
  }, []);

  const closeWordFrequencyDialog = useCallback(() => {
    setIsWordFrequencyDialogOpen(false);
    // Optionally clear stats: setWordStatsForDialog([]);
  }, []);

  return {
    // Metadata Dialog
    isMetadataDialogOpen,
    selectedBookmarkForMetadata,
    openMetadataDialog,
    closeMetadataDialog,

    // Group Name Dialog
    isGroupNameDialogOpen,
    groupNameDialogProps,
    openGroupNameDialog,
    closeGroupNameDialog,

    // Word Frequency Dialog
    isWordFrequencyDialogOpen,
    wordStatsForDialog,
    openWordFrequencyDialog,
    closeWordFrequencyDialog,
  };
};