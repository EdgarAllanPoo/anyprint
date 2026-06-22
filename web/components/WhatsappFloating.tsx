"use client"

export default function WhatsappFloating() {
  const phone = "6285121546801"
  const message = encodeURIComponent(
    "Hi Anyprint, I need help with my print order."
  )

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="
        fixed bottom-4 right-4
        w-14 h-14 md:w-16 md:h-16
        bg-[#25D366]
        rounded-full
        flex items-center justify-center
        shadow-lg
        hover:scale-110
        transition-transform
        z-50
      "
      aria-label="Chat with Customer Service on WhatsApp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-7 h-7 fill-white"
      >
        <path d="M16 .5C7.5.5.5 7.5.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2c2.2 1.2 4.7 1.8 7.5 1.8 8.5 0 15.5-7 15.5-15.5S24.5.5 16 .5zm0 28.2c-2.4 0-4.6-.6-6.6-1.8l-.5-.3-4.7 1.2 1.3-4.6-.3-.5c-1.2-2-1.9-4.3-1.9-6.8C3.3 8.6 9.6 2.3 16 2.3S28.7 8.6 28.7 16 22.4 28.7 16 28.7zm7.6-9.7c-.4-.2-2.3-1.1-2.6-1.2-.3-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-2-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.6.2-.2.3-.4.4-.6.1-.2 0-.5 0-.7 0-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1 .4-.3.3-1.3 1.2-1.3 3 0 1.8 1.3 3.6 1.5 3.8.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.2-.4-.3-.8-.5z"/>
      </svg>
    </a>
  )
}
