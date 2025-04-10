import { type FC } from "hono/jsx";
import { formatUrlPath } from "../utils/fileUtils.js";
import { type Language, createTranslator } from "../utils/i18n.js";
import { commonTranslations } from "../translations/common.js";
import { componentTranslations } from "../translations/components.js";

type FilePreviewProps = {
  fileName: string;
  mimeType: string;
  relativePath: string;
  size: number;
  content?: string;
  isText: boolean;
  isLarge?: boolean;
  language: Language;
};

export const FilePreview: FC<FilePreviewProps> = ({ 
  fileName, 
  mimeType, 
  relativePath, 
  size, 
  content, 
  isText, 
  isLarge = false,
  language
}) => {
  // Create translator functions
  const t = createTranslator(language, commonTranslations);
  const ct = createTranslator(language, componentTranslations);
  
  const rawUrl = `/raw/${formatUrlPath(relativePath)}`;
  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{t('app.fileViewer.title')}</h2>
        <div className="flex space-x-2">
          <button 
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition"
            onclick={`document.getElementById('delete-single-file-dialog').showModal(); 
              document.getElementById('delete-file-name').textContent = '${fileName}';
              document.getElementById('delete-file-path').value = '${relativePath}';`}
          >
            {t('file.delete')}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
        {/* テキストファイルの場合のみコンテンツを表示し、画像などの場合は表示しない */}
        {isText && content && !isImage && !isAudio && !isVideo && !isPdf && (
          <div className="overflow-x-auto">
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded font-mono text-sm">{content}</pre>
            {isLarge && (
              <div className="mt-2 text-sm italic text-gray-600">
                {language === 'en' 
                  ? "File is too large to display completely. Showing first part only." 
                  : "ファイルが大きすぎて完全に表示できません。最初の部分のみ表示しています。"}
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
              {language === 'en'
                ? "Your browser does not support the audio element."
                : "お使いのブラウザはオーディオ要素をサポートしていません。"}
            </audio>
          </div>
        )}

        {isVideo && (
          <div className="flex justify-center">
            <video controls className="w-full max-w-2xl">
              <source src={rawUrl} type={mimeType} />
              {language === 'en'
                ? "Your browser does not support the video element."
                : "お使いのブラウザはビデオ要素をサポートしていません。"}
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
            <h3 className="mb-2 font-medium">{language === 'en' ? "File Information" : "ファイル情報"}</h3>
            <p className="mb-1">{language === 'en' ? "Name: " : "ファイル名: "}{fileName}</p>
            <p className="mb-1">{language === 'en' ? "Type: " : "種類: "}{mimeType}</p>
            <p className="mb-1">{language === 'en' ? "Size: " : "サイズ: "}{(size / 1024).toFixed(2)} KB</p>
            <p className="mt-4 text-gray-700">
              {language === 'en'
                ? "This file type cannot be previewed."
                : "このファイルタイプはプレビューできません。"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};