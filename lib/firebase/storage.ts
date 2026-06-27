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
  folder:
    | "avatars"
    | "covers"
    | "gallery"
    | "products"
    | "media"
    | "hero"
    | "university" = "media",
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

/**
 * Upload a short background video (MP4 / WebM) used by Hero + Cover
 * sections. Lands in a dedicated subfolder so storage.rules can apply
 * the larger size cap + video MIME validation only to these paths —
 * the regular /users/{uid}/... rule still enforces 5 MB image-only for
 * everything else.
 *
 * Cap is enforced again client-side (in VideoUploadField) so the user
 * gets a fast error before the upload starts; the rule is the source
 * of truth in case devtools is open.
 */
export async function uploadVideo(
  ownerId: string,
  file: File,
  folder: "hero" | "cover" = "hero",
): Promise<string> {
  if (!isFirebaseConfigured) {
    return URL.createObjectURL(file);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  // hero → "hero-video", cover → "cover-video" (matches storage.rules)
  const sub = folder === "hero" ? "hero-video" : "cover-video";
  const path = `users/${ownerId}/${sub}/${uid("vid")}.${ext}`;
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

/**
 * Upload a payment receipt to a path scoped to the owner. Anonymous
 * visitors can call this — storage rules allow create on this path
 * with a 5 MB size limit + image MIME validation. The owner's uid in
 * the path makes cross-owner reads impossible.
 *
 * Returns the public download URL which gets persisted on the
 * PaymentSubmission doc so the owner can view it from /payments.
 */
export async function uploadPaymentReceipt(
  ownerId: string,
  file: File,
): Promise<string> {
  if (!isFirebaseConfigured) return URL.createObjectURL(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `payment_receipts/${ownerId}/${uid("rcpt")}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
