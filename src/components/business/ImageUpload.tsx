import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStorageUpload } from "@/lib/use-storage-upload";
import { useSanadak } from "@/lib/sanadak-context";

export function ImageUpload({
  tenantId, value, onChange, shape = "square",
}: {
  tenantId: string; value: string | null; onChange: (url: string) => void; shape?: "square" | "wide";
}) {
  const { lang } = useSanadak();
  const { upload, uploading, publicUrl } = useStorageUpload("tenant-media");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    try {
      const path = await upload(tenantId, file);
      onChange(publicUrl(path));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`relative overflow-hidden rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.02] grid place-items-center hover:border-[var(--emerald)]/50 transition-colors ${shape === "wide" ? "w-full h-32" : "h-24 w-24"}`}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className={`relative z-10 flex flex-col items-center gap-1 ${value ? "bg-black/40 text-white w-full h-full justify-center" : "text-muted-foreground"}`}>
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className={`text-[11px] ${lang === "ar" ? "font-arabic" : ""}`}>{value ? (lang === "ar" ? "تغيير" : "Change") : (lang === "ar" ? "رفع صورة" : "Upload")}</span>
        </div>
      </button>
    </div>
  );
}
