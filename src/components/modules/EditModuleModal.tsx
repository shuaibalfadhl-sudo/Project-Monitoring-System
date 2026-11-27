'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ProjectModule, ModuleStatus } from '@/types/project'
import { STATUS_GROUPS, statusesIn, statusLabel, statusBadgeClass } from '@/lib/moduleStatuses'
import { PLATFORM_OPTIONS, WORKSTREAM_OPTIONS } from '@/lib/moduleClassifications'
import PrototypeSection from '@/components/modules/PrototypeSection'

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--sys-primary)] focus:ring-4 focus:ring-[var(--sys-primary)]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300'

export default function EditModuleModal({ module, isManager, isQaRevisionMode, isSuperAdmin, canManagePrototype }: { module: ProjectModule, isManager?: boolean, isQaRevisionMode?: boolean, isSuperAdmin?: boolean, canManagePrototype?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [developers, setDevelopers] = useState<{ id: string, full_name: string }[]>([])
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(false)
  const [devSearch, setDevSearch] = useState('')

  const [formData, setFormData] = useState({
    name: module.name,
    description: module.description || '',
    priority: module.priority,
    status: module.status || 'pending',
    module_document_url: module.module_document_url || '',
    assigned_developer_id: module.assigned_developer_id || '',
    category: module.category || 'new_module',
    platform: module.platform || '',
    workstream: module.workstream || '',
    deadline: module.deadline || '',
    development_date: module.development_date || '',
    website_link: module.website_link || '',
    on_hold_remarks: module.on_hold_remarks || ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Re-sync form state from current module prop
      const formatDeadline = (d?: string | null) => {
        if (!d) return ''
        return d.includes('T') ? d.split('T')[0] : d
      }

      setFormData({
        name: module.name || '',
        description: module.description || '',
        priority: module.priority || 'medium',
        status: module.status || 'pending',
        module_document_url: module.module_document_url || '',
        assigned_developer_id: module.assigned_developer_id || '',
        category: module.category || 'new_module',
        platform: module.platform || '',
        workstream: module.workstream || '',
        deadline: formatDeadline(module.deadline),
        development_date: formatDeadline(module.development_date),
        website_link: module.website_link || '',
        on_hold_remarks: module.on_hold_remarks || ''
      })

      // Fetch the latest module record directly from database to guarantee the latest registered deadline is displayed
      const fetchLatestModuleData = async () => {
        const { data, error } = await supabase
          .from('project_modules')
          .select('*')
          .eq('id', module.id)
          .single()

        if (!error && data) {
          setFormData({
            name: data.name || '',
            description: data.description || '',
            priority: data.priority || 'medium',
            status: data.status || 'pending',
            module_document_url: data.module_document_url || '',
            assigned_developer_id: data.assigned_developer_id || '',
            category: data.category || 'new_module',
            platform: data.platform || '',
            workstream: data.workstream || '',
            deadline: formatDeadline(data.deadline),
            development_date: formatDeadline(data.development_date),
            website_link: data.website_link || '',
            on_hold_remarks: data.on_hold_remarks || ''
          })
        }
      }

      fetchLatestModuleData()

      // Fetch developers assigned to this project
      const fetchAssignments = async () => {
        const { data, error } = await supabase
          .from('project_members')
          .select('user_id, profiles!inner(id, full_name, role)')
          .eq('project_id', module.project_id)
          .in('profiles.role', ['developer', 'devops', 'trainee']);

        if (!error && data) {
          setDevelopers(data.map((d: any) => ({
            id: d.profiles.id,
            full_name: d.profiles.full_name || 'Unnamed Developer'
          })));
        }
      };

      fetchAssignments();
    }
  }, [isOpen, module, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.deadline) {
      toast.error('Please insert a deadline time')
      return
    }

    if (formData.status === 'on_hold' && module.status !== 'on_hold' && !formData.on_hold_remarks.trim()) {
      toast.error('A reason is required when putting a module on hold')
      return
    }

    setIsLoading(true)

    const dataToSubmit = { ...formData };
    if (dataToSubmit.assigned_developer_id === '') {
      dataToSubmit.assigned_developer_id = null as any;
    }
    if (dataToSubmit.deadline === '') {
      dataToSubmit.deadline = null as any;
    }
    if (dataToSubmit.development_date === '') {
      dataToSubmit.development_date = null as any;
    }
    // Empty selects must be stored as NULL; the DB CHECK constraints reject ''.
    if (dataToSubmit.platform === '') {
      dataToSubmit.platform = null as any;
    }
    if (dataToSubmit.workstream === '') {
      dataToSubmit.workstream = null as any;
    }
    if (dataToSubmit.on_hold_remarks === '') {
      dataToSubmit.on_hold_remarks = null as any;
    }

    const { error } = await supabase
      .from('project_modules')
      .update(dataToSubmit)
      .eq('id', module.id)

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
    } else {
      toast.success('Module updated successfully!')
      setIsOpen(false)
      router.refresh()
      setIsLoading(false)
    }
  }

  const statusLocked = isManager && !isSuperAdmin && !isQaRevisionMode;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        Edit
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-module-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5" />
                  </svg>
                </span>
                <div>
                  <h2 id="edit-module-title" className="text-xl font-extrabold tracking-tight text-[var(--sys-primary-text)]">Edit Module</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Update the module details, schedule, and resources.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close edit module dialog"
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-5 py-6 text-left dark:bg-slate-950/30 sm:px-8 sm:py-8">
              <form id="edit-module-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Module Details</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Keep the module name and scope clear for everyone involved.</p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <label htmlFor="edit-module-name" className={labelClass}>Module Name <span className="text-red-500">*</span></label>
                      <input
                        id="edit-module-name"
                        type="text"
                        required
                        autoFocus
                        className={inputClass}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <label htmlFor="edit-module-category" className={labelClass}>Category</label>
                      <select
                        id="edit-module-category"
                        className={inputClass}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="new_module">New Module</option>
                        <option value="revise_module">Revise Module</option>
                      </select>
                    </div>
                    <div className="lg:col-span-12">
                      <label htmlFor="edit-module-description" className={labelClass}>Description</label>
                      <textarea
                        id="edit-module-description"
                        rows={4}
                        className={`${inputClass} resize-none leading-6`}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Summarize the module requirements, expected outcome, and important notes..."
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Classification & Schedule</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Update the module’s priority, workflow status, and target dates.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label htmlFor="edit-module-priority" className={labelClass}>Priority</label>
                      <select
                        id="edit-module-priority"
                        className={inputClass}
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-module-platform" className={labelClass}>Platform</label>
                      <select
                        id="edit-module-platform"
                        className={inputClass}
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      >
                        <option value="">Not set</option>
                        {PLATFORM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-module-workstream" className={labelClass}>Workstream</label>
                      <select
                        id="edit-module-workstream"
                        className={inputClass}
                        value={formData.workstream}
                        onChange={(e) => setFormData({ ...formData, workstream: e.target.value })}
                      >
                        <option value="">Not set</option>
                        {WORKSTREAM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className={labelClass}>Status</span>
                      {statusLocked ? (
                        <>
                          <div className="flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <span className={`inline-flex items-center rounded-lg border border-transparent px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(formData.status)}`}>
                              {statusLabel(formData.status)}
                            </span>
                            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <p className="mt-2 text-xs font-medium text-slate-400">Status is managed through workflow actions, not editing.</p>
                        </>
                      ) : (
                        <select
                          id="edit-module-status"
                          className={inputClass}
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as ModuleStatus })}
                        >
                          {isQaRevisionMode ? (
                            <>
                              {formData.status === "revision" && (
                                <option value="revision">Revision</option>
                              )}
                              {statusesIn(STATUS_GROUPS.editQaRevision).map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </>
                          ) : (
                            statusesIn(
                              (!isManager || isSuperAdmin)
                                ? [...STATUS_GROUPS.editBase, ...STATUS_GROUPS.editExtra]
                                : STATUS_GROUPS.editBase,
                            ).map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                    <div>
                      <label htmlFor="edit-module-deadline" className={labelClass}>Deadline <span className="text-red-500">*</span></label>
                      <input
                        id="edit-module-deadline"
                        type="date"
                        required
                        className={inputClass}
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-module-development-date" className={labelClass}>Development Date</label>
                      <input
                        id="edit-module-development-date"
                        type="date"
                        className={inputClass}
                        value={formData.development_date}
                        onChange={(e) => setFormData({ ...formData, development_date: e.target.value })}
                      />
                    </div>

                    {formData.status === 'on_hold' && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 md:col-span-2 xl:col-span-3">
                        <label htmlFor="edit-module-hold-remarks" className={labelClass}>
                          Reason for hold
                          {module.status !== 'on_hold' && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>
                        <textarea
                          id="edit-module-hold-remarks"
                          rows={3}
                          maxLength={2000}
                          required={module.status !== 'on_hold'}
                          placeholder="Why is this module on hold?"
                          className={`${inputClass} resize-none bg-white dark:bg-slate-900`}
                          value={formData.on_hold_remarks}
                          onChange={(e) => setFormData({ ...formData, on_hold_remarks: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Assignment & Resources</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Update the developer assignment, shared links, and prototype.</p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label htmlFor="edit-module-developer" className={labelClass}>Assign Developer</label>
                      <div className="relative">
                        <button
                          id="edit-module-developer"
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isDevDropdownOpen}
                          aria-controls="edit-module-developer-options"
                          onClick={() => setIsDevDropdownOpen(!isDevDropdownOpen)}
                          className={`${inputClass} flex items-center justify-between gap-3 text-left`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" />
                              </svg>
                            </span>
                            <span className="truncate">
                              {formData.assigned_developer_id
                                ? developers.find(d => d.id === formData.assigned_developer_id)?.full_name || 'Unknown'
                                : 'Unassigned'}
                            </span>
                          </span>
                          <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isDevDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isDevDropdownOpen && (
                          <div className="absolute z-30 mt-2 flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <div className="border-b border-gray-100 bg-gray-50/70 p-2 dark:border-slate-800 dark:bg-slate-800/70">
                              <input
                                type="text"
                                aria-label="Search developers"
                                placeholder="Search developer..."
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--sys-primary)] focus:ring-2 focus:ring-[var(--sys-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={devSearch}
                                onChange={(e) => setDevSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            <div id="edit-module-developer-options" role="listbox" className="no-scrollbar flex-1 overflow-y-auto p-1">
                              <button
                                type="button"
                                role="option"
                                aria-selected={!formData.assigned_developer_id}
                                onClick={() => { setFormData({ ...formData, assigned_developer_id: '' }); setIsDevDropdownOpen(false); setDevSearch(''); }}
                                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${!formData.assigned_developer_id ? 'bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                              >
                                Unassigned
                              </button>
                              {developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).map(dev => (
                                <button
                                  key={dev.id}
                                  type="button"
                                  role="option"
                                  aria-selected={formData.assigned_developer_id === dev.id}
                                  onClick={() => { setFormData({ ...formData, assigned_developer_id: dev.id }); setIsDevDropdownOpen(false); setDevSearch(''); }}
                                  className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${formData.assigned_developer_id === dev.id ? 'bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                >
                                  {dev.full_name}
                                </button>
                              ))}
                              {developers.length > 0 && developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-4 text-center text-sm font-medium italic text-slate-400">No developers found.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {developers.length === 0 && (
                        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">No developers are assigned to this project yet.</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-module-document" className={labelClass}>Module Document Link <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                      <input
                        id="edit-module-document"
                        type="url"
                        placeholder="https://..."
                        className={inputClass}
                        value={formData.module_document_url}
                        onChange={(e) => setFormData({ ...formData, module_document_url: e.target.value })}
                      />
                      <p className="mt-2 text-xs font-medium text-slate-400">Google Drive, SharePoint, or another shared document.</p>
                    </div>

                    <div className="lg:col-span-2">
                      <label htmlFor="edit-module-website" className={labelClass}>Website Link <span className="font-medium normal-case tracking-normal text-slate-400">(testing)</span></label>
                      <input
                        id="edit-module-website"
                        type="url"
                        placeholder="https://..."
                        className={inputClass}
                        value={formData.website_link}
                        onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
                      />
                      <p className="mt-2 text-xs font-medium text-slate-400">Staging or local URL used to test the module.</p>
                    </div>

                    {(canManagePrototype || module.prototype) && (
                      <div className="lg:col-span-2">
                        <PrototypeSection
                          key={`${module.id}:${module.prototype ?? ''}`}
                          projectId={module.project_id}
                          moduleId={module.id}
                          prototypePath={module.prototype ?? null}
                          canManage={!!canManagePrototype}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-4 border-t border-gray-100 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-center text-xs font-medium text-slate-400 sm:text-left">Fields marked with <span className="font-bold text-red-500">*</span> are required.</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-xl bg-gray-100 px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  form="edit-module-form"
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--sys-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--sys-primary)]/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body)}
    </>
  )
}
