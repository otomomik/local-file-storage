import { type TranslationDictionary } from '../utils/i18n.js';

// Translations for search related components
export const searchTranslations: TranslationDictionary = {
  'search.query': {
    en: 'Search Query',
    ja: '検索クエリ'
  },
  'search.type': {
    en: 'Search Type',
    ja: '検索タイプ'
  },
  'search.placeholder': {
    en: 'Enter text to search',
    ja: '検索したいテキストを入力'
  },
  'search.placeholder.like': {
    en: 'Enter text to search (comma-separated for multiple terms)',
    ja: '検索したいテキストを入力（カンマ区切りで複数指定可能）'
  },
  'search.types.fullText': {
    en: 'Full-Text Search',
    ja: '全文検索'
  },
  'search.types.like': {
    en: 'LIKE Search (comma-separated)',
    ja: 'LIKE検索（カンマ区切り）'
  },
  'search.types.vector': {
    en: 'Vector Search (not implemented)',
    ja: 'ベクトル検索 (未実装)'
  },
};

// Translations for data table related components
export const tableTranslations: TranslationDictionary = {
  'table.select': {
    en: 'Table Selection:',
    ja: 'テーブル選択:'
  },
  'table.column.path': {
    en: 'File Path',
    ja: 'ファイルパス'
  },
  'table.column.preview': {
    en: 'Content Preview',
    ja: 'コンテンツプレビュー'
  },
  'table.column.metadata': {
    en: 'Metadata',
    ja: 'メタデータ'
  },
  'table.column.created': {
    en: 'Created At',
    ja: '作成日時'
  },
  'table.column.updated': {
    en: 'Updated At',
    ja: '更新日時'
  },
  'table.content.empty': {
    en: '(empty)',
    ja: '(空)'
  },
  'table.content.binary': {
    en: '(binary data)',
    ja: '(バイナリデータ)'
  },
  'table.pagination.prev': {
    en: 'Previous',
    ja: '前へ'
  },
  'table.pagination.next': {
    en: 'Next',
    ja: '次へ'
  },
};

// Translations for file operations
export const fileOperationsTranslations: TranslationDictionary = {
  // Create directory dialog
  'createDir.title': {
    en: 'Create Directory',
    ja: 'ディレクトリ作成'
  },
  'createDir.placeholder': {
    en: 'Enter directory name',
    ja: 'ディレクトリ名を入力'
  },
  
  // Create file dialog
  'createFile.title': {
    en: 'Create File',
    ja: 'ファイル作成'
  },
  'createFile.namePlaceholder': {
    en: 'Enter file name',
    ja: 'ファイル名を入力'
  },
  'createFile.contentPlaceholder': {
    en: 'Enter file content (optional)',
    ja: 'ファイルの内容を入力（任意）'
  },
  
  // Delete dialog
  'delete.title': {
    en: 'Delete Selected Files',
    ja: '選択したファイルの削除'
  },
  'delete.confirmation': {
    en: 'Are you sure you want to delete this file?',
    ja: 'このファイルを削除してもよろしいですか？'
  },
  'delete.noSelection': {
    en: 'No files selected',
    ja: 'ファイルが選択されていません'
  },
  'delete.file': {
    en: 'File:',
    ja: 'ファイル:'
  },
};

// Error translations
export const errorTranslations: TranslationDictionary = {
  'error.title': {
    en: 'Error',
    ja: 'エラー'
  },
  'error.tableNotFound': {
    en: "Table '{tableName}' not found.",
    ja: "テーブル '{tableName}' が見つかりませんでした。"
  },
  'error.dbFetchFailed': {
    en: "Failed to fetch DB data: {error}",
    ja: "DBデータの取得に失敗しました: {error}"
  },
  'error.pathNotFound': {
    en: "Path not found: {path}",
    ja: "パスが見つかりません: {path}"
  },
  'error.returnToRoot': {
    en: "Return to root",
    ja: "ルートディレクトリに戻る"
  },
  'error.returnToFileBrowser': {
    en: "Return to file browser",
    ja: "ファイルブラウザに戻る"
  },
};

// Merge all translations into one dictionary for easier access
export const componentTranslations = {
  ...searchTranslations,
  ...tableTranslations,
  ...fileOperationsTranslations,
  ...errorTranslations,
};