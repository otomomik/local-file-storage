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

// Root handler redirects to /browse/
app.get("/", (c) => {
  return c.redirect("/browse/");
});

// Browser handler for directory navigation
app.get("/browse/*", async (c) => {
  try {
    // Get the path from the URL
    const urlPath = c.req.path.replace(/^\/browse/, "") || "/";
    const { fullPath, relativePath } = resolvePath(urlPath);
    
    // Check if path exists
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        // TODO: Implement file content viewing
        return c.text("File viewing not implemented yet");
      }
    } catch (error) {
      return c.render(
        <div>
          <h1>Error</h1>
          <p>Directory not found: {relativePath}</p>
          <p><a href="/browse/">Return to root</a></p>
        </div>
      );
    }
    
    // List directory contents
    const files = await listDirectory(fullPath);
    
    // Build breadcrumb navigation
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
    
    return c.render(
      <div class="container">
        <h1>Local File System</h1>
        <p>Browsing: {fullPath}</p>
        
        {/* Breadcrumb navigation */}
        <div class="breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <>
              {index > 0 && " / "}
              {index === breadcrumbs.length - 1 ? (
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
                <span>📄 {file.name}</span>
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
        <p>Failed to access directory: {String(error)}</p>
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
