'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  moduleId: string
  moduleName: string
}

export default function ConfirmDeleteModal({ isOpen, onClose, moduleId, moduleName }: ConfirmDeleteModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await supabase
      .from('project_modules')
      .delete()
      .eq('id', moduleId)

    setIsDeleting(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Module deleted successfully!')
      onClose()
      router.refresh()
    }
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Module</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Are you sure you want to delete <span className="font-bold text-gray-700 dark:text-slate-300">"{moduleName}"</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-2.5 bg-red-500 text-white hover:bg-red-600 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 min-w-[100px]"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
