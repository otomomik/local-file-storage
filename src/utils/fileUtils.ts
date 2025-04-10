import fs from "fs/promises";
import { open as fsOpen } from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { lookup } from "mime-types";

// Check if a file or directory name starts with a dot
export function isDotFile(fileName: string): boolean {
  return fileName.startsWith('.');
}

// Check if any part of a path contains a dot file or folder
export function containsDotFileOrFolder(filePath: string): boolean {
  return filePath.split(path.sep).some(part => part.startsWith('.'));
}

// Format URL path for directories
export function formatUrlPath(relativePath: string): string {
  if (relativePath === '.' || relativePath === '') {
    return '';
  }
  
  // Split path into segments and encode each segment
  const segments = relativePath.split(path.sep).filter(Boolean);
  return segments.map(segment => encodeURIComponent(segment)).join('/');
}

// Parse URL path back to filesystem path
export function parseUrlPath(urlPath: string): string {
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
export async function listDirectory(dirPath: string) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    // Filter out files and directories that start with a dot
    return files
      .filter(file => !isDotFile(file.name))
      .map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(dirPath, file.name)
      }));
  } catch (error) {
    console.error(`Error listing directory ${dirPath}:`, error);
    return [];
  }
}

// Read first N bytes of a file to determine its type
export async function readFirstNBytes(filePath: string, bytesToRead: number = 1024): Promise<Buffer> {
  // Skip dot files
  if (containsDotFileOrFolder(filePath)) {
    return Buffer.alloc(0);
  }
  
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
export async function determineFileType(filePath: string, fileName: string): Promise<{ mimeType: string, isText: boolean }> {
  // Skip dot files
  if (containsDotFileOrFolder(filePath) || isDotFile(fileName)) {
    return { mimeType: "application/octet-stream", isText: false };
  }
  
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
export function isTextFile(mimeType: string, fileName: string, sampleBuffer?: Buffer): boolean {
  // Skip dot files
  if (isDotFile(fileName)) {
    return false;
  }
  
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
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// Determine if a file is audio
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

// Determine if a file is video
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

// Determine if a file is PDF
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

// Resolve path and verify it's within the target directory
export function resolvePath(requestPath: string, targetDirectory: string): { fullPath: string; relativePath: string } {
  // Parse URL path to get the actual directory path
  const relativeDirPath = parseUrlPath(requestPath);
  
  // Resolve full path
  const fullPath = path.resolve(targetDirectory, relativeDirPath);
  
  // Security check: ensure the path is within target directory
  if (!fullPath.startsWith(targetDirectory)) {
    return { fullPath: targetDirectory, relativePath: '.' };
  }
  
  // Calculate relative path from the target directory
  let relativePath = path.relative(targetDirectory, fullPath) || '.';
  
  // Check if relativePath contains `..` (reference to parent directory)
  // If so, reset to root directory for security
  if (relativePath === '..' || relativePath.startsWith('../') || relativePath.includes('/..')) {
    console.log(`Security: Blocked access to parent directory: ${relativePath}`);
    return { fullPath: targetDirectory, relativePath: '.' };
  }
  
  // If the path contains any dot files or folders, redirect to the parent directory
  if (containsDotFileOrFolder(relativePath)) {
    const parentPath = path.dirname(fullPath);
    const parentRelativePath = path.relative(targetDirectory, parentPath) || '.';
    
    // Double check parent path doesn't contain ..
    if (parentRelativePath === '..' || parentRelativePath.startsWith('../')) {
      return { fullPath: targetDirectory, relativePath: '.' };
    }
    
    return { fullPath: parentPath, relativePath: parentRelativePath };
  }
  
  return { fullPath, relativePath };
}

// Build breadcrumb navigation
export function buildBreadcrumbs(relativePath: string) {
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