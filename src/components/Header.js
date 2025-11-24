// no "use client"
import Link from "next/link";
import Image from "next/image";
import HeaderAuthArea from "./HeaderAuthArea.client";

export default function Header() {
  return (
    <div className="bg-[#5E3FA6] px-2 md:px-4 py-2">
      <div className="container max-w-screen-md mx-auto py-2 flex justify-between items-center">
        {/* Logo — next/image for better LCP */}
        <Link href="/" aria-label="EmpleoSafari — Ir al inicio">
          <Image
            src="/empleosafari-v2.svg"
            alt="EmpleoSafari"
            width={160}
            height={32}
            priority
            fetchPriority="high"
            className="h-8 w-auto"
          />
        </Link>

        {/* Tiny client island for auth/menu only */}
        <HeaderAuthArea />
      </div>
    </div>
  );
}
