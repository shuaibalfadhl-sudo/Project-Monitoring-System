'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function CreateModulePage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 1,
    status: 'pending'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase
      .from('project_modules')
      .insert({
        ...formData,
        project_id: resolvedParams.projectId
      })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
    } else {
      toast.success('Module added successfully!')
      router.push(`/projects/${resolvedParams.projectId}`)
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h1 className="text-3xl font-extrabold text-[#2d3748] mb-8">Add Module</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Module Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <input
              type="number"
              min="1"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="pending">Pending</option>
              <option value="development">Development</option>
              <option value="pm_review">PM Review</option>
              <option value="for_qa">For QA</option>
              <option value="auditing">Auditing</option>
              <option value="rework">Rework</option>
              <option value="qa_approved">QA Approved</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3.5 px-4 text-white bg-[#263148] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Module'}
          </button>
        </div>
      </form>
    </div>
  )
}
