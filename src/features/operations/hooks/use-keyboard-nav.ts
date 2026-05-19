"use client";

import { useEffect, useCallback } from "react";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";

interface KeyboardNavConfig {
  items: OperationalQueueItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenWhatsApp: (item: OperationalQueueItem) => void;
  onStatusChange: (item: OperationalQueueItem, status: LifecycleStatus) => void;
  onDismiss: (item: OperationalQueueItem) => void;
  onClose: () => void;
  onFocusSearch: () => void;
}

export function useKeyboardNav({
  items,
  selectedIndex,
  onSelectIndex,
  onOpenWhatsApp,
  onStatusChange,
  onDismiss,
  onClose,
  onFocusSearch,
}: KeyboardNavConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("role") === "textbox";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (isInput) return;

      const currentItem = items[selectedIndex];

      switch (e.key) {
        case "j":
        case "J":
          e.preventDefault();
          if (selectedIndex < items.length - 1) {
            onSelectIndex(selectedIndex + 1);
          }
          break;
        case "k":
        case "K":
          e.preventDefault();
          if (selectedIndex > 0) {
            onSelectIndex(selectedIndex - 1);
          }
          break;
        case "Enter":
          e.preventDefault();
          if (currentItem) {
            onOpenWhatsApp(currentItem);
          }
          break;
        case "r":
        case "R":
          e.preventDefault();
          if (currentItem) {
            onStatusChange(currentItem, "responded");
          }
          break;
        case "p":
        case "P":
          e.preventDefault();
          if (currentItem) {
            onStatusChange(currentItem, "promised");
          }
          break;
        case "x":
        case "X":
          e.preventDefault();
          if (currentItem) {
            onDismiss(currentItem);
          }
          break;
        case "e":
        case "E":
          e.preventDefault();
          if (currentItem) {
            onStatusChange(currentItem, "resolved");
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [items, selectedIndex, onSelectIndex, onOpenWhatsApp, onStatusChange, onDismiss, onClose, onFocusSearch]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
