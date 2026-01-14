"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"

export default function Pay() {
  const { code } = useParams()
  const opened = useRef(false)

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
            onSuccess: () => (location.href = `/done/${code}`),
            onPending: () => (location.href = `/done/${code}`),
            onError: () => alert("Payment failed"),
            onClose: () => alert("Payment cancelled"),
          })
        })
    }, 900) 
  }, [code])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="bg-zinc-900 p-10 rounded-2xl shadow-xl text-center space-y-3">
        <div className="text-xl font-semibold">Preparing Payment</div>
        <div className="text-sm text-zinc-400">
          Initializing secure payment terminal…
        </div>
        <div className="animate-pulse text-indigo-400 text-2xl">● ● ●</div>
      </div>
    </div>
  )
}
