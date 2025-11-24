"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // ---------------------------------------------------------------------------
  // 🔹 Helper: sikker tal-parsing (JS, ikke TS)
  // ---------------------------------------------------------------------------
  const parseNumber = (v) => {
    const n = parseFloat(String(v ?? "").replace(/,/g, ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
    setShowConfetti(true);

    // Get redirect destination from query params
    const redirectTo = searchParams.get("redirect") || null;
    const redirectPath = redirectTo ? `/${redirectTo}` : null;

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect after 5 seconds
    const redirectTimeout = setTimeout(() => {
      if (redirectPath) {
        router.push(redirectPath);
      }
    }, 5000);

    // Hide confetti after animation
    const confettiTimeout = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimeout);
      clearTimeout(confettiTimeout);
    };
  }, [router, searchParams]);

  // ---------------------------------------------------------------------------
  // 🔹 Tracking: Meta Pixel Purchase + Clicky Goal 757 (fyres kun én gang pr. ordre)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      const orderId =
        params.get("order_id") ||
        params.get("oid") ||
        params.get("tx") ||
        params.get("transaction_id") ||
        null;

      const currency = (params.get("currency") || params.get("cur") || "COP").toUpperCase();
      const amountRaw = params.get("amount") || params.get("value") || params.get("price");
      const amount = parseNumber(amountRaw) ?? 0;

      // Dedupe: affyr kun én gang pr. orderId (eller pr. side hvis intet ID)
      const storageKey = orderId ? `es_purchase_fired_${orderId}` : `es_purchase_fired_page`;
      if (sessionStorage.getItem(storageKey)) return;

      // ---- Meta Pixel: Purchase ----
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "Purchase", {
          value: amount, // 0 hvis ukendt
          currency,      // fx "COP"
        });
      }

      // ---- Clicky Goal 757 ----
      if (typeof window !== "undefined" && window.clicky) {
        if (typeof window.clicky.goal === "function") {
          window.clicky.goal(757, amount || 0);
        } else if (typeof window.clicky.log === "function") {
          window.clicky.log("/goal/757", "Purchase", "goal");
        }
      }

      sessionStorage.setItem(storageKey, "1");
    } catch (_) {
      // no-op
    }
  }, []);

  const handleRedirectNow = () => {
    const redirectTo = searchParams.get("redirect") || null;
    const redirectPath = redirectTo ? `/${redirectTo}` : "/";
    router.push(redirectPath);
  };

  const progressPercentage = ((5 - countdown) / 5) * 100;

  return (
    <div className="flex items-center justify-center p-4 py-20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10px",
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    "#5E3FA5",
                    "#B276CA",
                    "#F59E0B",
                    "#10B981",
                    "#3B82F6",
                    "#EC4899",
                  ][Math.floor(Math.random() * 6)],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div
        className={`container max-w-screen-sm mx-auto relative z-10 transition-all duration-700 transform ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="bg-white rounded-3xl border border-[#C7BCE0] shadow-2xl p-4 backdrop-blur-sm">
          {/* Success Message */}
          <h2 className="text-3xl font-black text-center mb-3 bg-gradient-to-r from-[#5E3FA5] via-[#8B5CF6] to-[#B276CA] bg-clip-text text-transparent animate-fade-in-up">
            ¡Pago Exitoso!
          </h2>

          <p className="text-lg md:text-xl text-center text-gray-600 mb-8 animate-fade-in-up animation-delay-200">
            Tu pago ha sido procesado correctamente
          </p>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-[#F7F1FA] via-purple-50 to-white border-2 border-[#C7BCE0] rounded-2xl p-6 mb-6 animate-fade-in-up animation-delay-400 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-bounce-subtle">
                <span className="text-2xl">✅</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#261942] mb-2 text-lg">
                  Transacción Completada
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  {searchParams.get("redirect")
                    ? "Recibirás un correo de confirmación con los detalles de tu compra. Los créditos ya están disponibles en tu cuenta."
                    : "¡Éxito! Estamos creando tu cuenta. Recibirás tu contraseña directamente en tu correo electrónico en unos segundos. Inicia sesión y revisa tus solicitudes."}
                </p>
              </div>
            </div>
          </div>

          {/* Countdown & Redirect Info */}
          {searchParams.get("redirect") && (
            <div className="space-y-4 animate-fade-in-up animation-delay-600">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#E9D5FF" strokeWidth="8" fill="none" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressPercentage / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#5E3FA5" />
                        <stop offset="100%" stopColor="#B276CA" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm text-purple-600 font-semibold mb-1">Redirigiendo</span>
                    <span className="text-4xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
                      {countdown}
                    </span>
                    <span className="text-xs text-purple-500 mt-1">
                      {countdown === 1 ? "segundo" : "segundos"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleRedirectNow}
                  className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] text-white px-8 py-3 rounded-xl font-bold text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300"
                  aria-label="Ir ahora"
                >
                  <span>Ir Ahora</span>
                  <svg
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* No redirect case - action button */}
          {!searchParams.get("redirect") && (
            <div className="flex justify-center mt-6 animate-fade-in-up animation-delay-600">
              <button
                onClick={() => router.push("/")}
                className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] text-white px-8 py-3 rounded-xl font-bold text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300"
                aria-label="Volver al inicio"
              >
                <span>Volver al Inicio</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes check-draw {
          0% {
            stroke-dasharray: 0, 100;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dasharray: 100, 100;
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes ping-slower {
          0% {
            transform: scale(1);
            opacity: 0.1;
          }
          50% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }

        .animate-check-draw {
          animation: check-draw 0.8s ease-out 0.3s forwards;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
        }

        /* FIX: fjern punktum efter 'infinite' */
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-ping-slower {
          animation: ping-slower 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Cargando...
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
