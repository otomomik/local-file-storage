import { type TranslationDictionary } from '../utils/i18n.js';

export const apiMessages: TranslationDictionary = {
  // Directory operations
  'directory.name.required': {
    en: 'Directory name is required',
    ja: 'ディレクトリ名は必須です'
  },
  'directory.created': {
    en: 'Directory "{name}" created successfully',
    ja: 'ディレクトリ "{name}" が作成されました'
  },

  // File operations
  'file.name.required': {
    en: 'File name is required',
    ja: 'ファイル名は必須です'
  },
  'file.path.required': {
    en: 'File path is required',
    ja: 'ファイルパスは必須です'
  },
  'file.created': {
    en: 'File "{name}" created successfully',
    ja: 'ファイル "{name}" が作成されました'
  },
  'file.updated': {
    en: 'File "{name}" updated successfully',
    ja: 'ファイル "{name}" が更新されました'
  },
  'file.none.selected': {
    en: 'No files selected for deletion',
    ja: '削除するファイルが選択されていません'
  },
  'file.upload.none': {
    en: 'No file uploaded',
    ja: 'ファイルがアップロードされていません'
  },
  'file.upload.success': {
    en: 'File "{name}" uploaded successfully',
    ja: 'ファイル "{name}" がアップロードされました'
  },
  'file.delete.success': {
    en: 'Successfully deleted {count} item(s)',
    ja: '{count} 個のアイテムが削除されました'
  },
  'file.delete.partial.failure': {
    en: 'Some files could not be deleted: {errors}',
    ja: '一部のファイルを削除できませんでした: {errors}'
  },
  
  // Explorer operations
  'explorer.open.success': {
    en: 'Opened in system explorer',
    ja: 'システムエクスプローラで開きました'
  },
  'explorer.open.failure': {
    en: 'Failed to open: {error}',
    ja: '開けませんでした: {error}'
  },
  
  // Generic errors
  'error.generic': {
    en: 'Error: {message}',
    ja: 'エラー: {message}'
  }
};