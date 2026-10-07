'use client'

import { useState } from 'react'
import RemoveMemberButton from '@/components/projects/RemoveMemberButton'

interface Member {
  user_id: string
  id: string
  full_name: string
  is_owner: boolean
}

export default function ViewAllMembersModal({ members, isManager, projectId }: { members: Member[], isManager: boolean, projectId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
      >
        View All
      </button>
    )
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
      >
        View All
      </button>

      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {/* Modal Content */}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">All Project Members</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {members.map(member => (
              <div key={member.user_id || member.id} className={`flex justify-between items-center p-4 rounded-xl border ${member.is_owner ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${member.is_owner ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                    {(member.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--sys-primary)]">{member.full_name || 'Unnamed member'}</p>
                      {member.is_owner && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Owner</span>
                      )}
                    </div>
                  </div>
                </div>
                {isManager && !member.is_owner && (
                  <RemoveMemberButton projectId={projectId} userId={member.user_id || member.id} />
                )}
              </div>
            ))}
            
            {members.length === 0 && (
              <p className="text-center text-gray-500 py-4 font-medium">No members found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
