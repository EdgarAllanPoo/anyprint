"use client"

import { useState } from "react"
import Image from "next/image"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-offocument.presentationml.presentation"
]

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [copies, setCopies] = useState(1)
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!file) return
    setLoading(true)

    const form = new FormData()
    form.append("file", file)
    form.append("copies", String(copies))

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
      method: "POST",
      body: form
    })
    const data = await res.json()
    setJob(data)
    setLoading(false)
  }

  function onFileChange(f?: File) {
    if (!f) return

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Unsupported file type. Please upload PDF, DOCX, or PPTX.")
      setFile(null)
      return
    }

    setError(null)
    setFile(f)
    setJob(null)
  }

  return (
    <div className="min-h-screen bg-[#050b1f] flex items-center justify-center p-4 text-white">
      <div className="bg-[#0b1b3a] p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-5">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-[180px] h-[60px]">
            <Image
              src="/logo.png"
              alt="AnyPrint Logo"
              fill
              className="object-contain drop-shadow-[0_0_10px_rgba(96,165,250,0.25)]"
              priority
            />
          </div>
        </div>

        <p className="text-sm text-blue-200 text-center">
          Upload your document and pay securely
        </p>

        <p className="text-xs text-blue-300 text-center">
          Step 1: Select document → Step 2: Choose copies → Step 3: Pay
        </p>

        <div className="space-y-3">

          {/* Upload */}
          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.pptx"
              className="hidden"
              onChange={e => onFileChange(e.target.files?.[0])}
              disabled={loading}
            />

            <div className="border-2 border-dashed border-blue-400/40 hover:border-blue-400 transition rounded-xl p-6 text-center space-y-2 bg-[#08132d]">
              <div className="text-blue-400 text-2xl">📄</div>

              <div className="font-semibold">
                {file ? file.name : "Tap to select document"}
              </div>

              {file && (
                <div className="text-xs text-blue-300">
                  {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}

              <div className="text-sm text-blue-300">
                PDF, DOCX, PPTX supported
              </div>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Copies */}
          <div className="bg-[#08132d] border border-blue-400/30 rounded-xl p-4 flex items-center justify-between">
            <button
              onClick={() => setCopies(c => Math.max(1, c - 1))}
              className="w-12 h-12 rounded-lg bg-blue-600 hover:bg-blue-500 transition text-2xl font-bold"
            >
              –
            </button>

            <div className="text-center">
              <div className="text-sm text-blue-300">Copies</div>
              <div className="text-3xl font-bold text-blue-400">{copies}</div>
            </div>

            <button
              onClick={() => setCopies(c => c + 1)}
              className="w-12 h-12 rounded-lg bg-blue-600 hover:bg-blue-500 transition text-2xl font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading || !file}
          className="w-full bg-blue-600 hover:bg-blue-500 transition py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Uploading document…" : "Continue"}
        </button>

        {/* Receipt */}
        {job && (
          <div className="bg-[#08132d] rounded-xl p-4 space-y-3 text-sm">
            <div className="text-center text-blue-300">Payment Summary</div>

            <div className="flex justify-between">
              <span className="text-blue-200">Print Code</span>
              <span className="font-mono tracking-wider">{job.code}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-blue-200">Pages</span>
              <span>{job.pages}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-blue-200">Copies</span>
              <span>{job.copies}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-blue-200">Price / page</span>
              <span>Rp{job.pricePerPage}</span>
            </div>

            <div className="border-t border-blue-400/30 pt-2 flex justify-between font-bold text-emerald-400">
              <span>Total</span>
              <span>Rp{job.price}</span>
            </div>

            <a
              href={`/pay/${job.code}`}
              className="block mt-3 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold text-center"
            >
              Pay Now
            </a>

            <button
              onClick={() => { setFile(null); setJob(null); setCopies(1); setError(null) }}
              className="block w-full text-xs text-blue-300 hover:text-blue-200 mt-2"
            >
              Upload different document
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
