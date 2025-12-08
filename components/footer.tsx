import Image from 'next/image'
import React from 'react'

export default function Footer() {
  return (
    <div>
        <footer className="bg-gray-100 text-center text-sm text-gray-600 py-4 mt-8 w-full flex items-center justify-evenly gap-4">
          <p className='font-semibold text-[1ren]'>© 2025 SelfTest. Todos os direitos reservados.</p>
          <Image src="/ic_ufba_rodape.png" alt="SelfTest Logo" width={172} height={115} />

        </footer>
    </div>
  )
}
