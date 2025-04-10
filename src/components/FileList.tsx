import { type FC } from "hono/jsx";

export type FileItem = {
  name: string;
  isDirectory: boolean;
  path: string;
};

type FileListProps = {
  files: FileItem[];
  relativePath: string;
};

export const FileList: FC<FileListProps> = ({ files, relativePath }) => {
  // Format the URL path for linking
  const getFileUrl = (file: FileItem) => {
    const urlPath = relativePath === '.' ? file.name : `${relativePath}/${file.name}`;
    const encodedPath = encodeURIComponent(urlPath).replace(/%2F/g, '/');
    return `/browse/${encodedPath}`;
  };

  return (
    <div className="mt-5">
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {relativePath !== '.' && (
          <li className="flex items-center p-3 hover:bg-gray-50">
            <a 
              href={`/browse/${relativePath.split('/').slice(0, -1).join('/')}`}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span>Parent Directory</span>
            </a>
          </li>
        )}
        
        {files.map((file, index) => (
          <li key={index} className="flex items-center p-3 hover:bg-gray-50">
            <a 
              href={getFileUrl(file)} 
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:underline"
            >
              {file.isDirectory ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              )}
              <span>{file.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};