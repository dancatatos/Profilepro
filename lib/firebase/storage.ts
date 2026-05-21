import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "./client";
import { uid } from "@/lib/utils";

/**
 * Upload an image to Firebase Storage and return its download URL.
 * Falls back to a local object URL when Firebase isn't configured,
 * so the builder UI still works during local development.
 */
export async function uploadImage(
  ownerId: string,
  file: File,
  folder: "avatars" | "covers" | "gallery" | "products" | "media" = "media",
): Promise<string> {
  if (!isFirebaseConfigured) {
    return URL.createObjectURL(file);
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `users/${ownerId}/${folder}/${uid("img")}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function deleteImage(downloadUrl: string): Promise<void> {
  if (!isFirebaseConfigured || downloadUrl.startsWith("blob:")) return;
  try {
    await deleteObject(ref(storage, downloadUrl));
  } catch {
    // Already removed or not a storage URL — safe to ignore.
  }
}
