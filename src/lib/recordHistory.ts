/**
 * Record versioning — saves snapshots to record_history table.
 */
import { supabase } from "@/integrations/supabase/client";

export async function saveRecordVersion(params: {
  entity: string;
  recordId: string;
  dataSnapshot: any;
  changedByName?: string;
}): Promise<void> {
  try {
    const session = (await supabase.auth.getSession()).data.session;

    // Get current max version
    const { data: existing } = await supabase
      .from("record_history" as any)
      .select("version_number")
      .eq("entity", params.entity)
      .eq("record_id", params.recordId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = ((existing as any)?.[0]?.version_number || 0) + 1;

    await supabase.from("record_history" as any).insert({
      entity: params.entity,
      record_id: params.recordId,
      version_number: nextVersion,
      data_snapshot: params.dataSnapshot,
      changed_by: session?.user?.id || null,
      changed_by_name: params.changedByName || "",
    });
  } catch (err) {
    console.error("[RecordHistory] Falha ao salvar versão:", err);
  }
}

export async function getRecordVersions(entity: string, recordId: string) {
  const { data, error } = await supabase
    .from("record_history" as any)
    .select("*")
    .eq("entity", entity)
    .eq("record_id", recordId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("[RecordHistory] Falha ao buscar versões:", error);
    return [];
  }
  return data || [];
}
