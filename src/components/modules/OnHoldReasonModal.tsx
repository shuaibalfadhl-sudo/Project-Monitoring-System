'use client'

import { useEffect, useState } from 'react'
import ConfirmStatusModal from '@/components/modules/ConfirmStatusModal'

interface OnHoldReasonModalProps {
  isOpen: boolean
  moduleName?: string
  isLoading?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function OnHoldReasonModal({
  isOpen,
  moduleName,
  isLoading = false,
  onClose,
  onConfirm,
}: OnHoldReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError('')
    }
  }, [isOpen])

  function handleConfirm() {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('A reason is required to put this module on hold.')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <ConfirmStatusModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      title="Put Module On Hold"
      confirmText="Set On Hold"
      confirmButtonClass="bg-zinc-700 hover:bg-zinc-800 text-white shadow-zinc-500/20"
      message={
        <>
          {moduleName ? (
            <>
              <span className="font-bold text-slate-800 dark:text-white">"{moduleName}"</span> will
              be moved to On Hold.
            </>
          ) : (
            'This module will be moved to On Hold.'
          )}
        </>
      }
    >
      <div className="text-left mb-2">
        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Reason for hold
        </label>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            if (error) setError('')
          }}
          rows={3}
          maxLength={2000}
          placeholder="Why is this module on hold?"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white resize-none"
        />
        {error && (
          <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-2">{error}</p>
        )}
      </div>
    </ConfirmStatusModal>
  )
}
