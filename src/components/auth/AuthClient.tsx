'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'

interface AuthClientProps {
  defaultMode: 'login' | 'register'
  systemName: string
  logoUrl: string | null
  description: string
}

export function AuthClient({ defaultMode, systemName, logoUrl, description }: AuthClientProps) {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login')

  const toggleMode = () => {
    const newIsLogin = !isLogin
    setIsLogin(newIsLogin)
    // Update the URL to match the view without a full page reload
    window.history.pushState(null, '', newIsLogin ? '/login' : '/register')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 p-4 sm:p-8 overflow-hidden">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl min-h-[650px] border border-gray-200 dark:border-slate-800 flex overflow-hidden">
        
        {/* ==================== REGISTER FORM (Left Side) ==================== */}
        <div 
          className={`absolute top-0 left-0 w-full lg:w-1/2 h-full p-8 sm:p-12 transition-all duration-700 ease-in-out flex flex-col justify-center overflow-y-auto ${
            isLogin ? 'opacity-0 z-0 pointer-events-none translate-x-12' : 'opacity-100 z-10 translate-x-0'
          }`}
        >
          <div className="w-full max-w-md mx-auto">
            <div className="text-left mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                Create Account
              </h2>
              <p className="text-base text-gray-500 dark:text-slate-400">
                Get started by creating your new account
              </p>
            </div>
            
            <RegisterForm />
            
            <div className="mt-8 text-center text-sm font-medium">
              <span className="text-gray-500 dark:text-slate-400">Already have an account? </span>
              <button 
                onClick={toggleMode}
                className="text-[var(--sys-primary)] hover:opacity-80 transition-colors font-bold"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* ==================== LOGIN FORM (Right Side) ==================== */}
        <div 
          className={`absolute top-0 right-0 w-full lg:w-1/2 h-full p-8 sm:p-12 transition-all duration-700 ease-in-out flex flex-col justify-center overflow-y-auto ${
            isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 pointer-events-none -translate-x-12'
          }`}
        >
          <div className="w-full max-w-md mx-auto">
            <div className="text-left mb-10">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                Sign In
              </h2>
              <p className="text-base text-gray-600 dark:text-slate-400">
                Enter your details to access your dashboard.
              </p>
            </div>
            
            <LoginForm />
            
            <div className="mt-8 text-center text-sm font-medium">
              <span className="text-gray-500 dark:text-slate-400">Don't have an account? </span>
              <button 
                onClick={toggleMode}
                className="text-[var(--sys-primary)] hover:opacity-80 transition-colors font-bold"
              >
                Register
              </button>
            </div>
          </div>
        </div>

        {/* ==================== SLIDING OVERLAY (Branding) ==================== */}
        {/* Note: hidden on small screens so the active form takes full width */}
        <div 
          className={`hidden lg:flex absolute top-0 left-0 w-1/2 h-full bg-[var(--sys-primary)] bg-gradient-to-br from-[#0B1120] via-[var(--sys-primary)] to-[#250d4f] z-20 text-center flex-col items-center justify-center transition-transform duration-700 ease-in-out ${
            isLogin ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Dynamic background waves/particles */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/30 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--sys-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
          
          <div className="relative z-10 flex flex-col items-center px-12">
            {logoUrl ? (
              <div className="w-32 h-32 relative mb-6">
                <Image 
                  src={logoUrl} 
                  alt={systemName} 
                  fill 
                  className="object-contain drop-shadow-2xl" 
                  unoptimized
                />
              </div>
            ) : (
              <div className="text-7xl mb-6">🚀</div>
            )}
            
            <h1 className="text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
              {systemName.split(' ').map((word: string, i: number) => i === 0 ? <span key={i}>{word} </span> : <span key={i} className="opacity-90">{word} </span>)}
            </h1>
            <h2 className="text-xl font-bold text-gray-200 mb-6 drop-shadow">
              Project Monitoring System
            </h2>
            <p className="text-base text-gray-300 max-w-sm mx-auto leading-relaxed">
              {description}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
