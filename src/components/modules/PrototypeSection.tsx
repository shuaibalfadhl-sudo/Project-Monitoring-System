"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  buildPrototypePath,
  createPrototypeSignedUrl,
  deletePrototypeObject,
  prototypeFileName,
  uploadPrototypeWithProgress,
  validatePrototypeFile,
} from "@/lib/prototypes";

interface PrototypeSectionProps {
  projectId: string;
  moduleId: string;
  prototypePath?: string | null;
  canManage: boolean;
  canPreview?: boolean;
  onUpdated?: (path: string) => void;
}

function messageOf(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}

export default function PrototypeSection({
  projectId,
  moduleId,
  prototypePath,
  canManage,
  canPreview = true,
  onUpdated,
}: PrototypeSectionProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(prototypePath ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  if (!currentPath && !canManage) return null;

  const fileName = currentPath ? prototypeFileName(currentPath) : "";

  const handlePreview = async () => {
    if (!currentPath || opening) return;
    setOpening(true);
    setError("");
    try {
      const url = await createPrototypeSignedUrl(supabase, currentPath);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Failed to open prototype preview", err);
      const message = "This prototype can't be opened right now. It may have been removed — ask the project owner to upload it again.";
      setError(message);
      toast.error(message);
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = async () => {
    if (!currentPath || downloading) return;
    setDownloading(true);
    try {
      const url = await createPrototypeSignedUrl(supabase, currentPath, {
        download: fileName,
        expiresIn: 60,
      });
      window.location.href = url;
    } catch (err) {
      console.error("Failed to download prototype", err);
      toast.error("The prototype could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validatePrototypeFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);
    const previousPath = currentPath;
    let newPath = "";

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your session expired. Refresh the page and try again.");
      }

      newPath = buildPrototypePath(projectId, moduleId, file.name);
      await uploadPrototypeWithProgress({
        path: newPath,
        file,
        accessToken: session.access_token,
        onProgress: setProgress,
      });

      const { data, error: dbError } = await supabase
        .from("project_modules")
        .update({ prototype: newPath })
        .eq("id", moduleId)
        .select("id");

      if (dbError) {
        throw new Error(
          dbError.code === "42501"
            ? "You do not have permission to save the prototype for this module."
            : dbError.message,
        );
      }
      if (!data || data.length === 0) {
        throw new Error("You do not have permission to save the prototype for this module.");
      }

      setCurrentPath(newPath);
      onUpdated?.(newPath);
      toast.success("Prototype uploaded successfully.");
      if (previousPath && previousPath !== newPath) {
        await deletePrototypeObject(supabase, previousPath);
      }
    } catch (err) {
      console.error("Prototype upload failed", err);
      if (newPath) await deletePrototypeObject(supabase, newPath);
      const message = messageOf(err, "The prototype could not be uploaded. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Prototype
            </h3>
            {currentPath ? (
              canPreview ? (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={opening}
                  title="Preview prototype"
                  className="inline-flex items-center gap-2 max-w-full text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="truncate">{opening ? "Opening..." : fileName}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 max-w-full text-sm font-bold text-slate-700 dark:text-slate-300">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{fileName}</span>
                </span>
              )
            ) : (
              <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
                No prototype uploaded yet
              </p>
            )}
          </div>
          {currentPath && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition-all disabled:opacity-60"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V4" />
              </svg>
              {downloading ? "Preparing..." : "Download"}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
          {canManage
            ? "Upload the HTML prototype the assigned developer should review."
            : canPreview
              ? "Uploaded by the project owner. Click the file name to preview it."
              : "Uploaded by the project owner. Download it to review."}
        </p>

        {error && (
          <p role="alert" className="text-xs font-semibold text-red-500 dark:text-red-400 mt-2">
            {error}
          </p>
        )}

        {canManage && (
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-[var(--sys-primary-text)] border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" />
              </svg>
              {uploading ? `Uploading... ${progress}%` : currentPath ? "Replace prototype" : "Upload prototype"}
            </button>
            {uploading && (
              <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--sys-primary)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
              HTML files only, up to 10 MB.
            </p>
          </div>
        )}
      </div>

      {previewUrl && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex flex-col p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-[var(--sys-primary-text)] truncate" title={fileName}>
                {fileName}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-60"
                >
                  {downloading ? "Preparing..." : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
            {/*
              Prototype HTML is untrusted. An empty sandbox blocks scripts,
              same-origin access and top-level navigation.
            */}
            <iframe
              src={previewUrl}
              title={`Prototype preview: ${fileName}`}
              sandbox=""
              referrerPolicy="no-referrer"
              className="w-full flex-1 bg-white"
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
