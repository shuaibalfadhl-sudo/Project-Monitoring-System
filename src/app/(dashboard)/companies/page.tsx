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
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'member'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null)

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
      setIsCreateModalOpen(false)
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

      // Check if user is already a member
      const existingMember = members[companyId]?.find(m => m.user_id === profileData.id)
      if (existingMember) {
        throw new Error('This user is already a member of the company.')
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
      setIsAddMemberModalOpen(false)
      setNewMemberEmail('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member? They will lose access to all projects in this company.',
      confirmText: 'Remove',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setConfirmDialog(null)
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
    })
  }

  const handleTransferOwnership = async (newOwnerUserId: string, companyId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Transfer Ownership',
      message: 'Are you sure you want to transfer ownership to this user? You will become a regular member and lose owner privileges.',
      confirmText: 'Transfer Ownership',
      confirmColor: 'bg-amber-500 hover:bg-amber-600',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const currentOwnerMemberId = members[companyId]?.find(m => m.user_id === currentUser.id)?.id
          const newOwnerMemberId = members[companyId]?.find(m => m.user_id === newOwnerUserId)?.id

          if (!currentOwnerMemberId || !newOwnerMemberId) throw new Error("Could not find member records")

          // Update companies table owner
          const { error: companyError } = await supabase
            .from('companies')
            .update({ owner_id: newOwnerUserId })
            .eq('id', companyId)

          if (companyError) throw companyError

          // Downgrade old owner to member
          await supabase
            .from('company_members')
            .update({ role: 'member' })
            .eq('id', currentOwnerMemberId)

          // Upgrade new owner to owner
          await supabase
            .from('company_members')
            .update({ role: 'owner' })
            .eq('id', newOwnerMemberId)

          toast.success('Ownership transferred successfully')
          fetchData()
        } catch (error: any) {
          toast.error('Failed to transfer ownership: ' + error.message)
        }
      }
    })
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 font-medium text-slate-500">Loading companies...</div>
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Company Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your companies and members</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-[var(--sys-primary)] hover:opacity-90 text-white font-bold rounded-xl transition-opacity flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create Company
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] text-slate-900 dark:text-white font-medium shadow-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] text-slate-900 dark:text-white font-medium shadow-sm appearance-none"
          >
            <option value="all">All Companies</option>
            <option value="owner">Owned by Me</option>
            <option value="member">Member Only</option>
          </select>
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Company Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-widest text-slate-500 font-black">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Your Role</th>
              <th className="px-6 py-4">Total Members</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {companies.filter(company => {
              const isOwner = company.owner_id === currentUser?.id
              const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
              const matchesRole = roleFilter === 'all' ? true : roleFilter === 'owner' ? isOwner : !isOwner
              return matchesSearch && matchesRole
            }).map(company => {
              const isOwner = company.owner_id === currentUser?.id
              const companyMembers = members[company.id] || []
              return (
                <tr 
                  key={company.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  <td className="px-6 py-5 text-sm font-bold text-slate-900 dark:text-white">
                    {company.name}
                  </td>
                  <td className="px-6 py-5 text-sm">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      isOwner 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    }`}>
                      {isOwner ? 'Owner' : 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {companyMembers.slice(0, 3).map((m, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-500 dark:text-slate-400">
                            {(m.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span>{companyMembers.length} Members</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-sm font-bold text-[var(--sys-primary)] group-hover:underline flex items-center justify-end gap-1 w-full">
                      View Details
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
            {companies.filter(company => {
              const isOwner = company.owner_id === currentUser?.id
              const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
              const matchesRole = roleFilter === 'all' ? true : roleFilter === 'owner' ? isOwner : !isOwner
              return matchesSearch && matchesRole
            }).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="font-medium">No companies found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer Overlay */}
      {selectedCompanyId && (
        <div 
          className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm z-[50] flex justify-end transition-opacity"
          onClick={() => setSelectedCompanyId(null)}
        >
          {/* Drawer Panel */}
          <div 
            className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--sys-primary)] text-white flex items-center justify-center text-sm shadow-sm">
                  {companies.find(c => c.id === selectedCompanyId)?.name.charAt(0).toUpperCase()}
                </div>
                {companies.find(c => c.id === selectedCompanyId)?.name}
              </h2>
              <button 
                onClick={() => setSelectedCompanyId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-6 pb-2 shrink-0">
                {companies.find(c => c.id === selectedCompanyId)?.owner_id === currentUser?.id && (
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="w-full py-4 mb-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--sys-primary)] font-black rounded-2xl transition-colors text-sm border-2 border-dashed border-indigo-100 dark:border-slate-700 flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Invite New Member
                  </button>
                )}

                <div className="relative mb-6">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] text-slate-900 dark:text-white text-sm font-medium shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Members</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {(members[selectedCompanyId] || []).length}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3">
                {(members[selectedCompanyId] || []).filter(member => {
                  if (!memberSearchQuery) return true
                  return member.profiles?.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                         member.profiles?.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                }).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        {(member.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.profiles?.full_name || 'Unknown User'}</h4>
                        <p className="text-xs font-medium text-slate-500 truncate">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider font-black ${
                        member.role === 'owner' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                        {member.role}
                      </span>
                      {companies.find(c => c.id === selectedCompanyId)?.owner_id === currentUser?.id && member.role !== 'owner' && (
                        <div className="flex items-center gap-3 mt-1">
                          <button
                            onClick={() => handleTransferOwnership(member.user_id, selectedCompanyId)}
                            className="text-amber-500 hover:text-amber-700 text-[10px] font-bold transition-colors uppercase tracking-wider"
                          >
                            Make Owner
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold transition-colors uppercase tracking-wider"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {(members[selectedCompanyId] || []).filter(member => {
                  if (!memberSearchQuery) return true
                  return member.profiles?.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                         member.profiles?.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                }).length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm font-medium">
                    No members found matching "{memberSearchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Pop-up Modal */}
      {isAddMemberModalOpen && selectedCompanyId && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Team Member</h3>
              <button 
                onClick={() => setIsAddMemberModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                handleAddMember(e, selectedCompanyId)
              }} 
              className="p-6"
            >
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  User Email Address
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter email to invite..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white"
                  disabled={addingMember}
                  autoFocus
                />
                <p className="mt-3 text-xs font-medium text-slate-500 flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  The user must already be registered in the system before they can be added to your company.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !newMemberEmail.trim()}
                  className="px-6 py-2.5 bg-[var(--sys-primary)] hover:opacity-90 text-white font-bold rounded-xl transition-opacity disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {addingMember && (
                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Company Pop-up Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Create New Company</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="p-6">
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="E.g. Acme Corp"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white"
                  disabled={creatingCompany}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCompany || !newCompanyName.trim()}
                  className="px-6 py-2.5 bg-[var(--sys-primary)] hover:opacity-90 text-white font-bold rounded-xl transition-opacity disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {creatingCompany && (
                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {creatingCompany ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 pt-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-6 py-2.5 text-white font-bold rounded-xl transition-colors text-sm ${confirmDialog.confirmColor}`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
