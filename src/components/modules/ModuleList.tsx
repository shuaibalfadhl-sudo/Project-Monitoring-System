'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProjectModule } from '@/types/project'

interface ModuleListProps {
  modules: ProjectModule[]
  projectId: string
  isManager: boolean
  isAuditor: boolean
}

export default function ModuleList({ modules, projectId, isManager, isAuditor }: ModuleListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedModule, setSelectedModule] = useState<ProjectModule | null>(null)

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || module.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[#2d3748]">Modules</h2>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 items-center">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="w-full sm:w-40 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="development">Development</option>
            <option value="pm_review">PM Review</option>
            <option value="for_qa">For QA</option>
            <option value="auditing">Auditing</option>
            <option value="rework">Rework</option>
            <option value="qa_approved">QA Approved</option>
          </select>

          {isManager && (
            <Link href={`/projects/${projectId}/modules/new`} className="w-full sm:w-auto py-2 px-5 bg-white border border-gray-200 text-[#2d3748] hover:bg-gray-50 hover:border-gray-300 rounded-xl font-bold transition-all shadow-sm text-sm text-center">
              + Add
            </Link>
          )}
        </div>
      </div>
      
      <div className="p-8">
        {(!modules || modules.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">No modules have been created yet.</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">No modules match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="pb-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Module Name</th>
                  <th className="pb-4 font-bold text-sm text-gray-500 uppercase tracking-wider text-center">Priority</th>
                  <th className="pb-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="pb-4 font-bold text-sm text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredModules.map((module: ProjectModule) => (
                  <tr 
                    key={module.id} 
                    onClick={() => setSelectedModule(module)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 font-bold text-[#2d3748]">
                      {module.name}
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {module.priority}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${module.status === 'qa_approved' ? 'bg-green-100 text-green-700' : module.status === 'rework' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {(module.status || 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-4" onClick={(e) => e.stopPropagation()}>
                        {(isManager || isAuditor) && (
                          <Link href={`/projects/${projectId}/modules/${module.id}/edit`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Edit</Link>
                        )}
                        {isManager && (
                          <button className="text-sm font-semibold text-red-500 hover:text-red-700">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Module Details Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-extrabold text-[#2d3748]">Module Details</h2>
              <button 
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Module Name</h3>
                <p className="text-lg font-bold text-[#2d3748]">{selectedModule.name}</p>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap font-medium">
                  {selectedModule.description || <span className="italic text-gray-400">No description provided for this module.</span>}
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</h3>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {selectedModule.priority}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold capitalize ${selectedModule.status === 'qa_approved' ? 'bg-green-100 text-green-700' : selectedModule.status === 'rework' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {(selectedModule.status || 'pending').replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
