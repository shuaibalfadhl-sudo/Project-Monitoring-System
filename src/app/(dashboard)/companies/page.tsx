"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [newCompanyName, setNewCompanyName] = useState('')
  const [creatingCompany, setCreatingCompany] = useState(false)
  
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      setCurrentUser(userData.user)

      // Fetch companies the user is part of
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

      // Fetch members for these companies
      if (companiesData && companiesData.length > 0) {
        const companyIds = companiesData.map(c => c.id)
        const { data: membersData, error: membersError } = await supabase
          .from('company_members')
          .select(`
            id,
            company_id,
            role,
            user_id
          `)
          .in('company_id', companyIds)

        if (membersError) throw membersError

        let membersMap: Record<string, any[]> = {}
        companiesData.forEach(c => membersMap[c.id] = [])
        
        if (membersData && membersData.length > 0) {
          const userIds = membersData.map(m => m.user_id)
          
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', userIds)
            
          const profileMap = new Map()
          if (profilesData) {
            profilesData.forEach(p => profileMap.set(p.id, p))
          }

          membersData.forEach(m => {
            if (membersMap[m.company_id]) {
              membersMap[m.company_id].push({
                ...m,
                profiles: profileMap.get(m.user_id) || null
              })
            }
          })
        }
        setMembers(membersMap)
      }
    } catch (error: any) {
      toast.error('Failed to load companies: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return

    setCreatingCompany(true)
    try {
      const { error } = await supabase
        .from('companies')
        .insert({
          name: newCompanyName.trim(),
          owner_id: currentUser.id
        })
      
      if (error) throw error
      
      toast.success('Company created successfully')
      setNewCompanyName('')
      fetchData() // Refresh
      router.refresh() // Refresh layout
    } catch (error: any) {
      toast.error('Failed to create company: ' + error.message)
    } finally {
      setCreatingCompany(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent, companyId: string) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) return

    setAddingMember(true)
    try {
      // 1. Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newMemberEmail.trim())
        .single()

      if (profileError || !profileData) {
        throw new Error('User not found with this email')
      }

      // 2. Add to company
      const { error: insertError } = await supabase
        .from('company_members')
        .insert({
          company_id: companyId,
          user_id: profileData.id,
          role: 'member'
        })

      if (insertError) throw insertError

      toast.success('Member added successfully')
      setAddingMemberTo(null)
      setNewMemberEmail('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('company_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      
      toast.success('Member removed')
      fetchData()
    } catch (error: any) {
      toast.error('Failed to remove member: ' + error.message)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading companies...</div>
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Company Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your companies and members</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Create a New Company</h2>
        <form onSubmit={handleCreateCompany} className="flex gap-4 max-w-lg">
          <input
            type="text"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="Company Name"
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            disabled={creatingCompany}
          />
          <button
            type="submit"
            disabled={creatingCompany || !newCompanyName.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {creatingCompany ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="space-y-8">
        {companies.map(company => {
          const isOwner = company.owner_id === currentUser?.id
          const companyMembers = members[company.id] || []

          return (
            <div key={company.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{company.name}</h3>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {isOwner ? 'You are the Owner' : 'Member'}
                  </span>
                </div>
                
                {isOwner && (
                  <button
                    onClick={() => {
                      setAddingMemberTo(company.id)
                      setNewMemberEmail('')
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors text-sm"
                  >
                    + Add Member
                  </button>
                )}
              </div>

              {addingMemberTo === company.id && (
                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-slate-100 dark:border-slate-800">
                  <form onSubmit={(e) => handleAddMember(e, company.id)} className="flex gap-4 max-w-lg">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="User's Email Address"
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      disabled={addingMember}
                    />
                    <button
                      type="submit"
                      disabled={addingMember || !newMemberEmail.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                      {addingMember ? 'Adding...' : 'Add User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingMemberTo(null)}
                      className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-sm"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              <div className="p-0">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">System Role</th>
                      <th className="px-6 py-4">Company Role</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {companyMembers.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                          {member.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {member.profiles?.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {member.profiles?.role?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            member.role === 'owner' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isOwner && member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {companies.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Companies Yet</h3>
            <p className="text-slate-500 dark:text-slate-400">Create a company above to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
