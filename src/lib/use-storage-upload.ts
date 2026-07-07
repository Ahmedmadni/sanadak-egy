import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Bucket = "tenant-media" | "tenant-documents";

export function useStorageUpload(bucket: Bucket) {
  const [uploading, setUploading] = useState(false);

  const upload = async (tenantId: string, file: File): Promise<string> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${tenantId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) throw error;
      return path;
    } finally {
      setUploading(false);
    }
  };

  const publicUrl = (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const signedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  };

  return { upload, uploading, publicUrl, signedUrl };
}
