'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ConfirmStatusModal from '@/components/modules/ConfirmStatusModal'

interface RemoveMemberButtonProps {
  projectId: string
  userId: string
}

export default function RemoveMemberButton({ projectId, userId }: RemoveMemberButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRemove = async () => {
    setIsLoading(true)

    try {
      // 1. Remove from project_members
      const { error: removeError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (removeError) throw removeError;

      // 2. Set assigned_developer_id to null for their modules
      const { error: updateError } = await supabase
        .from('project_modules')
        .update({ assigned_developer_id: null })
        .eq('project_id', projectId)
        .eq('assigned_developer_id', userId)

      if (updateError) console.error("Could not unassign modules:", updateError)

      toast.success("Member removed successfully")
      setShowConfirm(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(true)
        }}
        disabled={isLoading}
        className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {isLoading ? '...' : 'Remove'}
      </button>

      <ConfirmStatusModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRemove}
        isLoading={isLoading}
        title="Remove Member"
        message="Are you sure you want to remove this member? This also unassigns them from their modules in this project."
        confirmText="Remove Member"
        confirmButtonClass="bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
      />
    </>
  )
}
