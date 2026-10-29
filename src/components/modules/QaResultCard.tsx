"use client";

type QaResultCardProps = {
  documentUrl?: string | null;
  remarks?: string | null;
};

export default function QaResultCard({ documentUrl, remarks }: QaResultCardProps) {
  const hasRemarks = !!remarks && remarks.trim().length > 0;

  return (
    <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
      <h3 className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-3">
        QA Result
      </h3>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider mb-1">
            Document
          </p>
          {documentUrl ? (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View QA Results ↗
            </a>
          ) : (
            <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
              No QA result document uploaded yet
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider mb-1">
            Remarks
          </p>
          {hasRemarks ? (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-6 whitespace-pre-line">
              {remarks}
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
              No QA remarks provided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
