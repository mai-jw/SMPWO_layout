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

      // Normalize item names: only remove special Unicode whitespace that was stored
      // inadvertently (full-width space, NBSP, etc.) while preserving intentional ASCII spaces
      const normalized = (data as Item[]).map((item) => ({
        ...item,
        name: item.name
          ? item.name.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, "").trim()
          : item.name,
        short_name: item.short_name
          ? item.short_name.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, "").trim()
          : item.short_name,
      }));

      return normalized;
    },
  });
}

// POST /items (Upload to storage, then insert to DB)
export interface UploadItemPayload {
  file: File;
  category: string;
  language: string;
  customName?: string;
  customShortName?: string;
  poster_type?: string;
}

export function useUploadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category, language, customName, customShortName, poster_type }: UploadItemPayload) => {
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
            short_name: customShortName ? customShortName.trim() : undefined,
            url: publicUrlData.publicUrl,
            category,
            language,
            poster_type: category === "poster" ? (poster_type || "") : undefined,
          },
        ])
        .select()
        .single();

      if (dbError) {
        console.error("Supabase DB insert error. Cleaning up orphaned storage file...", dbError);
        // Attempt to cleanup storage file if DB entry fails
        await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
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

// PATCH /items (Update metadata)
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, short_name, category, language, poster_type }: { id: string; name?: string; short_name?: string; category?: string; language?: string; poster_type?: string }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (short_name !== undefined) updates.short_name = short_name;
      if (category !== undefined) updates.category = category;
      if (language !== undefined) updates.language = language;
      if (poster_type !== undefined) updates.poster_type = poster_type;

      const { data, error } = await supabase
        .from("items")
        .update(updates)
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

// COPY /items
export function useCopyItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Item) => {
      if (!item.id) throw new Error("Item ID is required");

      // 1. Extract filename from URL
      const urlParts = item.url.split("/");
      const originalFileName = urlParts[urlParts.length - 1];

      // 2. Generate new safe unique filename
      const ext = originalFileName.split(".").pop() || "bin";
      const newFileName = `${Date.now()}-${uuidv4()}.${ext}`;

      // 3. Copy file in Storage
      const { error: copyError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .copy(originalFileName, newFileName);

      if (copyError) {
        console.error("Supabase storage copy error:", copyError);
        throw new Error(`Failed to copy image file: ${copyError.message}`);
      }

      // 4. Get Public URL for the new file
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(newFileName);

      // 5. Insert into Database
      const { data: insertData, error: dbError } = await supabase
        .from("items")
        .insert([
          {
            name: `${item.name} (コピー)`,
            short_name: item.short_name,
            url: publicUrlData.publicUrl,
            category: item.category,
            language: item.language,
            poster_type: item.poster_type,
          },
        ])
        .select()
        .single();

      if (dbError) {
        // Cleanup storage if DB insert fails
        await supabase.storage.from(STORAGE_BUCKET).remove([newFileName]);
        throw new Error(`Failed to save record copy: ${dbError.message}`);
      }

      return insertData as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    },
  });
}
