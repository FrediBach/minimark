import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface WordFrequencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wordStats: Array<{ word: string; count: number }>;
  onApplySelection: (selectedWords: string[]) => void;
}

const WordFrequencyDialog: React.FC<WordFrequencyDialogProps> = ({
  isOpen,
  onClose,
  wordStats,
  onApplySelection,
}) => {
  const [selectedWordsInDialog, setSelectedWordsInDialog] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedWordsInDialog(new Set()); // Reset selection when dialog opens
    }
  }, [isOpen]);

  const handleToggleWordSelection = (word: string) => {
    setSelectedWordsInDialog(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    onApplySelection(Array.from(selectedWordsInDialog));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Frequent Words in Titles</DialogTitle>
          <DialogDescription>
            Select words to add corresponding bookmarks to your current selection.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6">
          <div className="space-y-3 py-4">
            {wordStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">No significant words found in the current view.</p>
            )}
            {wordStats.map(({ word, count }) => (
              <div key={word} className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`word-${word}`}
                    checked={selectedWordsInDialog.has(word)}
                    onCheckedChange={() => handleToggleWordSelection(word)}
                  />
                  <label
                    htmlFor={`word-${word}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {word}
                  </label>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedWordsInDialog.size === 0}>
            Apply Selection ({selectedWordsInDialog.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WordFrequencyDialog;