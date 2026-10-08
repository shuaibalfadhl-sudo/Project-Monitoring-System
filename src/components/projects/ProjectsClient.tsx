'use client'

import { useState } from 'react'
import Link from 'next/link'
import CreateProjectModal from '@/components/projects/CreateProjectModal'

export default function ProjectsClient({ initialProjects, isManager, isAuditor, isSuperAdmin, isDeveloper }: any) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const generatePagination = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const filteredProjects = initialProjects.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  })

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {isAuditor ? 'Assigned Projects' : isSuperAdmin ? 'All Projects' : 'Projects'}
        </h1>
        <CreateProjectModal />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row w-full gap-4 items-center justify-end">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <select
          className="w-full sm:w-40 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-colors duration-300">
        {(!filteredProjects || filteredProjects.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {initialProjects.length === 0 
                ? ((isAuditor || isDeveloper) ? 'You have no assigned projects.' : isSuperAdmin ? 'There are no projects in the system.' : 'No projects found. Create your first project to get started.')
                : "No projects match your filters."
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedProjects.map((project: any) => {
                let progressPercentage = null;
                if ((isSuperAdmin || isAuditor || isDeveloper) && project.project_modules) {
                const total = project.project_modules.length;
                const completed = project.project_modules.filter((m: any) => m.status === 'qa_approved').length;
                progressPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);
              }

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg transition-all hover:border-[var(--sys-primary)] group h-full flex flex-col">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-[var(--sys-primary)] transition-colors mb-2">{project.name}</h3>
                    
                    {(isSuperAdmin || isAuditor) && (
                      <div className="flex flex-col gap-1 mb-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Created by: {project.profiles?.full_name || 'Unknown'}</span>
                        <span className="text-xs font-semibold text-[var(--sys-primary)]">Progress: {progressPercentage}%</span>
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">{project.description || 'No description'}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ${project.status === 'qa_approved' || project.status === 'for_qa' ? '' : 'capitalize'}`}>
                        {project.status === 'qa_approved' ? 'QA Approved' : project.status === 'for_qa' ? 'For QA' : project.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-700 mt-6 pt-6 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + (paginatedProjects.length > 0 ? 1 : 0)}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredProjects.length)}</span> of <span className="font-bold">{filteredProjects.length}</span> projects
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-medium">Show</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {generatePagination(currentPage, totalPages).map((page, i) => (
                      page === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold tracking-widest">...</span>
                      ) : (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(page as number)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentPage === page ? 'bg-[var(--sys-primary)] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
        )}
      </div>
    </div>
  )
}
