import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Login - Project Monitoring System',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Project Monitoring System
          </h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to continue</p>
        </div>
        <div className="mt-8">
          <LoginForm />
        </div>
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Don&apos;t have an account? </span>
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Register here
          </Link>
        </div>
      </div>
    </div>
  )
}
