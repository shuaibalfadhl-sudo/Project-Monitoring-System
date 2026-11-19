"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import MemberAvatar from "@/components/dashboard/MemberAvatar";

export type AuditRecord =
  | {
      kind: "deployment";
      rank: number;
      name: string;
      avatar: string | null;
      deployed: number;
      total: number;
      rate: number;
    }
  | {
      kind: "revision";
      rank: number;
      name: string;
      avatar: string | null;
      revisions: number;
      revisedModules: number;
      rAvg: number;
      sharePct: number;
    };

interface FormulaAuditDrawerProps {
  record: AuditRecord | null;
  open: boolean;
  teamRAvg: number;
  teamIntensitySum: number;
  periodLabel: string;
  onClose: () => void;
}

const TILE = "p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900";
const TILE_LABEL = "text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";
const TILE_VALUE = "font-mono text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums";

export default function FormulaAuditDrawer({
  record,
  open,
  teamRAvg,
  teamIntensitySum,
  periodLabel,
  onClose,
}: FormulaAuditDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const shown = record;

  return createPortal(
    <div className="fixed inset-0 z-[110] overflow-hidden">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
      />
      <aside
        aria-label="Calculation audit inspector"
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-scale-in origin-right motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:transform-none"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="11" x2="8" y2="11.01" />
                <line x1="12" y1="11" x2="12" y2="11.01" />
                <line x1="16" y1="11" x2="16" y2="11.01" />
                <line x1="8" y1="15" x2="8" y2="15.01" />
                <line x1="12" y1="15" x2="12" y2="15.01" />
                <line x1="16" y1="15" x2="16" y2="18" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">Telemetry Formula Audit</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Exact verification of rate &amp; intensity share</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto p-6 space-y-5">
          {shown?.kind === "deployment" && (
            <>
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <MemberAvatar
                  name={shown.name}
                  src={shown.avatar}
                  className="w-11 h-11 text-sm border bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                      RANK #{shown.rank}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">PM Deployment Audit</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{shown.name}</h4>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className={TILE}>
                  <p className={TILE_LABEL}>Deployed</p>
                  <p className={TILE_VALUE}>{shown.deployed}</p>
                </div>
                <div className={TILE}>
                  <p className={TILE_LABEL}>Assigned</p>
                  <p className={TILE_VALUE}>{shown.total}</p>
                </div>
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-900/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Pending</p>
                  <p className="font-mono text-lg font-bold text-rose-700 dark:text-rose-300 mt-0.5 tabular-nums">
                    {shown.total - shown.deployed}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 border border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deployment Rate Calculation</div>
                <div className="font-mono text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 text-indigo-300 leading-relaxed">
                  Rate = (Deployed ÷ Total Assigned) × 100
                  <br />
                  Rate = ({shown.deployed} ÷ {shown.total}) × 100 ={" "}
                  <span className="text-white font-bold">
                    {shown.total > 0 ? ((shown.deployed / shown.total) * 100).toFixed(2) : "0.00"}%
                  </span>{" "}
                  → <span className="text-emerald-400 font-bold">{Math.round(shown.rate)}%</span>
                </div>
              </div>
            </>
          )}

          {shown?.kind === "revision" && (
            <>
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <MemberAvatar
                  name={shown.name}
                  src={shown.avatar}
                  className="w-11 h-11 text-sm border bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                      RANK #{shown.rank}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Revision Share Audit</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{shown.name}</h4>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className={TILE}>
                  <p className={TILE_LABEL}>Revisions</p>
                  <p className={TILE_VALUE}>{shown.revisions}</p>
                </div>
                <div className={TILE}>
                  <p className={TILE_LABEL}>Modules</p>
                  <p className={TILE_VALUE}>{shown.revisedModules}</p>
                </div>
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-900/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Intensity</p>
                  <p className="font-mono text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
                    {shown.rAvg.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2.5 border border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Normalized Share Calculation</div>
                <div className="font-mono text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 leading-relaxed">
                  <div className="text-slate-300">
                    <span className="text-slate-500">{"// 1. Normalized Intensity"}</span>
                    <br />
                    {shown.revisions} revisions ÷ {shown.revisedModules} modules ={" "}
                    <span className="text-amber-400 font-bold">{shown.rAvg.toFixed(2)} rev/module</span>
                  </div>
                  <div className="text-slate-300 pt-2 border-t border-slate-800">
                    <span className="text-slate-500">{"// 2. Relative Team Share"}</span>
                    <br />
                    {shown.rAvg.toFixed(2)} ÷ {teamIntensitySum.toFixed(2)} (Σ team) ={" "}
                    <span className="text-white font-bold">
                      {teamIntensitySum > 0 ? ((shown.rAvg / teamIntensitySum) * 100).toFixed(1) : "0.0"}%
                    </span>{" "}
                    → <span className="text-emerald-400 font-bold">{Math.round(shown.sharePct)}%</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Vs. Team Average (<strong className="font-mono">{teamRAvg.toFixed(2)}</strong>):
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                  {teamRAvg > 0
                    ? `${(((shown.rAvg - teamRAvg) / teamRAvg) * 100).toFixed(1)}% ${
                        shown.rAvg >= teamRAvg ? "higher" : "lower"
                      } intensity`
                    : "no team baseline"}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            PERIOD: {periodLabel.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--sys-primary)] hover:opacity-90 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </aside>
    </div>,
    document.fullscreenElement ?? document.body
  );
}