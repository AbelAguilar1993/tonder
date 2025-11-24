import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-2">
      <div className="container max-w-screen-md mx-auto py-2">
        <div className="bg-white shadow-lg p-8 rounded-lg text-center">
          <div className="mb-6">
            <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Página no encontrada
            </h2>
            <p className="text-gray-600 mb-6">
              La página que estás buscando no existe o ha sido movida.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#5E3FA6] text-white rounded-lg hover:bg-[#4A2F85] transition-colors font-medium"
            >
              ← Volver al inicio
            </Link>

            <div className="flex justify-center gap-4 text-sm">
              <Link href="/empleos/" className="text-[#5E3FA6] hover:underline">
                Oportunidades
              </Link>
              <Link
                href="/empresas/"
                className="text-[#5E3FA6] hover:underline"
              >
                Empresas
              </Link>
              <Link
                href="/contactos/"
                className="text-[#5E3FA6] hover:underline"
              >
                Contactos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
