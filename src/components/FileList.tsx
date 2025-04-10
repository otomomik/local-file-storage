import { type FC } from "hono/jsx";
import { type Language, createTranslator } from "../utils/i18n.js";
import { commonTranslations } from "../translations/common.js";

export type FileItem = {
  name: string;
  isDirectory: boolean;
  path: string;
};

type FileListProps = {
  files: FileItem[];
  relativePath: string;
  showDotFiles?: boolean;
  language: Language;
};

export const FileList: FC<FileListProps> = ({ files, relativePath, showDotFiles = false, language }) => {
  // Create a translator function
  const t = createTranslator(language, commonTranslations);

  // Only filter out dot files if showDotFiles is false
  const filteredFiles = showDotFiles 
    ? files 
    : files.filter(file => !file.name.startsWith('.'));

  // Format the URL path for linking
  const getFileUrl = (file: FileItem) => {
    const urlPath = relativePath === '.' ? file.name : `${relativePath}/${file.name}`;
    const encodedPath = encodeURIComponent(urlPath).replace(/%2F/g, '/');
    return `/browse/${encodedPath}`;
  };

  // Get relative file path for form submission
  const getRelativeFilePath = (file: FileItem) => {
    return relativePath === '.' ? file.name : `${relativePath}/${file.name}`;
  };

  return (
    <div className="mt-5">
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {relativePath !== '.' && (
          <li className="flex items-center p-3 hover:bg-gray-50">
            <a 
              href={`/browse/${relativePath.split('/').slice(0, -1).join('/')}`}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:underline w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span>{t('file.parentDirectory')}</span>
            </a>
          </li>
        )}
        
        {filteredFiles.map((file, index) => (
          <li key={index} className="flex items-center p-3 hover:bg-gray-50">
            <div className="flex items-center mr-2">
              <input
                type="checkbox"
                name="selected_files"
                value={getRelativeFilePath(file)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                onclick="event.stopPropagation();"
                data-filename={file.name}
              />
            </div>
            <a 
              href={getFileUrl(file)} 
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:underline flex-grow"
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