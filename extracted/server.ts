import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware with custom limits for large payloads (e.g. base64 images if needed)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route to securely delete Cloudinary images
  app.post("/api/delete-cloudinary-image", async (req, res) => {
    try {
      const { publicIds } = req.body;
      if (!publicIds || !Array.isArray(publicIds)) {
        return res.status(400).json({ error: "Missing or invalid publicIds array" });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "rqf1hlrx";
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.warn("[Cloudinary Delete API] API key or Secret missing in server environment. Skipping Cloudinary deletion.");
        return res.json({ 
          success: true, 
          warning: "Cloudinary credentials not configured on server. Image cleanup skipped.",
          results: [] 
        });
      }

      const results = [];
      const errors = [];

      for (const rawPublicId of publicIds) {
        if (!rawPublicId || typeof rawPublicId !== "string") continue;
        
        // Ensure clean public_id extraction if a full URL was passed
        let publicId = rawPublicId;
        if (rawPublicId.includes("cloudinary.com")) {
          const uploadIndex = rawPublicId.indexOf("/image/upload/");
          if (uploadIndex !== -1) {
            let path = rawPublicId.substring(uploadIndex + "/image/upload/".length);
            const segments = path.split("/").filter(Boolean);
            const cleanSegments = segments.filter(seg => 
              !seg.includes(",") && 
              !/^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) &&
              !/^v\d+$/.test(seg)
            );
            if (cleanSegments.length > 0) {
              publicId = cleanSegments.join("/");
              const lastDot = publicId.lastIndexOf(".");
              if (lastDot !== -1) {
                publicId = publicId.substring(0, lastDot);
              }
            }
          }
        }
        
        try {
          const timestamp = Math.round(new Date().getTime() / 1000).toString();
          const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
          const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

          const params = new URLSearchParams();
          params.append("public_id", publicId);
          params.append("api_key", apiKey);
          params.append("timestamp", timestamp);
          params.append("signature", signature);

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          const data = await response.json().catch(() => ({ result: "error" }));
          console.log(`[Cloudinary Destroy] public_id: '${publicId}' -> result:`, data.result);

          if (data.result === "ok" || data.result === "not_found") {
            results.push({ publicId, status: data.result });
          } else {
            console.warn(`[Cloudinary Destroy Warning] '${publicId}' returned result: ${data.result}`);
            results.push({ publicId, status: data.result || "failed" });
          }
        } catch (err: any) {
          console.error(`[Cloudinary Destroy Error] Failed for '${publicId}':`, err);
          errors.push({ publicId, error: err.message || String(err) });
        }
      }

      return res.json({ success: true, results, errors });
    } catch (error: any) {
      console.error("Error in delete-cloudinary-image endpoint:", error);
      return res.json({ success: true, warning: error.message || "Internal Server Error", results: [] });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // Endpoint to download Debug APK
  app.get("/api/download/debug", (req, res) => {
    const filePath = path.join(process.cwd(), "app-debug.apk");
    res.download(filePath, "app-debug.apk", (err) => {
      if (err) {
        console.error("Failed to download debug APK from root, trying build outputs folder:", err);
        const fallbackPath = path.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
        res.download(fallbackPath, "app-debug.apk", (err2) => {
          if (err2) {
            res.status(404).send("Debug APK not found. Please run the build script first.");
          }
        });
      }
    });
  });

  // Endpoint to download Release APK
  app.get("/api/download/release", (req, res) => {
    const filePath = path.join(process.cwd(), "app-release-unsigned.apk");
    res.download(filePath, "app-release-unsigned.apk", (err) => {
      if (err) {
        console.error("Failed to download release APK from root, trying build outputs folder:", err);
        const fallbackPath = path.join(process.cwd(), "android/app/build/outputs/apk/release/app-release-unsigned.apk");
        res.download(fallbackPath, "app-release-unsigned.apk", (err2) => {
          if (err2) {
            res.status(404).send("Release APK not found. Please run the build script first.");
          }
        });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
