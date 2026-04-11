import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, STORAGE_BUCKET, type Item } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const ITEMS_QUERY_KEY = ["supabase-items"];

// GET /items (Direct from Supabase)
export function useItems() {
  return useQuery({
    queryKey: ITEMS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        throw new Error(error.message);
      }

      return data as Item[];
    },
  });
}

// POST /items (Upload to storage, then insert to DB)
export interface UploadItemPayload {
  file: File;
  category: string;
  language: string;
  customName?: string;
}

export function useUploadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category, language, customName }: UploadItemPayload) => {
      // 1. Generate safe unique filename
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${Date.now()}-${uuidv4()}.${ext}`;

      // 2. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      if (!publicUrlData.publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      // 4. Determine display name
      const displayName = customName || file.name.replace(`.${ext}`, "");

      // 5. Insert into Database
      const { data: insertData, error: dbError } = await supabase
        .from("items")
        .insert([
          {
            name: displayName,
            url: publicUrlData.publicUrl,
            category,
            language,
          },
        ])
        .select()
        .single();

      if (dbError) {
        console.error("Supabase DB insert error:", dbError);
        throw new Error(`Failed to save record: ${dbError.message}`);
      }

      return insertData as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    },
  });
}

// DELETE /items
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Item) => {
      if (!item.id) throw new Error("Item ID is required");

      // 1. Delete from storage (Extract filename from URL)
      // Format: https://[...]/storage/v1/object/public/[bucket]/[filename]
      const urlParts = item.url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([fileName]);
        
        if (storageError) {
          console.warn("Storage deletion warning (might already be deleted):", storageError);
        }
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (dbError) {
        throw new Error(`Failed to delete record: ${dbError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    },
  });
}

// PATCH /items (Update name)
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("items")
        .update({ name })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update item: ${error.message}`);
      }

      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    },
  });
}
