"use client"

import { useParams } from "next/navigation"

export default function Done() {
  const { code } = useParams()

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-white">
      <div className="bg-zinc-900 p-10 rounded-2xl shadow-xl w-full max-w-md text-center space-y-6">

        {/* Success icon */}
        <div className="text-6xl">✅</div>

        <h1 className="text-3xl font-bold tracking-wide">
          Payment Successful
        </h1>

        <p className="text-zinc-400">
          Your document is ready to be printed.
        </p>

        {/* Code box */}
        <div className="bg-zinc-800 rounded-xl p-6 space-y-2">
          <div className="text-sm text-zinc-400">Your Print Code</div>
          <div className="text-5xl font-mono tracking-widest text-emerald-400">
            {code}
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Please enter this code at the print counter or machine.
        </p>

        <a
          href="/"
          className="block mt-4 bg-indigo-600 hover:bg-indigo-700 transition py-3 rounded-xl font-semibold"
        >
          Print Another Document
        </a>
      </div>
    </div>
  )
}
