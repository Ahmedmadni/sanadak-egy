import { useRef, useState } from "react";
import { FileText, Upload, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStorageUpload } from "@/lib/use-storage-upload";
import { useSanadak } from "@/lib/sanadak-context";

export function DocumentUpload({
  tenantId, kind, label, required, note, referenceNote, onUploaded,
}: {
  tenantId: string; kind: string; label: string; required?: boolean; note?: string;
  referenceNote?: string; onUploaded?: () => void;
}) {
  const { lang } = useSanadak();
  const { upload, uploading } = useStorageUpload("tenant-documents");
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    try {
      const path = await upload(tenantId, file);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("tenant_documents" as any).insert({
        tenant_id: tenantId, kind, file_path: path, uploaded_by: user?.id ?? null,
        note: referenceNote || null,
      });
      if (error) throw error;
      setDone(true);
      setFileName(file.name);
      onUploaded?.();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${done ? "bg-[var(--emerald)]/15 text-[var(--emerald)]" : "bg-foreground/5 text-muted-foreground"}`}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>
          {label}{required && <span className="text-destructive"> *</span>}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {fileName ?? note ?? (lang === "ar" ? "PDF أو صورة" : "PDF or image")}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}
        className="h-9 px-3 rounded-full glass-panel text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0">
        <Upload className="h-3.5 w-3.5" /> {done ? (lang === "ar" ? "استبدال" : "Replace") : (lang === "ar" ? "رفع" : "Upload")}
      </button>
    </div>
  );
}
