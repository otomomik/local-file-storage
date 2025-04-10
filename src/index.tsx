import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import path from "path";
import process from "process";
import fs from "fs/promises";
import { open as fsOpen } from "fs/promises";
import open from "open";
import { createReadStream } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { lookup } from "mime-types";

const callingDirectory = process.argv[2] || process.cwd();
const userRelativePath = process.argv[3] || ".";
const targetDirectory = path.resolve(callingDirectory, userRelativePath);

const app = new Hono();

app.use(
  jsxRenderer(({ children }) => {
    return (
      <html>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <script src="https://unpkg.com/htmx.org@2.0.4"></script>
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <style>{`
            body {
              font-family: sans-serif;
              padding: 1rem;
            }
            .file-list {
              margin-top: 1rem;
            }
            .file-item {
              padding: 0.5rem;
              border-bottom: 1px solid #eee;
            }
            .breadcrumbs {
              margin: 1rem 0;
              padding: 0.5rem;
              background-color: #f8f9fa;
              border-radius: 4px;
            }
            .breadcrumbs a {
              color: #0d6efd;
              text-decoration: none;
            }
            .breadcrumbs a:hover {
              text-decoration: underline;
            }
            .breadcrumbs span {
              color: #6c757d;
              font-weight: 500;
            }
            .file-preview {
              margin-top: 1rem;
              padding: 1rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background-color: #f8f9fa;
            }
            .preview-image {
              max-width: 100%;
              height: auto;
            }
            .code-preview {
              white-space: pre-wrap;
              font-family: monospace;
              background-color: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
            }
            .download-link {
              display: inline-block;
              margin-top: 1rem;
              padding: 0.5rem 1rem;
              background-color: #0d6efd;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
            .download-link:hover {
              background-color: #0b5ed7;
            }
            .preview-actions {
              margin: 1rem 0;
              display: flex;
              gap: 1rem;
            }
          `}</style>
        </head>
        <body>{children}</body>
      </html>
    );
  }),
);

// Format URL path for directories
function formatUrlPath(relativePath: string): string {
  if (relativePath === '.' || relativePath === '') {
    return '';
  }
  
  // Split path into segments and encode each segment
  const segments = relativePath.split(path.sep).filter(Boolean);
  return segments.map(segment => encodeURIComponent(segment)).join('/');
}

// Parse URL path back to filesystem path
function parseUrlPath(urlPath: string): string {
  if (!urlPath || urlPath === '/') {
    return '.';
  }
  
  // Remove leading slash if present
  const cleanPath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
  
  // Split by "/" and decode each segment
  const segments = cleanPath.split('/').filter(Boolean);
  
  // Decode each segment and join with platform-specific separator
  return segments.map(segment => decodeURIComponent(segment)).join(path.sep);
}

// List files in a directory
async function listDirectory(dirPath: string) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(dirPath, file.name)
    }));
  } catch (error) {
    console.error(`Error listing directory ${dirPath}:`, error);
    return [];
  }
}

// Resolve path and verify it's within the target directory
function resolvePath(requestPath: string): { fullPath: string; relativePath: string } {
  // Parse URL path to get the actual directory path
  const relativeDirPath = parseUrlPath(requestPath);
  
  // Resolve full path
  const fullPath = path.resolve(targetDirectory, relativeDirPath);
  
  // Security check: ensure the path is within target directory
  if (!fullPath.startsWith(targetDirectory)) {
    return { fullPath: targetDirectory, relativePath: '.' };
  }
  
  // Calculate relative path from the target directory
  const relativePath = path.relative(targetDirectory, fullPath) || '.';
  
  return { fullPath, relativePath };
}

// Build breadcrumb navigation
function buildBreadcrumbs(relativePath: string) {
  const pathParts = relativePath === '.' ? [] : relativePath.split(path.sep);
  const breadcrumbs = [
    { name: '🏠', path: '/browse/' }
  ];
  
  let currentPath = '';
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i]) {
      currentPath = currentPath ? path.join(currentPath, pathParts[i]) : pathParts[i];
      breadcrumbs.push({
        name: pathParts[i],
        path: '/browse/' + formatUrlPath(currentPath)
      });
    }
  }
  
  return breadcrumbs;
}

// Read first N bytes of a file to determine its type
async function readFirstNBytes(filePath: string, bytesToRead: number = 1024): Promise<Buffer> {
  const fileHandle = await fsOpen(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    await fileHandle.close();
  }
}

// Determine file type using first N bytes
async function determineFileType(filePath: string, fileName: string): Promise<{ mimeType: string, isText: boolean }> {
  try {
    // Read only first 1024 bytes for type detection
    const sampleBuffer = await readFirstNBytes(filePath, 1024);
    
    // Try to detect file type from content
    const fileType = await fileTypeFromBuffer(sampleBuffer);
    let mimeType = fileType?.mime;
    
    // Fall back to extension-based detection if content-based detection fails
    if (!mimeType) {
      mimeType = lookup(filePath) || "application/octet-stream";
    }
    
    // Determine if it's text
    const isTextContent = isTextFile(mimeType, fileName, sampleBuffer);
    
    return { mimeType, isText: isTextContent };
  } catch (error) {
    console.error(`Error determining file type for ${filePath}:`, error);
    return { mimeType: "application/octet-stream", isText: false };
  }
}

// Determine if a file is a text file based on MIME type, name and content inspection
function isTextFile(mimeType: string, fileName: string, sampleBuffer?: Buffer): boolean {
  // Common text MIME types
  const textMimeTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/typescript',
    'application/xml',
    'application/x-sh',
    'application/x-httpd-php'
  ];

  // Check if any text MIME type prefix matches
  if (textMimeTypes.some(type => mimeType.startsWith(type))) {
    return true;
  }

  // Check common text file extensions for backup
  const textExtensions = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', 
    '.xml', '.yaml', '.yml', '.ini', '.conf', '.sh', '.bat', '.ps1', '.csv'
  ];
  
  if (textExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
    return true;
  }
  
  // If we have sample content, try to determine if it's text by checking for binary content
  if (sampleBuffer && sampleBuffer.length > 0) {
    // Count binary (non-printable, non-whitespace) characters
    let binaryCount = 0;
    for (let i = 0; i < sampleBuffer.length; i++) {
      const byte = sampleBuffer[i];
      // Consider a byte binary if it's not a common ASCII character, whitespace, or control character
      // that's often found in text files
      if ((byte < 9 || (byte > 13 && byte < 32)) && byte !== 0) {
        binaryCount++;
      }
      
      // If more than 10% of the first bytes are binary, consider it a binary file
      if (binaryCount > sampleBuffer.length * 0.1) {
        return false;
      }
    }
    return true;
  }
  
  return false;
}

// Determine if a file is an image
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// Determine if a file is audio
function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

// Determine if a file is video
function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

// Determine if a file is PDF
function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

// Root handler redirects to /browse/
app.get("/", (c) => {
  return c.redirect("/browse/");
});

// Direct raw file access (for embedding in preview)
app.get("/raw/*", async (c) => {
  try {
    const urlPath = c.req.path.replace(/^\/raw/, "") || "/";
    const { fullPath } = resolvePath(urlPath);
    
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return c.json({ error: "Cannot serve directory as raw file" }, 400);
      }
      
      const fileName = path.basename(fullPath);
      const { mimeType } = await determineFileType(fullPath, fileName);
      
      // Stream the file instead of loading it all in memory
      const stream = createReadStream(fullPath);
      return c.body(stream, 200, {
        "Content-Type": mimeType,
      });
    } catch (error) {
      return c.json({ error: "File not found" }, 404);
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Download handler
app.get("/download/*", async (c) => {
  try {
    const urlPath = c.req.path.replace(/^\/download/, "") || "/";
    const { fullPath } = resolvePath(urlPath);
    
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return c.json({ error: "Cannot download directory" }, 400);
      }
      
      const fileName = path.basename(fullPath);
      const { mimeType } = await determineFileType(fullPath, fileName);
      
      // Stream the file instead of loading it all in memory
      const stream = createReadStream(fullPath);
      return c.body(stream, 200, {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      });
    } catch (error) {
      return c.json({ error: "File not found" }, 404);
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Browser handler for directory navigation and file preview
app.get("/browse/*", async (c) => {
  try {
    // Get the path from the URL
    const urlPath = c.req.path.replace(/^\/browse/, "") || "/";
    const { fullPath, relativePath } = resolvePath(urlPath);
    
    // Check if path exists
    try {
      const stat = await fs.stat(fullPath);
      
      if (!stat.isDirectory()) {
        // This is a file, show a preview
        const fileName = path.basename(fullPath);
        const { mimeType, isText } = await determineFileType(fullPath, fileName);
        
        const breadcrumbs = buildBreadcrumbs(path.dirname(relativePath));
        
        // Generate preview based on file type
        let previewContent;
        
        if (isText) {
          // Text file preview - only read first 100KB to avoid memory issues with large text files
          const fileHandle = await fsOpen(fullPath, 'r');
          try {
            const buffer = Buffer.alloc(100 * 1024); // 100KB
            const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
            const textContent = buffer.slice(0, bytesRead).toString('utf-8');
            
            const hasMore = stat.size > buffer.length;
            
            previewContent = (
              <div>
                <div class="code-preview">
                  {textContent}
                </div>
                {hasMore && (
                  <div style="margin-top: 10px; font-style: italic;">
                    File is too large to display completely. Showing first 100KB only. 
                    <a href={`/download/${formatUrlPath(relativePath)}`}>Download the complete file</a>.
                  </div>
                )}
              </div>
            );
          } finally {
            await fileHandle.close();
          }
        } else if (isImageFile(mimeType)) {
          // Image preview
          const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
          previewContent = (
            <div class="file-preview">
              <img src={rawUrl} class="preview-image" alt={fileName} />
            </div>
          );
        } else if (isAudioFile(mimeType)) {
          // Audio preview
          const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
          previewContent = (
            <div class="file-preview">
              <audio controls>
                <source src={rawUrl} type={mimeType} />
                Your browser does not support the audio element.
              </audio>
            </div>
          );
        } else if (isVideoFile(mimeType)) {
          // Video preview
          const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
          previewContent = (
            <div class="file-preview">
              <video controls class="preview-video" width="100%">
                <source src={rawUrl} type={mimeType} />
                Your browser does not support the video element.
              </video>
            </div>
          );
        } else if (isPdfFile(mimeType)) {
          // PDF preview
          const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
          previewContent = (
            <div class="file-preview">
              <embed src={rawUrl} type={mimeType} width="100%" height="600px" />
            </div>
          );
        } else {
          // Generic file info for non-previewable files
          previewContent = (
            <div class="file-preview">
              <h3>File Information</h3>
              <p>Name: {fileName}</p>
              <p>Type: {mimeType}</p>
              <p>Size: {(stat.size / 1024).toFixed(2)} KB</p>
              <p>This file type cannot be previewed. Use the download button to access it.</p>
            </div>
          );
        }
        
        return c.render(
          <div class="container">
            <h1>File Preview: {fileName}</h1>
            
            {/* Breadcrumb navigation */}
            <div class="breadcrumbs">
              <a href="/browse/">🏠</a>
              {breadcrumbs.length > 1 && breadcrumbs.slice(1).map((crumb, index) => (
                <>
                  {" / "}
                  <a href={crumb.path}>{crumb.name}</a>
                </>
              ))}
              {" / "}<span>{fileName}</span>
            </div>
            
            <div class="preview-actions">
              <a href={`/download/${formatUrlPath(relativePath)}`} class="download-link">
                Download File
              </a>
            </div>
            
            {previewContent}
          </div>
        );
      }
    } catch (error) {
      return c.render(
        <div>
          <h1>Error</h1>
          <p>Path not found: {relativePath}</p>
          <p><a href="/browse/">Return to root</a></p>
        </div>
      );
    }
    
    // List directory contents
    const files = await listDirectory(fullPath);
    const breadcrumbs = buildBreadcrumbs(relativePath);
    
    return c.render(
      <div class="container">
        <h1>Local File System</h1>
        <p>Browsing: {fullPath}</p>
        
        {/* Breadcrumb navigation */}
        <div class="breadcrumbs">
          <a href="/browse/">🏠</a>
          {breadcrumbs.length > 1 && breadcrumbs.slice(1).map((crumb, index) => (
            <>
              {" / "}
              {index === breadcrumbs.slice(1).length - 1 ? (
                <span>{crumb.name}</span>
              ) : (
                <a href={crumb.path}>{crumb.name}</a>
              )}
            </>
          ))}
        </div>
        
        <div class="file-list">
          {/* Parent directory link if not at root */}
          {relativePath !== '.' && (
            <div class="file-item">
              <a href={'/browse/' + formatUrlPath(path.dirname(relativePath))}>📁 ..</a>
            </div>
          )}
          
          {/* File list */}
          {files.map(file => (
            <div class="file-item">
              {file.isDirectory ? (
                <a href={'/browse/' + formatUrlPath(path.join(relativePath, file.name))}>
                  📁 {file.name}
                </a>
              ) : (
                <a href={'/browse/' + formatUrlPath(path.join(relativePath, file.name))}>
                  📄 {file.name}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return c.render(
      <div>
        <h1>Error</h1>
        <p>Failed to access path: {String(error)}</p>
        <p><a href="/browse/">Return to root</a></p>
      </div>
    );
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    const url = `http://localhost:${info.port}/browse/`;
    // open(url);
    console.log(`Server is running on ${url}`);
    console.log(`Showing contents of: ${targetDirectory}`);
  },
);
