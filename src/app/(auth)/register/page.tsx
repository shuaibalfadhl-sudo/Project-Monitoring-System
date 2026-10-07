import { RegisterForm } from '@/components/auth/register-form'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Register - Project Monitoring System',
  description: 'Create a new account',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] p-4 sm:p-8">
      <div className="w-full max-w-[1000px] flex flex-col md:flex-row items-stretch gap-8 lg:gap-16">
        
        {/* Left Side - White Card */}
        <div className="w-full md:w-[45%] bg-white p-10 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl">
          <div className="mb-10 w-full max-w-[220px] aspect-[4/5] bg-slate-50 rounded-xl flex items-center justify-center relative overflow-hidden">
            {/* Simple abstract illustration placeholder matching the vibe */}
            <div className="absolute w-32 h-48 bg-white border-4 border-slate-700 rounded-3xl shadow-sm z-10 flex flex-col items-center pt-4">
               <div className="w-12 h-1 bg-slate-300 rounded-full mb-6"></div>
               <div className="w-16 h-12 bg-slate-100 rounded mb-4 flex items-center justify-center">
                 <div className="w-8 h-8 rounded-full bg-blue-900 opacity-80"></div>
               </div>
               <div className="w-20 h-1 bg-slate-200 rounded-full mb-2"></div>
               <div className="w-16 h-1 bg-slate-200 rounded-full mb-8"></div>
               <div className="w-10 h-3 bg-slate-700 rounded ml-auto mr-4"></div>
            </div>
            <div className="absolute right-4 bottom-10 w-8 h-24 bg-slate-700 rounded-full transform rotate-12 z-0 opacity-10"></div>
            <div className="absolute left-4 bottom-8 w-12 h-12 bg-blue-900 rounded-full z-0 opacity-10"></div>
          </div>
          
          <h2 className="text-xl font-bold text-[var(--sys-primary)] mb-3">Already Having An Account?</h2>
          <p className="text-sm text-gray-400 mb-8 font-medium">We Are Happy To Have You Back</p>
          
          <Link 
            href="/login" 
            className="w-full max-w-[200px] py-3 px-4 border-2 border-[var(--sys-primary)] text-[var(--sys-primary)] rounded-xl font-bold hover:bg-slate-50 transition-colors inline-block"
          >
            Login
          </Link>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-[55%] py-8 md:py-12 flex flex-col justify-center">
          <div className="max-w-[420px] mx-auto md:mx-0 w-full">
            <h1 className="text-[28px] font-extrabold text-[var(--sys-primary)] mb-2">Create Account</h1>
            <p className="text-sm text-gray-500 mb-8 font-medium">Get started by creating your new account</p>
            
            <RegisterForm />

          </div>
        </div>
      </div>
    </div>
  )
}
