export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-[#2d3748] border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-500 font-bold animate-pulse text-sm uppercase tracking-widest">Loading...</p>
    </div>
  )
}
