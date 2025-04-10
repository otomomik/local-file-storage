import fs from 'fs';
import path from 'path';
import { determineFileType, isImageFile, isTextFile } from './fileUtils.js';

// File processing result interface
export interface ProcessedFileData {
  filePath: string; // Changed to store relative path
  type: 'text' | 'image' | 'other';
  content?: string; // Text content or base64 image
  mimeType?: string;
  processed: boolean;
}

// Storage for processed file data
export interface ProcessedFileStore {
  [filePath: string]: ProcessedFileData; // Keys are now relative paths
}

// Main file processing function
export async function processFile(fullPath: string, relativePath: string): Promise<ProcessedFileData> {
  try {
    const fileName = path.basename(fullPath);
    const { mimeType, isText } = await determineFileType(fullPath, fileName);
    
    // Check if file is a text file
    if (isText) {
      const content = await extractTextContent(fullPath);
      return {
        filePath: relativePath, // Store relative path
        type: 'text',
        content,
        mimeType,
        processed: true
      };
    }
    
    // Check if file is an image
    if (isImageFile(mimeType)) {
      const base64Content = await convertImageToBase64(fullPath, mimeType);
      return {
        filePath: relativePath, // Store relative path
        type: 'image',
        content: base64Content,
        mimeType,
        processed: true
      };
    }
    
    // Skip other file types for now
    return {
      filePath: relativePath, // Store relative path
      type: 'other',
      mimeType,
      processed: false
    };
  } catch (error) {
    console.error(`Error processing file ${relativePath}:`, error);
    return {
      filePath: relativePath, // Store relative path
      type: 'other',
      processed: false
    };
  }
}

// Extract text content from text files (limit to 1MB)
async function extractTextContent(filePath: string): Promise<string> {
  try {
    // Read up to 1MB of text
    const maxSize = 1024 * 1024; // 1MB
    const fileSize = fs.statSync(filePath).size;
    const fileHandle = await fs.promises.open(filePath, 'r');
    
    try {
      // If file is larger than max size, read only first part
      const bufferSize = Math.min(fileSize, maxSize);
      const buffer = Buffer.alloc(bufferSize);
      await fileHandle.read(buffer, 0, bufferSize, 0);
      
      return buffer.toString('utf-8');
    } finally {
      await fileHandle.close();
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return '';
  }
}

// Convert image to base64 (with size limit - 5MB)
async function convertImageToBase64(filePath: string, mimeType: string): Promise<string> {
  try {
    // Check file size first to avoid loading huge files
    const maxSize = 5 * 1024 * 1024; // 5MB
    const fileStats = fs.statSync(filePath);
    
    if (fileStats.size > maxSize) {
      console.warn(`Image ${filePath} is too large (${(fileStats.size / 1024 / 1024).toFixed(2)}MB), skipping base64 conversion`);
      return '';
    }
    
    // Read file and convert to base64
    const data = fs.readFileSync(filePath);
    const base64 = data.toString('base64');
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting image to base64 ${filePath}:`, error);
    return '';
  }
}

// Store processed file data
let processedFileStore: ProcessedFileStore = {};

// Load processed file store from disk
export function loadProcessedFileStore(storePath: string): ProcessedFileStore {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      processedFileStore = JSON.parse(data);
      return processedFileStore;
    }
  } catch (error) {
    console.error(`Error loading processed file store:`, error);
  }
  return {};
}

// Save processed file store to disk
export function saveProcessedFileStore(storePath: string): boolean {
  try {
    // Ensure directory exists
    const storeDir = path.dirname(storePath);
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify(processedFileStore, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving processed file store:`, error);
    return false;
  }
}

// Update processed file store with new data
export function updateProcessedFileStore(fileData: ProcessedFileData): void {
  if (fileData.processed) {
    processedFileStore[fileData.filePath] = fileData;
  }
}

// Get processed data for a file
export function getProcessedFileData(filePath: string): ProcessedFileData | undefined {
  return processedFileStore[filePath];
}

// Check if a file has been processed
export function isFileProcessed(filePath: string): boolean {
  return processedFileStore[filePath] !== undefined && processedFileStore[filePath].processed;
}

// Remove a file from the store
export function removeFileFromStore(filePath: string): void {
  if (processedFileStore[filePath]) {
    delete processedFileStore[filePath];
  }
}