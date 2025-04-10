import { type FC } from "hono/jsx";
import { formatUrlPath } from "../utils/fileUtils.js";

type FilePreviewProps = {
  fileName: string;
  mimeType: string;
  relativePath: string;
  size: number;
  content?: string;
  isText: boolean;
  isLarge?: boolean;
};

export const FilePreview: FC<FilePreviewProps> = ({ 
  fileName, 
  mimeType, 
  relativePath, 
  size, 
  content, 
  isText, 
  isLarge = false 
}) => {
  const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
  const downloadUrl = `/download/${formatUrlPath(relativePath)}`;
  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">File Preview</h2>
        <a 
          href={downloadUrl}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
        >
          Download File
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
        {/* テキストファイルの場合のみコンテンツを表示し、画像などの場合は表示しない */}
        {isText && content && !isImage && !isAudio && !isVideo && !isPdf && (
          <div className="overflow-x-auto">
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded font-mono text-sm">{content}</pre>
            {isLarge && (
              <div className="mt-2 text-sm italic text-gray-600">
                File is too large to display completely. Showing first part only.
                <a href={downloadUrl} className="ml-1 text-blue-600 hover:underline">
                  Download the complete file
                </a>.
              </div>
            )}
          </div>
        )}

        {isImage && (
          <div className="flex justify-center">
            <img src={rawUrl} className="max-w-full h-auto" alt={fileName} />
          </div>
        )}

        {isAudio && (
          <div className="flex justify-center py-4">
            <audio controls className="w-full max-w-md">
              <source src={rawUrl} type={mimeType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {isVideo && (
          <div className="flex justify-center">
            <video controls className="w-full max-w-2xl">
              <source src={rawUrl} type={mimeType} />
              Your browser does not support the video element.
            </video>
          </div>
        )}

        {isPdf && (
          <div className="h-[600px] w-full">
            <embed src={rawUrl} type={mimeType} width="100%" height="100%" />
          </div>
        )}

        {!isText && !isImage && !isAudio && !isVideo && !isPdf && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="mb-2 font-medium">File Information</h3>
            <p className="mb-1">Name: {fileName}</p>
            <p className="mb-1">Type: {mimeType}</p>
            <p className="mb-1">Size: {(size / 1024).toFixed(2)} KB</p>
            <p className="mt-4 text-gray-700">
              This file type cannot be previewed. Use the download button to access it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};