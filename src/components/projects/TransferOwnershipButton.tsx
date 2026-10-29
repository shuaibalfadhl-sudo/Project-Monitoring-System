'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ConfirmStatusModal from '@/components/modules/ConfirmStatusModal'

interface TransferOwnershipButtonProps {
  projectId: string
  userId: string
  memberName: string
}

export default function TransferOwnershipButton({ projectId, userId, memberName }: TransferOwnershipButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleTransfer = async () => {
    setIsLoading(true)

    try {
      // Ownership changes must go through the RPC; direct project_members
      // updates are denied by RLS.
      const { error } = await supabase.rpc('transfer_project_owner', {
        p_project_id: projectId,
        p_new_owner_id: userId,
      })

      if (error) throw error

      toast.success(`Ownership transferred to ${memberName}`)
      setShowConfirm(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer ownership')
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
        className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {isLoading ? '...' : 'Make Owner'}
      </button>

      <ConfirmStatusModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleTransfer}
        isLoading={isLoading}
        title="Transfer Ownership"
        message={`Make ${memberName} the owner of this project? You will lose ownership.`}
        confirmText="Transfer Ownership"
        confirmButtonClass="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
      />
    </>
  )
}
