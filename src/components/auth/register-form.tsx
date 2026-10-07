'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserRole } from '@/types/user'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [agreeTerms, setAgreeTerms] = useState(false)
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
    if (!agreeTerms) {
      setError('You must agree to the Terms and Conditions')
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
          phone_number: phone,
          referral_code: referralCode,
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

  const inputClasses = "w-full px-4 py-3.5 bg-white border-none rounded-xl text-sm shadow-[0_2px_10px_rgb(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] placeholder-gray-400 font-medium"

  return (
    <div className="w-full">
      <form className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label className="block text-[11px] font-semibold text-gray-500 ml-1 uppercase tracking-wider">Select your role <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'project_manager' ? 'border-[var(--sys-primary)] bg-[#f4f5f7] text-[var(--sys-primary)]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <input type="radio" name="role" value="project_manager" className="sr-only" onChange={(e) => setRole(e.target.value as UserRole)} />
              Project Manager
            </label>
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'system_auditor' ? 'border-[var(--sys-primary)] bg-[#f4f5f7] text-[var(--sys-primary)]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <input type="radio" name="role" value="system_auditor" className="sr-only" onChange={(e) => setRole(e.target.value as UserRole)} />
              System Auditor
            </label>
            <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-sm font-semibold transition-colors ${role === 'developer' ? 'border-[var(--sys-primary)] bg-[#f4f5f7] text-[var(--sys-primary)]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
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
        
        <div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
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
        
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">(Optional)</label>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Referral Code"
            className={inputClasses}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex items-start gap-3 py-2">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[var(--sys-primary)] focus:ring-[var(--sys-primary)]"
          />
          <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
            By clicking, you agree to the Findme&apos;s <span className="font-semibold text-gray-700">Terms and Conditions</span>
          </label>
        </div>
        
        <button
          type="button"
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full py-3.5 px-4 text-white bg-[var(--sys-primary)] hover:bg-[#1a2333] rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-lg shadow-[var(--sys-primary)]/20"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <div className="mt-8 flex items-center justify-center">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="px-4 text-xs font-semibold text-gray-400">Or</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-4">
        <button type="button" className="flex items-center justify-center py-3 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </button>
        <button type="button" className="flex items-center justify-center py-3 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.55.03 2.87.64 3.73 1.76-3.18 1.94-2.62 6.11.47 7.21-.76 1.77-1.63 3.37-2.87 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        </button>
        <button type="button" className="flex items-center justify-center py-3 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
