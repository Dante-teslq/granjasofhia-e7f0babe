/**
 * Sync engine: processes offline queue and syncs with Supabase.
 * Auto-retries on reconnection.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSyncQueue, removeFromQueue, updateQueueItem } from "./offlineSync";
import { logSystemError } from "./systemLogger";

const MAX_RETRIES = 5;
let isSyncing = false;
let listeners: Array<(pending: number) => void> = [];

export function onSyncStatusChange(fn: (pending: number) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

function notifyListeners(count: number) {
  listeners.forEach((fn) => fn(count));
}

export async function processQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getSyncQueue();
    notifyListeners(queue.length);

    for (const item of queue) {
      try {
        let error: any = null;

        if (item.action === "insert") {
          const res = await supabase.from(item.table).insert(item.payload);
          error = res.error;
        } else if (item.action === "upsert") {
          const res = await supabase
            .from(item.table)
            .upsert(item.payload, item.conflictColumns ? { onConflict: item.conflictColumns } : undefined);
          error = res.error;
        } else if (item.action === "update") {
          const { id: recordId, ...rest } = item.payload;
          const res = await supabase.from(item.table).update(rest).eq("id", recordId);
          error = res.error;
        } else if (item.action === "delete") {
          const res = await supabase.from(item.table).delete().eq("id", item.payload.id);
          error = res.error;
        }

        if (error) throw error;

        await removeFromQueue(item.id);
        synced++;
      } catch (err: any) {
        item.retries++;
        if (item.retries >= MAX_RETRIES) {
          await logSystemError("SyncEngine", `Falha permanente ao sincronizar: ${item.table}/${item.action}`, { item, error: err?.message });
          await removeFromQueue(item.id);
          failed++;
        } else {
          await updateQueueItem(item);
          failed++;
        }
      }
    }

    const remaining = await getSyncQueue();
    notifyListeners(remaining.length);
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

/** Start listening for online events to auto-sync */
export function startSyncListener() {
  const handleOnline = () => {
    processQueue();
  };

  window.addEventListener("online", handleOnline);

  // Also try syncing periodically (every 30s)
  const interval = setInterval(() => {
    if (navigator.onLine) {
      processQueue();
    }
  }, 30000);

  // Initial sync
  if (navigator.onLine) {
    setTimeout(() => processQueue(), 2000);
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
