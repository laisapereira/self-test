import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-center text-sm text-gray-600 py-4 w-full flex flex-wrap items-center justify-center gap-4 border-t border-gray-200">
      <p className="font-semibold text-sm">
        © 2025 SelfTest. Todos os direitos reservados.
      </p>
      <Image
        src="/ic_ufba_rodape.png"
        alt="SelfTest Logo"
        width={172}
        height={115}
      />
    </footer>
  );
}
