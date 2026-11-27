"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import AvatarViewer from "@/components/users/AvatarViewer";
import { isImageWeeklyPlanFile, WEEKLY_PLAN_ACCEPT, weeklyPlanFileError } from "@/lib/weeklyPlans";

interface PendingFile {
  file: File;
  url: string;
}

const CLIPBOARD_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
};

function clipboardFiles(data: DataTransfer | null): File[] {
  const itemFiles = Array.from(data?.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  const files = itemFiles.length > 0 ? itemFiles : Array.from(data?.files || []);

  return files.map((file) => {
    if (/\.[a-z0-9]+$/i.test(file.name)) return file;
    const extension = CLIPBOARD_EXTENSIONS[file.type] || file.type.split("/")[1]?.split("+")[0] || "bin";
    const name = `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    return new File([file], name, { type: file.type, lastModified: file.lastModified });
  });
}

interface FeedbackFilePickerProps {
  busy?: boolean;
  embedded?: boolean;
  onChange: (files: File[]) => void;
  pasteTargetRef?: RefObject<HTMLTextAreaElement | null>;
}

export default function FeedbackFilePicker({
  busy = false,
  embedded = false,
  onChange,
  pasteTargetRef,
}: FeedbackFilePickerProps) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [viewer, setViewer] = useState<{ src: string; name: string } | null>(null);
  const pendingRef = useRef<PendingFile[]>([]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(
    () => () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [],
  );

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (busy || !files || files.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const problem = weeklyPlanFileError(file);
      if (problem) rejected.push(problem);
      else accepted.push(file);
    }
    if (rejected.length > 0) {
      toast.error(
        rejected.length === 1 ? rejected[0] : `${rejected.length} files were skipped. ${rejected[0]}`,
      );
    }
    const key = (file: File) => `${file.name}:${file.size}`;
    const seen = new Set(pending.map((item) => key(item.file)));
    const additions: PendingFile[] = [];
    for (const file of accepted) {
      if (seen.has(key(file))) continue;
      seen.add(key(file));
      additions.push({ file, url: URL.createObjectURL(file) });
    }
    if (additions.length === 0) return;
    const next = [...pending, ...additions];
    setPending(next);
    onChange(next.map((item) => item.file));
  }, [busy, onChange, pending]);

  useEffect(() => {
    const target = pasteTargetRef?.current;
    if (!target) return;

    const handlePaste = (event: ClipboardEvent) => {
      const files = clipboardFiles(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      handleFiles(files);
    };

    target.addEventListener("paste", handlePaste);
    return () => target.removeEventListener("paste", handlePaste);
  }, [handleFiles, pasteTargetRef]);

  const handleRemove = (index: number) => {
    const target = pending[index];
    if (!target) return;
    URL.revokeObjectURL(target.url);
    if (viewer?.src === target.url) setViewer(null);
    const next = pending.filter((_, i) => i !== index);
    setPending(next);
    onChange(next.map((item) => item.file));
  };

  const open = (item: PendingFile) => {
    if (isImageWeeklyPlanFile(item.file.name)) {
      setViewer({ src: item.url, name: item.file.name });
      return;
    }
    window.open(item.url, "_blank", "noopener");
  };

  return (
    <div className={embedded ? "px-3 pb-3" : undefined}>
      <div className={`flex flex-wrap items-start gap-2.5 ${embedded ? "pt-3" : "mt-3"}`}>
        <label
          title="Attach files"
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-slate-400 cursor-pointer transition-colors hover:border-[var(--sys-primary)] hover:text-[var(--sys-primary-text)] ${
            embedded
              ? "border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          } ${
            busy ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 8v8m-4-4h8M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z"
            />
          </svg>
          <span className="sr-only">Attach files (optional)</span>
          <input
            type="file"
            multiple
            accept={WEEKLY_PLAN_ACCEPT}
            disabled={busy}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
        {pending.map((item, index) => {
          const image = isImageWeeklyPlanFile(item.file.name);
          return (
            <div key={`${item.file.name}-${item.file.size}-${index}`} className="relative shrink-0">
              <button
                type="button"
                onClick={() => open(item)}
                disabled={busy}
                title={image ? `View ${item.file.name}` : `Open ${item.file.name}`}
                className={
                  image
                    ? "block h-14 w-14 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-shadow hover:ring-2 hover:ring-[var(--sys-primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/50 disabled:opacity-50"
                    : "flex h-14 w-32 items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 text-left transition-shadow hover:ring-2 hover:ring-[var(--sys-primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/50 disabled:opacity-50"
                }
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 text-[10px] font-bold leading-tight text-slate-700 dark:text-slate-100 line-clamp-2 break-words">
                      {item.file.name}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={busy}
                aria-label={`Remove ${item.file.name}`}
                title="Remove"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600/90 text-white shadow transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {!embedded && (
        <p className="text-[11px] font-medium text-slate-400 mt-2.5">
          {pending.length > 0 && (
            <span className="font-bold text-slate-500 dark:text-slate-300">
              {pending.length} {pending.length === 1 ? "file" : "files"} attached ·{" "}
            </span>
          )}
          Images and documents, up to 20 MB each. Click a file to view it, × to remove.
        </p>
      )}
      {viewer && (
        <AvatarViewer
          src={viewer.src}
          name={viewer.name}
          eyebrow="Attachment preview"
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}