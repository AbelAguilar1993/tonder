"use client";

import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { SiVisa, SiMastercard, SiAmericanexpress } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="bg-[#5E3FA6] text-white/90 text-sm">
      <div className="container max-w-screen-md mx-auto py-6 flex flex-col items-center space-y-4">
        {/* Primary navigation */}
        <nav className="flex gap-2 font-semibold">
          <Link href="/soporte/">
            <span>Soporte</span>
          </Link>
          <span>·</span>
          <Link href="/nosotros/">
            <span>Nosotros</span>
          </Link>
          <span>·</span>
          <Link href="/contacto/">
            <span>Contacto</span>
          </Link>
        </nav>

        {/* Legal links */}
        <nav className="flex flex-wrap justify-center gap-2 text-xs opacity-80 text-center">
          <Link href="/terminos/">
            <span>Términos y Condiciones</span>
          </Link>
          <span>·</span>
          <Link href="/privacidad/">
            <span>Política de Privacidad</span>
          </Link>
          <span>·</span>
          <Link href="/pagos/">
            <span>Política de Pagos</span>
          </Link>
        </nav>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-wide font-semibold opacity-80">
          <span className="flex items-center gap-1">
            🔒 Pago 100% seguro con dLocalGo
          </span>
          <span className="flex items-center gap-1">⚡ Entrega inmediata</span>
          <span className="flex items-center gap-1">
            ✅ Protección de datos
          </span>
        </div>

        {/* Social links */}
        <div className="flex items-center gap-4 text-lg opacity-80">
          <a
            href="https://facebook.com/empleosafari"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaFacebook />
          </a>
          <a
            href="https://instagram.com/empleosafari"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaInstagram />
          </a>
          <a
            href="https://linkedin.com/company/empleosafari"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>
        </div>

        {/* Company info & support */}
        <div className="text-center text-xs opacity-70 space-y-1">
          <p>
            © {new Date().getFullYear()} EmpleoSafari, Inc. — Registro No.
            10350440, Delaware, USA.
          </p>
          <p className="mt-3">
            Horario de atención: Lunes a Viernes, 9:00 – 17:00 (hora local)
          </p>
        </div>
      </div>
    </footer>
  );
}
