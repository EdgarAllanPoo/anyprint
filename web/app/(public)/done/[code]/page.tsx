"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"

type Status = "LOADING" | "PAID" | "UNPAID" | "FAILED"

export default function Done() {
  const { code } = useParams()
  const [status, setStatus] = useState<Status>("LOADING")

  useEffect(() => {
    if (!code) return

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${code}/status`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "PAID") {
          setStatus("PAID")
        } else {
          setStatus("UNPAID")
        }
      })
      .catch(() => {
        setStatus("FAILED")
      })
  }, [code])

  function renderContent() {
    if (status === "LOADING") {
      return (
        <>
          <h1 className="text-xl text-blue-200">Checking payment...</h1>
        </>
      )
    }

    if (status === "PAID") {
      return (
        <>
          <h1 className="text-2xl font-bold text-blue-200">
            Payment Successful
          </h1>
          <p className="text-sm text-blue-300">
            Your document is ready to be printed.
          </p>
        </>
      )
    }

    if (status === "UNPAID") {
      return (
        <>
          <h1 className="text-2xl font-bold text-yellow-300">
            Payment Pending
          </h1>
          <p className="text-sm text-blue-300">
            Please complete your payment to continue.
          </p>
        </>
      )
    }

    return (
      <>
        <h1 className="text-2xl font-bold text-red-400">
          Payment Failed
        </h1>
        <p className="text-sm text-blue-300">
          Something went wrong. Please try again.
        </p>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b1f] flex items-center justify-center p-4 text-white">
      <div className="bg-[#0b1b3a] p-10 rounded-2xl shadow-2xl w-full max-w-md text-center space-y-6">

        <div className="flex justify-center mb-6">
          <div className="relative w-[160px] h-[48px]">
            <Image
              src="/logo.png"
              alt="Anyprint Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {renderContent()}

        {status === "PAID" && (
          <div className="bg-[#08132d] border border-blue-400/30 rounded-xl p-6 space-y-2">
            <div className="text-sm text-blue-300">Your Print Code</div>
            <div className="text-4xl font-mono tracking-widest text-emerald-400">
              {code}
            </div>
          </div>
        )}

        <a
          href="/"
          className="block mt-4 bg-blue-600 hover:bg-blue-500 transition py-3 rounded-xl font-semibold"
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
