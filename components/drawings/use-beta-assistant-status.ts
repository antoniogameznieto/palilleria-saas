"use client";

import { useSyncExternalStore } from "react";

import type { ExperimentalAssistantStatus } from "@/lib/drawings/experimental-auto-takeoff-ui";

const STATUS_SELECTOR =
  '[data-testid="experimental-auto-takeoff-assistant-status"]';

function readBetaAssistantStatus(): ExperimentalAssistantStatus | null {
  if (typeof document === "undefined") {
    return null;
  }

  const statusNode = document.querySelector(STATUS_SELECTOR);
  if (!statusNode) {
    return null;
  }

  const status = statusNode.getAttribute("data-status");
  if (
    status === "not_analyzed" ||
    status === "analyzed" ||
    status === "with_selection" ||
    status === "imported" ||
    status === "requires_review"
  ) {
    return status;
  }

  return null;
}

function subscribeBetaAssistantStatus(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  let statusObserver: MutationObserver | null = null;

  const attachStatusObserver = () => {
    statusObserver?.disconnect();
    statusObserver = null;

    const statusNode = document.querySelector(STATUS_SELECTOR);
    if (!statusNode) {
      return;
    }

    statusObserver = new MutationObserver(onStoreChange);
    statusObserver.observe(statusNode, {
      attributes: true,
      attributeFilter: ["data-status"],
    });
  };

  attachStatusObserver();

  const rootObserver = new MutationObserver(() => {
    attachStatusObserver();
    onStoreChange();
  });

  rootObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-status"],
  });

  return () => {
    statusObserver?.disconnect();
    rootObserver.disconnect();
  };
}

export function useBetaAssistantStatus(): ExperimentalAssistantStatus | null {
  return useSyncExternalStore(
    subscribeBetaAssistantStatus,
    readBetaAssistantStatus,
    () => null,
  );
}

export function useBetaAssistantNotAnalyzed(): boolean {
  const status = useBetaAssistantStatus();
  return status === null || status === "not_analyzed";
}

export function useBetaAssistantReviewFocus(): boolean {
  const status = useBetaAssistantStatus();
  return status === "analyzed" || status === "with_selection";
}
