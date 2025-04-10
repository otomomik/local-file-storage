import { type Context } from "hono";
import fs from "fs/promises";
import path from "path";
import { Breadcrumbs } from "../components/Breadcrumbs.js";
import { FileList } from "../components/FileList.js";
import { FilePreview } from "../components/FilePreview.js";
import { FileOperationDialogs } from "../components/FileOperationDialogs.js";
import { MainLayout } from "../layouts/MainLayout.js";
import { 
  resolvePath, 
  listDirectory, 
  determineFileType, 
  buildBreadcrumbs, 
  formatUrlPath 
} from "../utils/fileUtils.js";

export const browseHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      // Get the path from the URL
      const urlPath = c.req.path.replace(/^\/browse/, "") || "/";
      const { fullPath, relativePath } = resolvePath(urlPath, targetDirectory);
      
      // Check if path exists
      try {
        const stat = await fs.stat(fullPath);
        
        // If it's a file, show file preview
        if (!stat.isDirectory()) {
          const fileName = path.basename(fullPath);
          const { mimeType, isText } = await determineFileType(fullPath, fileName);
          
          const breadcrumbs = buildBreadcrumbs(path.dirname(relativePath));
          
          // For text files, read content (limited to 100KB)
          let textContent;
          let isLarge = false;
          
          if (isText) {
            const fileHandle = await fs.open(fullPath, 'r');
            try {
              const buffer = Buffer.alloc(100 * 1024); // 100KB
              const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
              textContent = buffer.slice(0, bytesRead).toString('utf-8');
              isLarge = stat.size > buffer.length;
            } finally {
              await fileHandle.close();
            }
          }
          
          // Render file preview
          return c.render(
            <MainLayout title={`Preview: ${fileName}`}>
              <h1 className="text-2xl font-bold mb-4">File Preview: {fileName}</h1>
              <Breadcrumbs items={breadcrumbs} currentName={fileName} />
              <FilePreview
                fileName={fileName}
                mimeType={mimeType}
                relativePath={relativePath}
                size={stat.size}
                content={textContent}
                isText={isText}
                isLarge={isLarge}
              />
            </MainLayout>
          );
        }
      } catch (error) {
        return c.render(
          <MainLayout title="Error">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h1 className="font-bold">Error</h1>
              <p>Path not found: {relativePath}</p>
            </div>
            <a 
              href="/browse/" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Return to root
            </a>
          </MainLayout>
        );
      }
      
      // List directory contents
      const files = await listDirectory(fullPath);
      const breadcrumbs = buildBreadcrumbs(relativePath);
      
      // 操作結果メッセージを表示するためのパラメータを取得
      const message = c.req.query('message');
      const status = c.req.query('status') || 'success';
      
      return c.render(
        <MainLayout title="Local File System">
          <h1 className="text-2xl font-bold mb-4">Local File System</h1>
          <p className="text-gray-600 mb-4">Browsing: {fullPath}</p>
          
          {/* 操作結果メッセージがある場合は表示 */}
          {message && (
            <div className={`mb-4 p-3 rounded ${status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <Breadcrumbs 
              items={breadcrumbs.slice(0, -1)} 
              currentName={relativePath === '.' ? 'Home' : path.basename(relativePath)} 
            />
            
            <div className="flex space-x-2">
              <button
                id="delete-selected-btn"
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center opacity-50 cursor-not-allowed"
                disabled
                onclick="handleDeleteSelected()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete Selected
              </button>
              
              <button
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center"
                onclick="document.getElementById('create-file-dialog').showModal()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                  <path fillRule="evenodd" d="M8 10a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 018 10z" clipRule="evenodd" />
                </svg>
                New File
              </button>
              
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
                onclick="document.getElementById('create-directory-dialog').showModal()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                New Folder
              </button>
              
              <button
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center"
                onclick="document.getElementById('upload-file-dialog').showModal()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Upload
              </button>
            </div>
          </div>
          
          <FileList 
            files={files} 
            relativePath={relativePath} 
          />
          
          {/* Include the dialogs for file operations */}
          <FileOperationDialogs currentPath={relativePath} />
          
          {/* Script for checkbox selection and delete functionality */}
          <script dangerouslySetInnerHTML={{ __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const deleteButton = document.getElementById('delete-selected-btn');
              const checkboxes = document.querySelectorAll('input[name="selected_files"]');
              const selectedFilesList = document.getElementById('selected-files-list');
              const deleteConfirmButton = document.getElementById('delete-confirm-button');
              const deleteForm = document.getElementById('delete-files-form');
              
              // Handle checkbox changes
              function updateSelectedFilesStatus() {
                const selectedCheckboxes = document.querySelectorAll('input[name="selected_files"]:checked');
                const count = selectedCheckboxes.length;
                
                // Enable or disable delete button
                if (count > 0) {
                  deleteButton.disabled = false;
                  deleteButton.classList.remove('opacity-50', 'cursor-not-allowed');
                  deleteConfirmButton.disabled = false;
                } else {
                  deleteButton.disabled = true;
                  deleteButton.classList.add('opacity-50', 'cursor-not-allowed');
                  deleteConfirmButton.disabled = true;
                }
              }
              
              // Add event listener to all checkboxes
              checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedFilesStatus);
              });
              
              // Global function to open delete dialog
              window.handleDeleteSelected = function() {
                // Clear any previous hidden inputs for files
                const previousHiddenInputs = deleteForm.querySelectorAll('input[name="files"]');
                previousHiddenInputs.forEach(input => input.remove());
                
                // Get selected checkboxes
                const selectedCheckboxes = document.querySelectorAll('input[name="selected_files"]:checked');
                const count = selectedCheckboxes.length;
                
                // Update selected files list in dialog
                if (count > 0) {
                  let html = '<ul class="list-disc pl-5">';
                  
                  // Add each selected file to the list and create hidden inputs
                  selectedCheckboxes.forEach(checkbox => {
                    const filename = checkbox.getAttribute('data-filename');
                    const filePath = checkbox.value;
                    
                    // Add to visual list
                    html += '<li>';
                    html += '<div class="flex items-center justify-between">';
                    html += '<span class="text-sm">' + filename + '</span>';
                    html += '</div>';
                    html += '</li>';
                    
                    // Add hidden input with selected file path
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'files';
                    hiddenInput.value = filePath;
                    deleteForm.appendChild(hiddenInput);
                  });
                  
                  html += '</ul>';
                  selectedFilesList.innerHTML = html;
                } else {
                  selectedFilesList.innerHTML = '<p>No files selected</p>';
                }
                
                // Show the dialog
                document.getElementById('multi-delete-dialog').showModal();
              };
            });
            
            // 操作結果メッセージを表示した後、URLからパラメータを削除
            if (window.location.search) {
              const url = new URL(window.location);
              url.searchParams.delete('message');
              url.searchParams.delete('status');
              window.history.replaceState({}, '', url);
            }
            
            // Add fileOperation event handling
            document.addEventListener('fileOperation', function(e) {
              setTimeout(function() {
                window.location.reload();
              }, 300);
            });
          `}} />
        </MainLayout>
      );
    } catch (error) {
      return c.render(
        <MainLayout title="Error">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h1 className="font-bold">Error</h1>
            <p>Failed to access path: {String(error)}</p>
          </div>
          <a 
            href="/browse/" 
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Return to root
          </a>
        </MainLayout>
      );
    }
  };
};