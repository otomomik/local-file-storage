import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import path from "path";
import process from "process";
import fs from "fs";
// import open from "open";

// Import route handlers
import { browseHandler } from "./routes/browseRoute.js";
import { rawFileHandler } from "./routes/rawFileRoute.js";
import { viewerHandler } from "./routes/viewerRoute.js";
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

// 絶対パスを解決し、存在確認を行う
const targetDirectory = path.resolve(callingDirectory, userRelativePath);
if (!fs.existsSync(targetDirectory)) {
  console.error(`Error: Directory does not exist: ${targetDirectory}`);
  process.exit(1);
}

// ディレクトリであることを確認
try {
  const stats = fs.statSync(targetDirectory);
  if (!stats.isDirectory()) {
    console.error(`Error: Not a directory: ${targetDirectory}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Error checking directory: ${err}`);
  process.exit(1);
}

console.log(`Target directory set to: ${targetDirectory}`);

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
app.get("/browse/*", browseHandler(targetDirectory));
app.get("/viewer", viewerHandler(targetDirectory));

// API routes
app.post("/api/create-directory", createDirectoryHandler(targetDirectory));
app.post("/api/create-file", createFileHandler(targetDirectory));
app.post("/api/delete-files", deleteFilesHandler(targetDirectory));
app.post("/api/open-in-explorer", openInExplorerHandler(targetDirectory));

// Initialize file system watcher with our custom utility
const watcher = watchDirectory(targetDirectory, {
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
    console.log('[File Watcher] Initial scan complete and ready for tracking changes');
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
    console.log(`Server is running on ${url}`);
    console.log(`Showing contents of: ${targetDirectory}`);
  },
);
