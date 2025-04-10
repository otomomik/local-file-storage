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
  metadata: Record<string, any>; // Optional metadata as a JSON object
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Type for actual database operations with LanceDB
type LanceDbRecord = Record<string, unknown>;

// Search type options
export type SearchType = 'full-text-search' | 'vector' | 'like-search';

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

  async waitForIndex(table: lancedb.Table, indexName: string): Promise<void> {
    const POLL_INTERVAL = 10000; // 10 seconds
    while (true) {
      const indices = await table.listIndices();
      if (indices.some((index) => index.name === indexName)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
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
        const table = await this.db.openTable('file_references');
        await table.createIndex("content", {
          config: lancedb.Index.fts()
        });
        this.waitForIndex(table, "content_idx");
        this.table = table;
      } else {
        // Create new table with schema
        const now = new Date().toISOString();
        const initialRecord: LanceDbRecord = {
          path: "__dummy__",
          hash: "0",
          content: "",
          metadata: {},
          created_at: now,
          updated_at: now
        };

        const table = await this.db.createTable('file_references', [initialRecord], {
          mode: 'create'
        });
        await table.createIndex("content", {
          config: lancedb.Index.fts()
        });
        this.waitForIndex(table, "content_idx");

        // Remove dummy record
        await table.delete('path = "__dummy__"');
        this.table = table
      }

      return;
    } catch (error) {
      throw error;
    }
  }

  // Get table names
  async getTableNames(): Promise<string[]> {
    try {
      if (!this.db) {
        await this.initialize();
      }
      return await this.db!.tableNames();
    } catch (error) {
      return [];
    }
  }

  // Open a specific table
  async openTable(tableName: string): Promise<boolean> {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const tableNames = await this.db!.tableNames();
      if (tableNames.includes(tableName)) {
        this.table = await this.db!.openTable(tableName);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Process query to handle comma-separated search terms
  private processSearchQuery(query: string): string[] {
    if (!query) return [];
    // Split by comma and trim each term
    return query.split(',').map(term => term.trim()).filter(term => term.length > 0);
  }

  // Build a LIKE query condition from multiple terms with OR operator
  private buildLikeCondition(terms: string[]): string {
    if (terms.length === 0) return '';

    return terms.map(term => `content LIKE "%${term}%"`).join(' OR ');
  }

  // Count total records that match a search query
  async countRecords(
    query: string = '',
    searchType: SearchType = 'full-text-search'
  ): Promise<number> {
    try {
      if (!this.table) throw new Error('Table not initialized');

      // デバッグログ
      console.log(`countRecords - searchType:`, searchType, `query:`, query);

      if (searchType === 'like-search' && query) {
        // 複数の検索語でLIKE検索を行う
        const searchTerms = this.processSearchQuery(query);
        if (searchTerms.length > 0) {
          const whereCondition = this.buildLikeCondition(searchTerms);
          console.log(`LIKE検索条件: ${whereCondition}`);
          return (await this.table.query()
            .where(whereCondition)
            .toArray()).length;
        }
      } else if (searchType === 'full-text-search' && query) {
        try {
          // 全文検索のカウントを試行
          return (await this.table.query()
            .fullTextSearch(query, {
              columns: ['content'],
            })
            .toArray()).length;
        } catch (error) {
          console.warn('Full-text search count failed, falling back to where clause:', error);

          // フォールバック: 基本的なテキスト一致フィルター
          return (await this.table.query()
            .where(`content LIKE "%${query}%"`)
            .toArray()).length;
        }
      }

      // Default: count all records
      return (await this.table.query().toArray()).length;
    } catch (error) {
      console.error('Count error:', error);
      return 0;
    }
  }

  // Search records with pagination
  async searchRecords(
    query: string,
    searchType: SearchType = 'full-text-search',
    limit: number = 25,
    offset: number = 0
  ): Promise<FileReferenceData[]> {
    try {
      if (!this.table) throw new Error('Table not initialized');

      // デバッグログ
      console.log(`searchRecords - searchType:`, searchType, `query:`, query);

      if (searchType === 'like-search' && query) {
        // LIKE検索でカンマ区切りの検索語を処理
        const searchTerms = this.processSearchQuery(query);
        console.log('LIKE検索用語:', searchTerms);
        
        if (searchTerms.length > 0) {
          const whereCondition = this.buildLikeCondition(searchTerms);
          console.log(`LIKE検索条件: ${whereCondition}`);
          
          const results = await this.table.query()
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .toArray();
          
          console.log(`検索結果件数: ${results.length}`);
          return results as unknown as FileReferenceData[];
        }
      } else if (searchType === 'full-text-search' && query) {
        try {
          // 全文検索の試行
          const results = await this.table.query()
            .fullTextSearch(query, {
              columns: ['content'],
            })
            .limit(limit)
            .offset(offset)
            .toArray();
          
          console.log(`全文検索結果件数: ${results.length}`);
          return results as unknown as FileReferenceData[];
        } catch (error) {
          // エラーハンドリングを追加 - エラー時のフォールバック
          console.warn('Full-text search failed, falling back to where clause filter:', error);
          
          // フォールバック: 基本的なテキスト一致フィルター
          const results = await this.table.query()
            .where(`content LIKE "%${query}%"`)
            .limit(limit)
            .offset(offset)
            .toArray();
          
          console.log(`フォールバック検索結果件数: ${results.length}`);
          return results as unknown as FileReferenceData[];
        }
      } else if (searchType === 'vector') {
        // Vector search - not implemented yet
        throw new Error('Vector search not implemented yet');
      }

      // Default: return all records up to limit
      return await this.listAllRecords(limit, offset);
    } catch (error) {
      console.error('Search error:', error);
      return [];
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
  static async fileToBase64(filePath: string, fromUrl: boolean = false): Promise<string> {
    try {
      // Check if file is a dot file and skip it (unless explicitly requested from URL)
      const fileName = path.basename(filePath);
      if (fileName.startsWith('.') && !fromUrl) {
        return '';
      }

      // Check file size first to avoid loading huge files
      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileStats = fs.statSync(filePath);

      if (fileStats.size > maxSize) {
        return '';
      }

      // Use the existing determineFileType function which examines the first 1024 bytes
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
  async upsertFile(
    fullPath: string,
    relativePath: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      if (!this.table) throw new Error('Table not initialized');

      // Calculate file hash
      const fileHash = LanceDbManager.calculateFileHash(fullPath);
      if (!fileHash) {
        return false;
      }

      // Check if file already exists in DB
      const existingFile = await this.getFileReference(relativePath);

      // If file exists and hash is the same, only update metadata if provided
      if (existingFile && existingFile.hash === fileHash && Object.keys(metadata).length === 0) {
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
        created_at: existingFile ? existingFile.created_at : now,
        // Merge existing metadata with new metadata if available
        metadata: {}
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

  // List all records in the database with pagination
  async listAllRecords(limit: number = 25, offset: number = 0): Promise<FileReferenceData[]> {
    try {
      if (!this.table) throw new Error('Table not initialized');

      const allRecords = await this.table.query()
        .limit(limit)
        .offset(offset)
        .toArray();

      return allRecords as unknown as FileReferenceData[];
    } catch (error) {
      return [];
    }
  }
}