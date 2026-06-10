"use client";

import { useSyncExternalStore } from "react";

const STATUS_SELECTOR =
  '[data-testid="experimental-auto-takeoff-assistant-status"]';

function readBetaAssistantNotAnalyzed(): boolean {
  if (typeof document === "undefined") {
    return true;
  }

  const statusNode = document.querySelector(STATUS_SELECTOR);
  if (!statusNode) {
    return true;
  }

  return statusNode.getAttribute("data-status") === "not_analyzed";
}

function subscribeBetaAssistantStatus(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const statusNode = document.querySelector(STATUS_SELECTOR);
  if (!statusNode) {
    return () => {};
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(statusNode, {
    attributes: true,
    attributeFilter: ["data-status"],
  });

  return () => observer.disconnect();
}

export function useBetaAssistantNotAnalyzed(): boolean {
  return useSyncExternalStore(
    subscribeBetaAssistantStatus,
    readBetaAssistantNotAnalyzed,
    () => true,
  );
}
