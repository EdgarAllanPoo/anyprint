"use client"

import { useParams } from "next/navigation"
import Image from "next/image"

export default function Done() {
  const { code } = useParams()

  return (
    <div className="min-h-screen bg-[#050b1f] flex items-center justify-center p-4 text-white">
      <div className="bg-[#0b1b3a] p-10 rounded-2xl shadow-2xl w-full max-w-md text-center space-y-6">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-[160px] h-[48px]">
            <Image
              src="/logo.png"
              alt="AnyPrint Logo"
              fill
              className="object-contain drop-shadow-[0_0_10px_rgba(96,165,250,0.25)]"
              priority
            />
          </div>
        </div>

        {/* Success icon */}
        {/* <div className="text-6xl">✅</div> */}

        <h1 className="text-2xl font-bold tracking-wide text-blue-200">
          Payment Successful
        </h1>

        <p className="text-sm text-blue-300">
          Your document is ready to be printed.
        </p>

        {/* Code box */}
        <div className="bg-[#08132d] border border-blue-400/30 rounded-xl p-6 space-y-2">
          <div className="text-sm text-blue-300">Your Print Code</div>
          <div className="text-4xl font-mono tracking-widest text-emerald-400">
            {code}
          </div>
        </div>

        <p className="text-xs text-blue-300">
          Please enter this code at the print counter or machine.
        </p>

        <a
          href="/"
          className="block mt-4 bg-blue-600 hover:bg-blue-500 transition py-3 rounded-xl font-semibold"
        >
          Print Another Document
        </a>
      </div>
    </div>
  )
}
