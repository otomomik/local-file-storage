import * as lancedb from "@lancedb/lancedb";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';
import { determineFileType, isImageFile, readFirstNBytes } from './fileUtils.js';

// LanceDB file reference data structure
export interface FileReferenceData {
  path: string;      // Unique relative path 
  hash: string;      // File hash for change detection
  content: string;   // File content in base64
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Type for actual database operations with LanceDB
type LanceDbRecord = Record<string, unknown>;

export class LanceDbManager {
  private dbPath: string;
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;

  constructor(targetDirectory: string) {
    // Create the database in .local/lancedb directory
    this.dbPath = path.join(targetDirectory, '.local', "file-system", 'lancedb');
    
    // Ensure the directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  // Initialize the database connection and table
  async initialize(): Promise<void> {
    try {
      // Connect to the LanceDB database
      this.db = await lancedb.connect(this.dbPath);
      
      // Check if table exists
      const tableNames = await this.db.tableNames();
      
      if (tableNames.includes('file_references')) {
        // Open existing table
        this.table = await this.db.openTable('file_references');
      } else {
        // Create new table with schema
        const now = new Date().toISOString();
        const initialRecord: LanceDbRecord = {
          path: "__dummy__",
          hash: "0",
          content: "",
          created_at: now,
          updated_at: now
        };
        
        this.table = await this.db.createTable('file_references', [initialRecord], {
          mode: 'create'
        });
        await this.table.createIndex("content", {
            config: lancedb.Index.fts()
        });
        
        // Remove dummy record
        await this.table.delete('path = "__dummy__"');
      }
      
      return;
    } catch (error) {
      throw error;
    }
  }

  // Calculate hash for a file
  static calculateFileHash(filePath: string): string {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      return '';
    }
  }

  // Convert file content based on file type
  static async fileToBase64(filePath: string): Promise<string> {
    try {
      // Check file size first to avoid loading huge files
      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.size > maxSize) {
        return '';
      }
      
      // Use the existing determineFileType function which examines the first 1024 bytes
      const fileName = path.basename(filePath);
      const { mimeType, isText } = await determineFileType(filePath, fileName);
      
      if (isText) {
        // For text files, return the actual text content
        const textContent = fs.readFileSync(filePath, 'utf8');
        return textContent;
      } else if (isImageFile(mimeType)) {
        // For images, convert to base64
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        return base64;
      } else {
        // For other files, return "null" as a string
        return "null";
      }
    } catch (error) {
      return '';
    }
  }

  // Check if a file exists in the database and return its record
  async getFileReference(relativePath: string): Promise<FileReferenceData | null> {
    try {
      if (!this.table) throw new Error('Table not initialized');
      
      // Query for the file by path
      const results = await this.table.query()
        .where(`path = "${relativePath}"`)
        .limit(1)
        .toArray();
      
      if (results.length > 0) {
        return results[0] as unknown as FileReferenceData;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Upsert a file to the database
  async upsertFile(fullPath: string, relativePath: string): Promise<boolean> {
    try {
      if (!this.table) throw new Error('Table not initialized');
      
      // Calculate file hash
      const fileHash = LanceDbManager.calculateFileHash(fullPath);
      if (!fileHash) {
        return false;
      }
      
      // Check if file already exists in DB
      const existingFile = await this.getFileReference(relativePath);
      
      // If file exists and hash is the same, skip processing
      if (existingFile && existingFile.hash === fileHash) {
        return false;
      }
      
      // Convert file to base64
      const contentBase64 = await LanceDbManager.fileToBase64(fullPath);
      
      const now = new Date().toISOString();
      
      // Prepare file data
      const fileData: LanceDbRecord = {
        path: relativePath,
        hash: fileHash,
        content: contentBase64,
        updated_at: now,
        created_at: existingFile ? existingFile.created_at : now
      };
      
      // First try to delete existing record if it exists
      if (existingFile) {
        await this.table.delete(`path = "${relativePath}"`);
      }
      
      // Then insert the new/updated record
      await this.table.add([fileData]);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete a file from the database
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      if (!this.table) throw new Error('Table not initialized');
      
      // Check if file exists before deletion
      const existingFile = await this.getFileReference(relativePath);
      if (!existingFile) {
        return false;
      }
      
      // Delete the file by path
      await this.table.delete(`path = "${relativePath}"`);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // List all records in the database
  async listAllRecords(): Promise<FileReferenceData[]> {
    try {
      if (!this.table) throw new Error('Table not initialized');
      
      const allRecords = await this.table.query().toArray();
      return allRecords as unknown as FileReferenceData[];
    } catch (error) {
      return [];
    }
  }
}