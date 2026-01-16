"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"

const IS_DEMO = process.env.NEXT_PUBLIC_IS_DEMO === "true"

export default function Pay() {
  const { code } = useParams()
  const opened = useRef(false)

  const [status, setStatus] = useState<
    null | "failed" | "cancelled" | "pending" | "success"
  >(null)
  const [demoReady, setDemoReady] = useState(false)

  async function completeDemoPayment() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/demo-settle/${code}`,
        { method: "POST" }
      )

      if (!res.ok) {
        throw new Error("Demo payment failed")
      }

      setStatus("success")
      setTimeout(() => {
        location.href = `/done/${code}`
      }, 1800)
    } catch (err) {
      alert("Demo payment failed. Please try again.")
    }
  }

  useEffect(() => {
    if (!code || opened.current) return
    opened.current = true

    setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${code}`, {
        method: "POST",
      })
        .then((r) => r.json())
        .then(({ token }) => {
          // @ts-ignore
          window.snap.pay(token, {
            onSuccess: () => {
              setStatus("success")
              setTimeout(() => {
                location.href = `/done/${code}`
              }, 1800)
            },
            onPending: () => {
              if (IS_DEMO) {
                // Let demo user continue playing
                setDemoReady(true)
              } else {
                setStatus("pending")
              }
            },

            onError: () => {
              setStatus("failed")
              if (!IS_DEMO) {
                setTimeout(() => location.href = "/", 2000)
              }
            },

            onClose: () => {
              if (IS_DEMO) {
                // Stay on page and allow demo completion
                setDemoReady(true)
              } else {
                setStatus("cancelled")
                setTimeout(() => location.href = "/", 2000)
              }
            },
          })
        })
    }, 900)
  }, [code])

  return (
    <div className="min-h-screen bg-[#050b1f] flex items-center justify-center p-4 text-white relative">

      {/* Main Card */}
      <div className="bg-[#0b1b3a] px-8 pt-6 pb-8 rounded-2xl shadow-2xl w-full max-w-md space-y-5 text-center">

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

        <div className="text-lg font-semibold text-blue-200">
          Preparing Payment
        </div>

        <div className="text-sm text-blue-300">
          Initializing secure payment terminal…
        </div>

        {!demoReady && (
          <div className="flex justify-center">
            <div className="flex gap-2 text-blue-400 text-2xl animate-pulse">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        )}

        <div className="bg-[#08132d] border border-blue-400/30 rounded-xl p-4 text-xs text-blue-300">
          Print Code: <span className="font-mono text-blue-200">{code}</span>
        </div>

        {/* Demo Button */}
        {IS_DEMO && demoReady && (
          <div className="pt-3 space-y-2">
            <div className="text-xs text-blue-300">
              Demo mode active. You may now simulate a successful payment.
            </div>

            <button
              onClick={completeDemoPayment}
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition py-3 rounded-xl font-semibold"
            >
              Complete Demo Payment
            </button>

            <div className="text-[11px] text-blue-400">
              (Demo only — no real money charged)
            </div>
          </div>
        )}
      </div>

      {/* Production error modal */}
      {status && (!IS_DEMO || status === "success") && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#0b1b3a] rounded-2xl p-8 shadow-2xl text-center max-w-sm w-full border border-blue-400/20 space-y-3">

            {status === "failed" && (
              <>
                <div className="text-3xl">❌</div>
                <div className="text-lg font-semibold text-red-400">
                  Payment Failed
                </div>
                <div className="text-sm text-blue-300">
                  Something went wrong. Redirecting you back…
                </div>
              </>
            )}

            {status === "cancelled" && (
              <>
                <div className="text-3xl">⚠️</div>
                <div className="text-lg font-semibold text-yellow-400">
                  Payment Cancelled
                </div>
                <div className="text-sm text-blue-300">
                  You cancelled the payment. Redirecting you back…
                </div>
              </>
            )}

            {status === "pending" && (
              <>
                <div className="text-3xl">⏳</div>
                <div className="text-lg font-semibold text-yellow-400">
                  Payment Pending
                </div>
                <div className="text-sm text-blue-300">
                  Please complete your payment. You may close this page and return later.
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="text-4xl">✅</div>
                <div className="text-lg font-semibold text-emerald-400">
                  Payment Successful
                </div>
                <div className="text-sm text-blue-300">
                  Redirecting you to your print code…
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Demo badge */}
      {IS_DEMO && (
        <div className="absolute top-4 right-4 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs px-3 py-1 rounded-full">
          DEMO MODE
        </div>
      )}
    </div>
  )
}
