import { buildApiUrl, getCloudinaryConfig } from "./backendConfig";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export function extractPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const uploadIndex = url.indexOf("/image/upload/");
    if (uploadIndex === -1) return null;
    
    let path = url.substring(uploadIndex + "/image/upload/".length);
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const cleanSegments: string[] = [];
    for (const seg of segments) {
      if (
        seg.includes(",") ||
        /^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) ||
        /^v\d+$/.test(seg)
      ) {
        continue;
      }
      cleanSegments.push(seg);
    }

    if (cleanSegments.length === 0) return null;

    let publicId = cleanSegments.join("/");
    const lastDotIndex = publicId.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      publicId = publicId.substring(0, lastDotIndex);
    }

    return publicId || null;
  } catch (e) {
    console.error("Failed to extract public_id from Cloudinary URL:", url, e);
    return null;
  }
}

export async function uploadImageToCloudinary(uriOrBase64: string): Promise<CloudinaryUploadResult> {
  if (!uriOrBase64) {
    throw new Error("No image data provided for Cloudinary upload.");
  }

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const formData = new FormData();

    if (uriOrBase64.startsWith("data:") || uriOrBase64.startsWith("http")) {
      formData.append("file", uriOrBase64);
    } else {
      formData.append("file", {
        uri: uriOrBase64,
        type: "image/jpeg",
        name: `part_${Date.now()}.jpg`,
      } as any);
    }

    formData.append("upload_preset", uploadPreset);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let cleanMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          cleanMessage = parsed.error.message;
        }
      } catch (e) {}
      throw new Error(`Cloudinary upload failed: ${cleanMessage}`);
    }

    const data = await response.json();
    if (!data.secure_url || !data.public_id) {
      throw new Error("Cloudinary response missing secure_url or public_id.");
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(error.message || "Failed to upload image to Cloudinary.");
  }
}

export async function deleteImagesFromCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) return;

  const validPublicIds: string[] = [];
  for (const item of publicIds) {
    if (!item) continue;
    const pid = extractPublicId(item) || item;
    if (pid && !validPublicIds.includes(pid)) {
      validPublicIds.push(pid);
    }
  }

  if (validPublicIds.length === 0) return;

  try {
    const response = await fetch(buildApiUrl("/api/delete-cloudinary-image"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicIds: validPublicIds }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Cloudinary images successfully requested for deletion:", data);
    } else {
      console.warn("Cloudinary image deletion API returned error status:", response.status);
    }
  } catch (error) {
    console.warn("Non-fatal error purging images from Cloudinary:", error);
  }
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  await deleteImagesFromCloudinary([publicId]);
}
