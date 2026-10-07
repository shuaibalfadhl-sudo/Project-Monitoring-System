'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AddMemberPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    async function fetchCandidates() {
      if (searchTerm.length < 2) {
        setCandidates([])
        return
      }

      const { data, error } = await supabase.rpc('search_project_member_candidates', {
        p_project_id: resolvedParams.projectId,
        p_search: searchTerm
      })
      
      if (error) {
        console.error('RPC Error:', error)
      } else if (data) {
        setCandidates(data)
      }
    }
    
    const timeoutId = setTimeout(fetchCandidates, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, resolvedParams.projectId, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }
    
    setIsLoading(true)

    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: resolvedParams.projectId,
        user_id: selectedUserId
      })

    if (error) {
      toast.error(error.message.includes('unique constraint') ? 'User is already a member.' : error.message)
      setIsLoading(false)
    } else {
      toast.success('Member added successfully!')
      router.push(`/projects/${resolvedParams.projectId}`)
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-8">Add Project Member</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Search for a User (Name or Email)</label>
          <input 
            type="text"
            className="w-full px-4 py-3 mb-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium"
            placeholder="Type at least 2 characters to search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setSelectedUserId('') // Reset selection on new search
            }}
          />
          
          {candidates.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {candidates.map(user => (
                <div 
                  key={user.user_id} 
                  onClick={() => setSelectedUserId(user.user_id)}
                  className={`p-3 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${selectedUserId === user.user_id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--sys-primary)]">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {searchTerm.length >= 2 && candidates.length === 0 && (
            <p className="text-sm text-gray-500 italic mt-2">No users found matching "{searchTerm}"</p>
          )}
        </div>
        <div className="pt-4 flex gap-4">
          <button type="button" onClick={() => router.back()} className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-colors">Cancel</button>
          <button type="submit" disabled={isLoading || !selectedUserId} className="flex-1 py-3.5 px-4 text-white bg-[var(--sys-primary)] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50">
            {isLoading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  )
}
