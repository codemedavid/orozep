import { useState } from 'react';

/**
 * Image upload hook backed by ImageKit.io.
 *
 * Flow (secure client-side upload):
 *   1. Fetch one-time { token, expire, signature, publicKey } from /api/imagekit-auth
 *      (the private key stays on the server).
 *   2. POST the file directly to ImageKit's upload endpoint.
 *   3. Return the public CDN URL.
 *
 * `folder` is used as the ImageKit folder path (keeps assets grouped the same
 * way the old Supabase buckets did, e.g. "menu-images", "payment-proofs").
 */
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const AUTH_ENDPOINT = '/api/imagekit-auth';

export const useImageUpload = (folder: string = 'menu-images') => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      setUploading(true);
      setUploadProgress(0);

      // ---- Validation (accept all common image formats, mobile-friendly) ----
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = [
        'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif',
        'svg', 'heic', 'heif', 'ico', 'avif', 'jfif'
      ];
      const hasValidExtension = !!fileExtension && validExtensions.includes(fileExtension);
      const hasValidMimeType = !file.type || file.type.startsWith('image/');

      if (!hasValidExtension && !hasValidMimeType) {
        throw new Error(
          `Please upload a valid image file. Supported: JPG, PNG, WebP, GIF, BMP, TIFF, SVG, HEIC, and more. ` +
          `File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}`
        );
      }
      if (file.size < 100) {
        throw new Error('The selected file appears to be invalid or empty. Please select a valid image.');
      }
      const maxSize = 25 * 1024 * 1024; // ImageKit free-plan image limit is 25MB
      if (file.size > maxSize) {
        throw new Error(`Image size must be less than 25MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // ---- 1. Get one-time auth params from our serverless endpoint ----
      const authRes = await fetch(AUTH_ENDPOINT, { method: 'GET' });
      if (!authRes.ok) {
        throw new Error(
          'Could not get upload authorization. If running locally, the /api endpoint ' +
          'only runs on Vercel (or `vercel dev`).'
        );
      }
      const { token, expire, signature, publicKey } = await authRes.json();
      if (!publicKey || !signature) {
        throw new Error('Upload authorization is misconfigured (missing ImageKit keys).');
      }

      // Simulated progress (ImageKit upload via fetch has no native progress event)
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 100);

      // ---- 2. Upload directly to ImageKit ----
      const fileExt = fileExtension || 'jpg';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', uniqueName);
      formData.append('publicKey', publicKey);
      formData.append('signature', signature);
      formData.append('expire', String(expire));
      formData.append('token', token);
      formData.append('folder', `/${folder}`);
      formData.append('useUniqueFileName', 'true');

      const uploadRes = await fetch(IMAGEKIT_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (progressInterval) clearInterval(progressInterval);

      if (!uploadRes.ok) {
        let message = `Upload failed (${uploadRes.status})`;
        try {
          const err = await uploadRes.json();
          message = err?.message || message;
        } catch { /* ignore parse errors */ }
        throw new Error(message);
      }

      const result = await uploadRes.json();
      setUploadProgress(100);

      if (!result?.url) {
        throw new Error('Upload failed: ImageKit did not return a URL.');
      }
      return result.url as string;
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('❌ Error uploading image to ImageKit:', error);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  /**
   * Removing the reference from the product/record is enough for the storefront.
   * Deleting the underlying ImageKit asset requires the private key (server-side)
   * and the file's fileId, which we don't persist — so this is intentionally a
   * no-op that resolves. (Orphaned assets can be cleaned in the ImageKit dashboard.)
   */
  const deleteImage = async (_imageUrl: string): Promise<void> => {
    return;
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
    uploadProgress,
  };
};
