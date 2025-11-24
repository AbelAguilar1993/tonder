import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "Encuentra contactos clave en empresas | EmpleoSafari",
  description:
    "Accede a contactos profesionales verificados para impulsar tu carrera. Conecta directamente con reclutadores y responsables de selección.",
  keywords:
    "contactos profesionales, reclutadores, networking, contactos verificados, headhunters",
});

export default function ContactosLayout({ children }) {
  return children;
}
