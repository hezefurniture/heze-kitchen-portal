"use client";

interface QueuedScan {
  id: string;
  url: string;
  body: any;
  timestamp: number;
}

const QUEUE_KEY = "kitchens-portal-scan-queue";

function getQueue(): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedScan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(url: string, body: any) {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    body,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function flushQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedScan[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        succeeded++;
      } else {
        // Server rejected it (e.g. item already scanned) - don't retry
        succeeded++;
      }
    } catch {
      // Network error - keep in queue
      remaining.push(item);
      failed++;
    }
  }

  saveQueue(remaining);
  return { succeeded, failed };
}

export function clearQueue() {
  saveQueue([]);
}
