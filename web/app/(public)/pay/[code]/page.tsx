"use client"

import { useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"

const IS_DEMO = process.env.NEXT_PUBLIC_IS_DEMO === "true"

export default function Pay() {
  const { code } = useParams()
  const router = useRouter()
  const opened = useRef(false)

  async function loadJokulScript() {
    if ((window as any).loadJokulCheckout) return

    const script = document.createElement("script")
    script.src =
      process.env.NEXT_PUBLIC_DOKU_ENV === "production"
        ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
        : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"

    document.body.appendChild(script)

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve()
      script.onerror = () => reject()
    })
  }

  useEffect(() => {
    if (!code || opened.current) return
    opened.current = true

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${code}`, {
      method: "POST",
    })
      .then(res => res.json())
      .then(async data => {
        if (data.provider !== "DOKU") {
          alert("Unsupported payment provider")
          router.push("/")
          return
        }

        await loadJokulScript()

        // @ts-ignore
        window.loadJokulCheckout(data.payment_url)
      })
      .catch(() => {
        alert("Failed to initiate payment")
        router.push("/")
      })
  }, [code, router])

  return (
    <div className="min-h-screen bg-[#050b1f] flex items-center justify-center p-4 text-white">
      <div className="bg-[#0b1b3a] px-8 pt-6 pb-8 rounded-2xl shadow-2xl w-full max-w-md space-y-5 text-center">

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

        <div className="text-lg font-semibold text-blue-200">
          Opening Secure Payment
        </div>

        <div className="text-sm text-blue-300">
          Please complete your QRIS payment
        </div>

        <div className="bg-[#08132d] border border-blue-400/30 rounded-xl p-4 text-xs text-blue-300">
          Print Code: <span className="font-mono text-blue-200">{code}</span>
        </div>

        {IS_DEMO && (
          <div className="text-xs text-yellow-300">
            Demo mode enabled
          </div>
        )}
      </div>
    </div>
  )
}
