'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface AvatarViewerProps {
  src: string
  name: string
  onClose: () => void
  eyebrow?: string
}

const MIN_SCALE = 0.25
const MAX_SCALE = 6

export default function AvatarViewer({ src, name, onClose, eyebrow = 'Avatar preview' }: AvatarViewerProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [failed, setFailed] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const movedRef = useRef(false)

  const zoomBy = useCallback(
    (factor: number) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor))),
    [],
  )
  const reset = useCallback(() => {
    setOffset({ x: 0, y: 0 })
    setRotation(0)
    setScale(1)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoomBy(1.2)
      else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.2)
      else if (e.key === 'ArrowLeft') setRotation((r) => r - 90)
      else if (e.key === 'ArrowRight') setRotation((r) => r + 90)
      else if (e.key === '0') reset()
      else return
      e.preventDefault()
      // Capture phase: keep Esc/zoom keys from also reaching an underlying modal.
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, zoomBy, reset])

  const toolButton =
    'w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/15 active:bg-white/25 transition-colors'

  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} preview`}
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{eyebrow}</p>
          <h3 className="text-sm font-extrabold text-white truncate">{name}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close viewer" title="Close (Esc)" className={toolButton}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          stageRef.current?.setPointerCapture(e.pointerId)
          dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
          movedRef.current = false
          setDragging(true)
        }}
        onPointerMove={(e) => {
          const d = dragRef.current
          if (!d) return
          const dx = e.clientX - d.px
          const dy = e.clientY - d.py
          if (Math.hypot(dx, dy) > 4) movedRef.current = true
          setOffset({ x: d.ox + dx, y: d.oy + dy })
        }}
        onPointerUp={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onClick={(e) => {
          if (movedRef.current) {
            movedRef.current = false
            return
          }
          if (e.target === e.currentTarget) onClose()
        }}
        className={`relative flex-1 min-h-0 overflow-hidden flex items-center justify-center ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {failed ? (
          <div className="px-6 py-5 rounded-2xl bg-white/10 border border-white/15 text-center">
            <p className="text-sm font-bold text-white">This image couldn&apos;t be loaded.</p>
            <p className="text-xs text-white/60 mt-1">The file may have been removed or is not a valid image.</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            draggable={false}
            onError={() => {
              console.error('Image failed to load:', src)
              setFailed(true)
            }}
            onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2.2))}
            className="max-h-[72vh] max-w-[86vw] object-contain select-none rounded-lg shadow-2xl"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
              transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}
      </div>

      <div className="shrink-0 flex flex-col items-center gap-2 px-4 pb-5">
        <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-2.5 py-2">
          <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out" title="Zoom out (-)" className={toolButton}>
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="w-14 text-center text-xs font-bold text-white/80 tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in" title="Zoom in (+)" className={toolButton}>
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          <span className="w-px h-6 bg-white/15 mx-1" />
          <button type="button" onClick={() => setRotation((r) => r - 90)} aria-label="Rotate left" title="Rotate left (←)" className={toolButton}>
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />
            </svg>
          </button>
          <button type="button" onClick={() => setRotation((r) => r + 90)} aria-label="Rotate right" title="Rotate right (→)" className={toolButton}>
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5" />
            </svg>
          </button>
          <span className="w-px h-6 bg-white/15 mx-1" />
          <button type="button" onClick={reset} aria-label="Reset view" title="Reset view (0)" className={toolButton}>
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] font-medium text-white/50">
          Drag to move · Scroll to zoom · Double-click to toggle zoom · Esc to close
        </p>
      </div>
    </div>,
    document.body,
  )
}