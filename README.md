# Local File Storage

A local file browser and storage system that catalogs and indexes your files.

## Features

- File browser with directory navigation
- Automatic file indexing and content storage using LanceDB
- Content-based text detection using first 1024 bytes
- Different content handling based on file type:
  - Text files: Store actual text content
  - Images: Convert to base64 and store
  - Other files: Store "null" string as content
- File preview for different file types
- Real-time file system monitoring with chokidar

## Project Structure

```
dev.sh                  # Development start script
mise.toml               # Environment configuration
package.json            # Package dependencies
README.md               # This documentation file
tsconfig.json           # TypeScript configuration
viewer.py               # Optional Python viewer script

src/
  global.d.ts           # TypeScript global declarations
  index.tsx             # Application entry point
  
  components/           # UI components
    Breadcrumbs.tsx     # Directory navigation breadcrumbs
    FileList.tsx        # Directory contents listing
    FileOperationDialogs.tsx # File operations UI
    FilePreview.tsx     # File content preview
    
  layouts/
    MainLayout.tsx      # Main application layout
    
  routes/               # Application routes
    apiRoutes.tsx       # API endpoints
    browseRoute.tsx     # Directory browsing view
    downloadRoute.tsx   # File download handling
    rawFileRoute.tsx    # Raw file content access
    
  utils/                # Utility functions
    fileUtils.ts        # File operations and type detection
    fileWatcher.ts      # File system monitoring
    lanceDbManager.ts   # LanceDB storage integration
```

## Core Functionality

### File Type Detection

Files are classified based on examining the first 1024 bytes of content combined with MIME type detection. This allows accurate detection of text files even without relying solely on file extensions.

### Content Storage

The application uses LanceDB to store file data with the following approach:

- **Text files**: The actual text content is stored directly in the database
- **Image files**: Converted to base64 and stored
- **Other files**: The string "null" is stored in the content field

### File Monitoring

The application monitors the filesystem in real-time and automatically updates the content database when files are:
- Added
- Modified
- Deleted

## Database

The project uses LanceDB, a vector database, to store file metadata and content:

- Files are indexed by their path
- A hash of the file is generated to detect changes
- Content is stored based on file type
- Timestamps for creation and modification are maintained

## Getting Started

```
npm install
npm run dev
```

Then open your browser at:
```
http://localhost:3000
```
