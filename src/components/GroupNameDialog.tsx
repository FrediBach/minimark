import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GroupNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupName: string) => void;
  title?: string;
  description?: string;
  inputLabel?: string;
  submitButtonText?: string;
}

const GroupNameDialog: React.FC<GroupNameDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Enter Group Name",
  description = "Please provide a name for the new group.",
  inputLabel = "Group Name",
  submitButtonText = "Create Group",
}) => {
  const [groupName, setGroupName] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setGroupName(''); // Reset on open
      // Focus the input when the dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure dialog is rendered
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (groupName.trim()) {
      onSubmit(groupName.trim());
      onClose();
    } else {
      // Optionally, show an error within the dialog or use a toast
      console.error("Group name cannot be empty.");
      inputRef.current?.focus();
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="group-name-input" className="text-right col-span-1">
              {inputLabel}
            </label>
            <Input
              id="group-name-input"
              ref={inputRef}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="col-span-3"
              placeholder="e.g., Work Projects"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{submitButtonText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupNameDialog;