import { createResponse } from "../utils/cors.js";
import { uploadFile, validateFile } from "../utils/storage.js";

/**
 * Handle file uploads to R2 storage
 */
export async function handleUploadRequest(method, request, env, user) {
  if (method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Check authentication
  if (!user) {
    return createResponse({ error: "Authentication required" }, 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type") || "general"; // 'logo', 'banner', 'general'
    const entityId = formData.get("entityId"); // company ID or other entity

    if (!file) {
      return createResponse({ error: "No file provided" }, 400);
    }

    // Validate file based on type
    let allowedTypes = [];
    let maxSize = 0;
    let folder = "general";

    switch (type) {
      case "logo":
        allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        maxSize = 2 * 1024 * 1024; // 2MB
        folder = "logos";
        break;
      case "banner":
        allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        maxSize = 5 * 1024 * 1024; // 5MB
        folder = "banners";
        break;
      default:
        allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
        ];
        maxSize = 10 * 1024 * 1024; // 10MB
        folder = "files";
    }

    // Validate file
    const validation = validateFile(file, allowedTypes, maxSize);
    if (!validation.valid) {
      return createResponse(
        {
          error: "File validation failed",
          details: validation.errors,
        },
        400,
      );
    }

    // Generate unique key
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    // Upload to R2
    const result = await uploadFile(env, key, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.id.toString(),
        entityType: type,
        entityId: entityId || "",
        uploadedAt: new Date().toISOString(),
      },
    });

    return createResponse({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    return createResponse(
      {
        error: "Upload failed",
        details: error.message,
      },
      500,
    );
  }
}
