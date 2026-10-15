import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Bucket = "tenant-media" | "tenant-documents";

const UPLOAD_RULES: Record<Bucket, { maxBytes: number; mimeToExtension: Record<string, string> }> = {
  "tenant-documents": {
    maxBytes: 10 * 1024 * 1024,
    mimeToExtension: {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
  },
  "tenant-media": {
    maxBytes: 5 * 1024 * 1024,
    mimeToExtension: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
  },
};

export function useStorageUpload(bucket: Bucket) {
  const [uploading, setUploading] = useState(false);

  const upload = async (tenantId: string, file: File): Promise<string> => {
    const rules = UPLOAD_RULES[bucket];
    const ext = rules.mimeToExtension[file.type];

    if (!ext) {
      throw new Error(
        bucket === "tenant-documents"
          ? "Only PDF, JPEG, PNG, and WebP files are allowed."
          : "Only JPEG, PNG, and WebP images are allowed.",
      );
    }

    if (file.size <= 0 || file.size > rules.maxBytes) {
      const maxMb = Math.floor(rules.maxBytes / (1024 * 1024));
      throw new Error(`File size must be between 1 byte and ${maxMb} MB.`);
    }

    setUploading(true);
    try {
      const path = `${tenantId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
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
