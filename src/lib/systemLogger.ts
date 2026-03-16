/**
 * System error logger — writes to system_logs table.
 * Falls back to console if offline.
 */
import { supabase } from "@/integrations/supabase/client";

export async function logSystemError(
  module: string,
  message: string,
  details?: any,
  userId?: string
): Promise<void> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    await supabase.from("system_logs" as any).insert({
      level: "error",
      module,
      message,
      details: details || null,
      user_id: userId || session?.user?.id || null,
    });
  } catch (err) {
    console.error("[SystemLog] Falha ao registrar erro:", module, message, err);
  }
}

export async function logSystemInfo(
  module: string,
  message: string,
  details?: any
): Promise<void> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    await supabase.from("system_logs" as any).insert({
      level: "info",
      module,
      message,
      details: details || null,
      user_id: session?.user?.id || null,
    });
  } catch (err) {
    console.error("[SystemLog] Falha ao registrar info:", module, message, err);
  }
}
