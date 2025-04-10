import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import path from "path";
import process from "process";
import fs from "fs/promises";
import open from "open";

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
          `}</style>
        </head>
        <body>{children}</body>
      </html>
    );
  }),
);

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

app.get("/", async (c) => {
  try {
    const files = await listDirectory(targetDirectory);
    
    return c.render(
      <div class="container">
        <h1>Local File System</h1>
        <p>Browsing: {targetDirectory}</p>
        <p>Relative path: {userRelativePath}</p>
        
        <div class="file-list">
          {files.map(file => (
            <div class="file-item">
              {file.isDirectory ? '📁 ' : '📄 '}
              {file.name}
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return c.render(
      <div>
        <h1>Error</h1>
        <p>Failed to access directory: {String(error)}</p>
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
    const url = `http://localhost:${info.port}`;
    open(url);
    console.log(`Server is running on ${url}`);
    console.log(`Showing contents of: ${targetDirectory}`);
  },
);
