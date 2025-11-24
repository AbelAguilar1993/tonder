/**
 * R2 Storage utility functions for file management
 */

/**
 * Upload file to R2 bucket
 */
export async function uploadFile(env, key, file, metadata = {}) {
  try {
    const bucket = env.STORAGE;

    if (!bucket) {
      throw new Error("R2 bucket not available - check STORAGE binding");
    }

    await bucket.put(key, file, {
      httpMetadata: {
        contentType: metadata.contentType || "application/octet-stream",
        cacheControl: metadata.cacheControl || "public, max-age=31536000",
      },
      customMetadata: metadata.customMetadata || {},
    });

    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

    return {
      success: true,
      key,
      url: publicUrl,
    };
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Get file from R2 bucket
 */
export async function getFile(env, key) {
  try {
    const bucket = env.STORAGE;
    const object = await bucket.get(key);

    if (!object) {
      return null;
    }

    return {
      body: object.body,
      metadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    };
  } catch (error) {
    throw new Error("File retrieval failed", error);
  }
}

/**
 * Delete file from R2 bucket
 */
export async function deleteFile(env, key) {
  try {
    const bucket = env.STORAGE;
    await bucket.delete(key);

    return { success: true };
  } catch (error) {
    throw new Error("File deletion failed", error);
  }
}

/**
 * List files in R2 bucket with prefix
 */
export async function listFiles(env, prefix = "", limit = 100) {
  try {
    const bucket = env.STORAGE;
    const objects = await bucket.list({ prefix, limit });

    return {
      objects: objects.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
      })),
      truncated: objects.truncated,
      cursor: objects.cursor,
    };
  } catch (error) {
    throw new Error("File listing failed", error);
  }
}

/**
 * Generate presigned URL for direct uploads
 */
export async function generatePresignedUrl(env, key, expiresIn = 3600) {
  try {
    return {
      url: `${env.R2_PUBLIC_URL}/upload/${key}`,
      fields: {},
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  } catch (error) {
    throw new Error("Presigned URL generation failed", error);
  }
}

/**
 * Validate file type and size
 */
export function validateFile(file, allowedTypes, maxSize) {
  const errors = [];

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  if (maxSize && file.size > maxSize) {
    errors.push(`File size ${file.size} exceeds maximum ${maxSize}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
