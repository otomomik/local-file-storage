import { type Context } from "hono";
import { createReadStream } from "fs";
import fs from "fs/promises";
import { resolvePath, determineFileType } from "../utils/fileUtils.js";

export const downloadHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const urlPath = c.req.path.replace(/^\/download/, "") || "/";
      const { fullPath } = resolvePath(urlPath, targetDirectory);
      
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          return c.json({ error: "Cannot download directory" }, 400);
        }
        
        const fileName = fullPath.split('/').pop() || '';
        const { mimeType } = await determineFileType(fullPath, fileName);
        
        // Create ReadableStream from file
        const fileStream = createReadStream(fullPath);
        
        // Convert Node.js stream to web stream that Hono can handle
        const readableStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => {
              controller.enqueue(chunk);
            });
            
            fileStream.on('end', () => {
              controller.close();
            });
            
            fileStream.on('error', (err) => {
              controller.error(err);
            });
          }
        });
        
        return new Response(readableStream, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          }
        });
      } catch (error) {
        return c.json({ error: "File not found" }, 404);
      }
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  };
};