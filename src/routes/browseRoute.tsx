import { type Context } from "hono";
import fs from "fs/promises";
import path from "path";
import { Breadcrumbs } from "../components/Breadcrumbs.js";
import { FileList } from "../components/FileList.js";
import { FilePreview } from "../components/FilePreview.js";
import { MainLayout } from "../layouts/MainLayout.js";
import { 
  resolvePath, 
  listDirectory, 
  determineFileType, 
  buildBreadcrumbs, 
  formatUrlPath 
} from "../utils/fileUtils.js";

export const browseHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      // Get the path from the URL
      const urlPath = c.req.path.replace(/^\/browse/, "") || "/";
      const { fullPath, relativePath } = resolvePath(urlPath, targetDirectory);
      
      // Check if path exists
      try {
        const stat = await fs.stat(fullPath);
        
        // If it's a file, show file preview
        if (!stat.isDirectory()) {
          const fileName = path.basename(fullPath);
          const { mimeType, isText } = await determineFileType(fullPath, fileName);
          
          const breadcrumbs = buildBreadcrumbs(path.dirname(relativePath));
          
          // For text files, read content (limited to 100KB)
          let textContent;
          let isLarge = false;
          
          if (isText) {
            const fileHandle = await fs.open(fullPath, 'r');
            try {
              const buffer = Buffer.alloc(100 * 1024); // 100KB
              const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
              textContent = buffer.slice(0, bytesRead).toString('utf-8');
              isLarge = stat.size > buffer.length;
            } finally {
              await fileHandle.close();
            }
          }
          
          // Render file preview
          return c.render(
            <MainLayout title={`Preview: ${fileName}`}>
              <h1 className="text-2xl font-bold mb-4">File Preview: {fileName}</h1>
              <Breadcrumbs items={breadcrumbs} currentName={fileName} />
              <FilePreview
                fileName={fileName}
                mimeType={mimeType}
                relativePath={relativePath}
                size={stat.size}
                content={textContent}
                isText={isText}
                isLarge={isLarge}
              />
            </MainLayout>
          );
        }
      } catch (error) {
        return c.render(
          <MainLayout title="Error">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h1 className="font-bold">Error</h1>
              <p>Path not found: {relativePath}</p>
            </div>
            <a 
              href="/browse/" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Return to root
            </a>
          </MainLayout>
        );
      }
      
      // List directory contents
      const files = await listDirectory(fullPath);
      const breadcrumbs = buildBreadcrumbs(relativePath);
      
      return c.render(
        <MainLayout title="Local File System">
          <h1 className="text-2xl font-bold mb-4">Local File System</h1>
          <p className="text-gray-600 mb-4">Browsing: {fullPath}</p>
          
          <Breadcrumbs 
            items={breadcrumbs.slice(0, -1)} 
            currentName={relativePath === '.' ? 'Home' : path.basename(relativePath)} 
          />
          
          <FileList 
            files={files} 
            relativePath={relativePath} 
          />
        </MainLayout>
      );
    } catch (error) {
      return c.render(
        <MainLayout title="Error">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h1 className="font-bold">Error</h1>
            <p>Failed to access path: {String(error)}</p>
          </div>
          <a 
            href="/browse/" 
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Return to root
          </a>
        </MainLayout>
      );
    }
  };
};