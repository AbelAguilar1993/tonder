import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "Panel de Control - EmpleoSafari",
  description:
    "Gestiona tus conversaciones con empresas y contactos verificados. Desbloquea contactos, envía mensajes y sigue el progreso de tus aplicaciones.",
  keywords:
    "panel de control, conversaciones, contactos verificados, desbloquear contactos, enviar mensajes, progreso de aplicaciones",
});

export default function PanelLayout({ children }) {
  return children;
}
