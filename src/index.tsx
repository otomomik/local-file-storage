import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import path from "path";
import process from "process";
// import open from "open";

// Import route handlers
import { browseHandler } from "./routes/browseRoute.js";
import { rawFileHandler } from "./routes/rawFileRoute.js";
import { downloadHandler } from "./routes/downloadRoute.js";
import { 
  createDirectoryHandler, 
  createFileHandler, 
  deleteFilesHandler,
  openInExplorerHandler 
} from "./routes/apiRoutes.js";
import { watchDirectory } from "./utils/fileWatcher.js";

// Get target directory from command line arguments
const callingDirectory = process.argv[2] || process.cwd();
const userRelativePath = process.argv[3] || ".";
const targetDirectory = path.resolve(callingDirectory, userRelativePath);

// Initialize Hono app
const app = new Hono();

// Use JSX renderer
app.use(jsxRenderer());

// Root handler redirects to /browse/
app.get("/", (c) => {
  return c.redirect("/browse/");
});

// Set up routes
app.get("/raw/*", rawFileHandler(targetDirectory));
app.get("/download/*", downloadHandler(targetDirectory));
app.get("/browse/*", browseHandler(targetDirectory));

// API routes
app.post("/api/create-directory", createDirectoryHandler(targetDirectory));
app.post("/api/create-file", createFileHandler(targetDirectory));
app.post("/api/delete-files", deleteFilesHandler(targetDirectory));
app.post("/api/open-in-explorer", openInExplorerHandler(targetDirectory));

// 状態ファイルのパスを targetDirectory の .local ディレクトリ内に設定
const stateFilePath = path.join(targetDirectory, '.local', 'file-history-state.json');

// Initialize file system watcher with our custom utility
const watcher = watchDirectory(targetDirectory, stateFilePath, {
  processChangedFiles: true, // 変更ファイル処理を有効化
  skipInitialProcessing: true, // 初回起動時のファイル処理をスキップ
  onNewFile: (relativePath) => {
    console.log(`[File Watcher] New file detected: ${relativePath}`);
  },
  onModifiedFile: (relativePath) => {
    console.log(`[File Watcher] File modified: ${relativePath}`);
  },
  onDeletedFile: (relativePath) => {
    console.log(`[File Watcher] File deleted: ${relativePath}`);
  },
  onReady: () => {
    console.log('[File Watcher] Initial scan complete and differences detected');
  }
});

// Start server
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    const url = `http://localhost:${info.port}/browse/`;
    // Uncomment to auto-open browser: open(url);
    console.log(`Server is running on ${url}`);
    console.log(`Showing contents of: ${targetDirectory}`);
    console.log(`File watching active with history tracking in .local/file-history-state.json`);
    console.log(`File processing active - text extraction and image base64 conversion enabled`);
    console.log(`Initial file processing skipped - new and changed files will be processed when modified`);
  },
);
