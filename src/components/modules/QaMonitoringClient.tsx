'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QaModule {
  id: string
  name: string
  description: string | null
  priority: number
  status: string
  project: {
    id: string
    name: string
  }
}

interface QaMonitoringClientProps {
  initialModules: QaModule[]
}

export default function QaMonitoringClient({ initialModules }: QaMonitoringClientProps) {
  const [modules, setModules] = useState<QaModule[]>(initialModules)
  const [selectedModule, setSelectedModule] = useState<QaModule | null>(null)
  
  const [newStatus, setNewStatus] = useState<string>('')
  const [reworkLink, setReworkLink] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleRowClick = (mod: QaModule) => {
    setSelectedModule(mod)
    setNewStatus('')
    setReworkLink('')
    setError('')
  }

  const closeModal = () => {
    setSelectedModule(null)
    setNewStatus('')
    setReworkLink('')
    setError('')
  }

  const handleSave = async () => {
    if (!selectedModule || !newStatus) return
    
    if (newStatus === 'rework' && !reworkLink.trim()) {
      setError('Please provide a document link or description for the rework.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      let updatedDescription = selectedModule.description
      if (newStatus === 'rework') {
        updatedDescription = updatedDescription 
          ? `${updatedDescription}\n\n[Rework Note]: ${reworkLink}`
          : `[Rework Note]: ${reworkLink}`
      }

      const { error: updateError } = await supabase
        .from('project_modules')
        .update({ 
          status: newStatus,
          description: updatedDescription 
        })
        .eq('id', selectedModule.id)

      if (updateError) throw updateError

      // Remove module from list if it's no longer 'for_qa'
      setModules(prev => prev.filter(m => m.id !== selectedModule.id))
      closeModal()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the module.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h1 className="text-3xl font-extrabold text-[#2d3748] mb-6">QA Monitoring</h1>
      
      <div className="mb-8">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl shadow-sm inline-block min-w-64">
          <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">Total Modules Pending QA</h3>
          <p className="text-5xl font-black text-amber-600">{modules.length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {modules.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 border-t border-dashed border-gray-200">
             <p className="text-gray-500 font-medium">There are currently no modules waiting for QA across your assigned projects.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-100">
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 uppercase tracking-wider text-center w-24">Priority</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 uppercase tracking-wider">Module Name</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 uppercase tracking-wider">Project Name</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules.map((mod) => (
                  <tr 
                    key={mod.id} 
                    onClick={() => handleRowClick(mod)}
                    className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black">
                        {mod.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#2d3748] group-hover:text-amber-700 transition-colors">
                      {mod.name}
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-600">
                      {mod.project.name}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 capitalize border border-amber-200">
                        {mod.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-[#2d3748]">Review Module</h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{selectedModule.project.name}</p>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Module Name</h3>
                <p className="text-lg font-bold text-[#2d3748]">{selectedModule.name}</p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Update Status</h3>
                <div className="flex gap-4">
                  <label className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === 'qa_approved' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.15)]' : 'border-gray-200 hover:border-emerald-200 text-gray-500 hover:bg-emerald-50/50'}`}>
                    <input type="radio" name="status" value="qa_approved" className="hidden" checked={newStatus === 'qa_approved'} onChange={(e) => setNewStatus(e.target.value)} />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === 'qa_approved' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-bold">QA Passed</span>
                  </label>
                  
                  <label className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === 'rework' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-[0_4px_12px_rgba(225,29,72,0.15)]' : 'border-gray-200 hover:border-rose-200 text-gray-500 hover:bg-rose-50/50'}`}>
                    <input type="radio" name="status" value="rework" className="hidden" checked={newStatus === 'rework'} onChange={(e) => setNewStatus(e.target.value)} />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === 'rework' ? 'bg-rose-100' : 'bg-gray-100'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-bold">Needs Rework</span>
                  </label>
                </div>
              </div>

              {newStatus === 'rework' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-2">
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Required Rework Details <span className="text-rose-500 text-base">*</span>
                  </h3>
                  <textarea
                    value={reworkLink}
                    onChange={(e) => setReworkLink(e.target.value)}
                    placeholder="Enter document link or provide a description of what needs to be fixed..."
                    className="w-full p-4 rounded-xl border-2 border-rose-100 bg-rose-50/50 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all resize-none h-32 text-[#2d3748] font-medium placeholder:text-rose-300"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl font-medium text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newStatus || isSubmitting}
                className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${
                  !newStatus ? 'bg-gray-300 cursor-not-allowed shadow-none' : 
                  newStatus === 'qa_approved' ? 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5 shadow-emerald-500/20' : 
                  'bg-rose-500 hover:bg-rose-600 hover:-translate-y-0.5 shadow-rose-500/20'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
