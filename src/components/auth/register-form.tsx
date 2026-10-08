'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserRole } from '@/types/user'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) {
      setError('Please select a role')
      return
    }
    
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
      }
    })

    if (error) {
      toast.error(error.message)
      setError(error.message)
      setIsLoading(false)
    } else {
      toast.success('Registration successful! Welcome.')
      router.push('/dashboard')
      router.refresh()
    }
  }

  const inputClasses = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] placeholder-gray-400 dark:text-white font-medium disabled:opacity-50"

  return (
    <div className="w-full">
      <form className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Select your role <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'project_manager' ? 'border-[var(--sys-primary)] bg-[var(--sys-primary)]/10 text-[var(--sys-primary)]' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="role" value="project_manager" className="sr-only" onChange={(e) => setRole(e.target.value as UserRole)} />
              Project Manager
            </label>
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'system_auditor' ? 'border-[var(--sys-primary)] bg-[var(--sys-primary)]/10 text-[var(--sys-primary)]' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="role" value="system_auditor" className="sr-only" onChange={(e) => setRole(e.target.value as UserRole)} />
              System Auditor
            </label>
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'developer' ? 'border-[var(--sys-primary)] bg-[var(--sys-primary)]/10 text-[var(--sys-primary)]' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="role" value="developer" className="sr-only" onChange={(e) => setRole(e.target.value as UserRole)} />
              Developer
            </label>
          </div>
        </div>

        <div>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className={inputClasses}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className={inputClasses}
            disabled={isLoading}
          />
        </div>
        
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputClasses}
            disabled={isLoading}
          />
          <button 
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full py-3.5 px-4 text-white bg-[var(--sys-primary)] hover:opacity-90 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-[var(--sys-primary)]/20"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}
