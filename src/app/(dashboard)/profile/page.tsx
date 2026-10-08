"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      
      setUser(user)
      setEmail(user.email || '')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setFullName(data.full_name || '')
        setRole(data.role || '')
        setGender(data.gender || '')
        setBirthday(data.birthday || '')
        setAge(data.age || '')
        setAvatarUrl(data.avatar_path || null)
      }
    } catch (error: any) {
      toast.error('Error loading profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)
      
      const { error } = await supabase.rpc('update_user_profile', {
        p_full_name: fullName,
        p_gender: gender || null,
        p_birthday: birthday || null,
        p_age: age === '' ? null : Number(age),
        p_avatar_path: avatarUrl
      })

      if (error) throw error
      
      toast.success('Profile updated successfully!')
      router.refresh()
    } catch (error: any) {
      toast.error('Error updating profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload the image to the 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded successfully! Make sure to save your profile.')
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 font-medium text-slate-500">Loading profile...</div>
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your personal information and account settings</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-8 items-center md:items-start bg-slate-50/50 dark:bg-slate-800/30">
          
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-black text-slate-400 dark:text-slate-500">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (fullName || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-10 h-10 bg-[var(--sys-primary)] rounded-full text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-50"
              >
                {uploading ? (
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload}
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{fullName || 'Unknown User'}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
              />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white appearance-none"
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Age
              </label>
              <input
                type="number"
                min="0"
                max="150"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 25"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-slate-900 dark:text-white"
              />
            </div>
            
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-[var(--sys-primary)] hover:opacity-90 text-white font-bold rounded-xl transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving && (
                <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
