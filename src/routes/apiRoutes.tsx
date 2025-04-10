import { type Context } from "hono";
import fs from "fs/promises";
import path from "path";
import { resolvePath } from "../utils/fileUtils.js";

// ユーザーが現在いるディレクトリへのリダイレクト用関数
const redirectWithMessage = (c: Context, path: string, message: string, isError = false) => {
  const searchParams = new URLSearchParams();
  searchParams.append('message', message);
  if (isError) searchParams.append('status', 'error');
  
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
        return redirectWithMessage(c, relativePath, "Directory name is required", true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const newDirPath = path.join(fullPath, directoryName);
      
      await fs.mkdir(newDirPath, { recursive: true });
      
      return redirectWithMessage(c, relativePath, `Directory "${directoryName}" created successfully`);
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, `Error: ${String(error)}`, true);
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
        return redirectWithMessage(c, relativePath, "File name is required", true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const newFilePath = path.join(fullPath, fileName);
      
      await fs.writeFile(newFilePath, content);
      
      return redirectWithMessage(c, relativePath, `File "${fileName}" created successfully`);
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, `Error: ${String(error)}`, true);
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
        return redirectWithMessage(c, relativePath, "No file uploaded", true);
      }
      
      const { fullPath } = resolvePath(relativePath, targetDirectory);
      const filePath = path.join(fullPath, file.name);
      
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await fs.writeFile(filePath, buffer);
      
      return redirectWithMessage(c, relativePath, `File "${file.name}" uploaded successfully`);
    } catch (error) {
      const formData = await c.req.formData();
      const relativePath = formData.get("path") as string || "";
      return redirectWithMessage(c, relativePath, `Error: ${String(error)}`, true);
    }
  };
};