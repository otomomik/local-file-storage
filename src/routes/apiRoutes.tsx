import { type Context } from "hono";
import fs from "fs/promises";
import path from "path";
import { resolvePath } from "../utils/fileUtils.js";
import { getCurrentLanguage, createTranslator } from "../utils/i18n.js";
import { apiMessages } from "../translations/apiMessages.js";
import open from "open";

// ユーザーが現在いるディレクトリへのリダイレクト用関数
const redirectWithMessage = (c: Context, path: string, messageKey: string, replacements: Record<string, string> = {}, isError = false) => {
  const language = getCurrentLanguage(c);
  const t = createTranslator(language, apiMessages);
  
  // Get the message from translations
  let message = t(messageKey);
  
  // Replace any placeholders with values
  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, value);
  });
  
  const searchParams = new URLSearchParams();
  searchParams.append('message', message);
  if (isError) searchParams.append('status', 'error');
  
  // Preserve language parameter
  searchParams.append('lang', language);
  
  // /browse/ で始まる URL に現在のパスをエンコードして付加
  return c.redirect(`/browse/${encodeURIComponent(path)}?${searchParams.toString()}`);
};

// Handler for creating a new directory
export const createDirectoryHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      const directoryName = formData.get("name") as string || "";
      
      if (!directoryName) {
        return redirectWithMessage(c, relativePath, "directory.name.required", {}, true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const newDirPath = path.join(fullPath, directoryName);
      
      await fs.mkdir(newDirPath, { recursive: true });
      
      return redirectWithMessage(c, relativePath, "directory.created", { name: directoryName });
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, "error.generic", { message: String(error) }, true);
    }
  };
};

// Handler for creating a new file
export const createFileHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      const fileName = formData.get("name") as string || "";
      const content = formData.get("content") as string || "";
      
      if (!fileName) {
        return redirectWithMessage(c, relativePath, "file.name.required", {}, true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const newFilePath = path.join(fullPath, fileName);
      
      await fs.writeFile(newFilePath, content);
      
      return redirectWithMessage(c, relativePath, "file.created", { name: fileName });
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, "error.generic", { message: String(error) }, true);
    }
  };
};

// Handler for uploading files
export const uploadFileHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      const file = formData.get("file") as File;
      
      if (!file) {
        return redirectWithMessage(c, relativePath, "file.upload.none", {}, true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const filePath = path.join(fullPath, file.name);
      
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await fs.writeFile(filePath, buffer);
      
      return redirectWithMessage(c, relativePath, "file.upload.success", { name: file.name });
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, "error.generic", { message: String(error) }, true);
    }
  };
};

// Handler for deleting multiple files
export const deleteFilesHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      const files = formData.getAll("files") as string[];
      
      if (!files || files.length === 0) {
        return redirectWithMessage(c, relativePath, "file.none.selected", {}, true);
      }
      
      const deletedFiles: string[] = [];
      const errors: string[] = [];
      let fileParentDir = ""; // 削除したファイルの親ディレクトリを記録
      
      // Process each file for deletion
      for (const filePath of files) {
        try {
          // Use resolvePath to correctly map the relative path from the form to absolute path
          // The filePath from the form is already relative to the targetDirectory
          const { fullPath, relativePath: fileRelativePath } = resolvePath(filePath, targetDirectory);
          
          // 最初の削除対象ファイルの親ディレクトリを保存（詳細ページからの削除用）
          if (!fileParentDir) {
            fileParentDir = path.dirname(fileRelativePath);
          }
          
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true });
          } else {
            await fs.unlink(fullPath);
          }
          
          deletedFiles.push(path.basename(filePath));
        } catch (error) {
          errors.push(`${path.basename(filePath)}: ${String(error)}`);
        }
      }
      
      if (errors.length > 0) {
        return redirectWithMessage(c, relativePath, "file.delete.partial.failure", { errors: errors.join(", ") }, true);
      }
      
      // ファイル詳細ページからの削除の場合、親ディレクトリにリダイレクト
      // または、一覧でも選択した場所にリダイレクト
      const redirectPath = fileParentDir || relativePath;
      
      return redirectWithMessage(c, redirectPath, "file.delete.success", { count: deletedFiles.length.toString() });
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, "error.generic", { message: String(error) }, true);
    }
  };
};

// Handler for editing text files
export const editFileHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const filePath = formData.get("path") as string || "";
      const fileName = formData.get("name") as string || "";
      const content = formData.get("content") as string || "";
      
      if (!filePath) {
        return redirectWithMessage(c, path.dirname(filePath), "file.path.required", {}, true);
      }
      
      // Use resolvePath to correctly map the relative path from the form to absolute path
      const { fullPath, relativePath } = resolvePath(filePath, targetDirectory);
      
      // Write the file with new content
      await fs.writeFile(fullPath, content);
      
      // Get the directory path for redirecting back
      const dirPath = path.dirname(relativePath);
      
      return redirectWithMessage(c, dirPath, "file.updated", { name: fileName });
    } catch (error) {
      const formData = await c.req.formData();
      const filePath = formData.get("path") as string || "";
      const dirPath = path.dirname(filePath);
      return redirectWithMessage(c, dirPath, "error.generic", { message: String(error) }, true);
    }
  };
};

// Handler for opening files or directories in system explorer
export const openInExplorerHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      const language = getCurrentLanguage(c);
      const t = createTranslator(language, apiMessages);
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      
      try {
        // Open the file or directory in system explorer
        await open(fullPath);
        return c.json({ success: true, message: t("explorer.open.success") });
      } catch (error) {
        const message = t("explorer.open.failure").replace("{error}", String(error));
        return c.json({ 
          success: false, 
          message: message
        }, 500);
      }
    } catch (error) {
      const language = getCurrentLanguage(c);
      const t = createTranslator(language, apiMessages);
      const message = t("error.generic").replace("{message}", String(error));
      
      return c.json({ 
        success: false, 
        message: message
      }, 500);
    }
  };
};