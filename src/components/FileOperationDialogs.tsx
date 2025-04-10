import { type FC } from "hono/jsx";

type FileOperationDialogsProps = {
  currentPath: string;
};

export const FileOperationDialogs: FC<FileOperationDialogsProps> = ({ currentPath }) => {
  return (
    <>
      {/* ダイアログスタイル用のグローバルCSSを追加 */}
      <style>
        {`
          dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            margin: 0;
            max-height: 80vh;
            max-width: 90vw;
          }
          dialog::backdrop {
            background-color: rgba(0, 0, 0, 0.5);
          }
        `}
      </style>
      
      {/* Create Directory Dialog */}
      <dialog id="create-directory-dialog" className="p-0 rounded-lg shadow-lg border border-gray-300">
        <div className="p-5 w-80">
          <h3 className="text-lg font-bold mb-4">Create Directory</h3>
          <form 
            method="post"
            action="/api/create-directory"
          >
            <input type="hidden" name="path" value={currentPath} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Directory Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter directory name"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onclick="this.closest('dialog').close()"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Create File Dialog */}
      <dialog id="create-file-dialog" className="p-0 rounded-lg shadow-lg border border-gray-300">
        <div className="p-5 w-96">
          <h3 className="text-lg font-bold mb-4">Create File</h3>
          <form 
            method="post"
            action="/api/create-file"
          >
            <input type="hidden" name="path" value={currentPath} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter file name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="content"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter file content (optional)"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onclick="this.closest('dialog').close()"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Upload File Dialog */}
      <dialog id="upload-file-dialog" className="p-0 rounded-lg shadow-lg border border-gray-300">
        <div className="p-5 w-80">
          <h3 className="text-lg font-bold mb-4">Upload File</h3>
          <form
            method="post"
            action="/api/upload-file"
            encType="multipart/form-data"
          >
            <input type="hidden" name="path" value={currentPath} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
              <input
                type="file"
                name="file"
                required
                className="w-full block text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onclick="this.closest('dialog').close()"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Upload
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Multi-delete Dialog */}
      <dialog id="multi-delete-dialog" className="p-0 rounded-lg shadow-lg border border-gray-300">
        <div className="p-5 w-96">
          <h3 className="text-lg font-bold mb-4">Delete Selected Files</h3>
          <form 
            method="post"
            action="/api/delete-files"
            id="delete-files-form"
          >
            <input type="hidden" name="path" value={currentPath} />
            <div id="selected-files-list" className="mb-4 max-h-40 overflow-y-auto">
              <p>No files selected</p>
            </div>
            <div className="bg-red-50 p-3 rounded mb-4">
              <p className="text-red-600 text-sm">Warning: This action cannot be undone!</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onclick="this.closest('dialog').close()"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                id="delete-confirm-button"
                disabled
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
};