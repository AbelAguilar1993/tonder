import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "Créditos - Sistema de Pagos",
  description:
    "Gestiona tus créditos de EmpleoSafari. Compra créditos para desbloquear contactos verificados, consulta tus facturas y revisa el historial de transacciones.",
  keywords:
    "créditos, sistema de pagos, comprar créditos, facturas, transacciones, desbloquear contactos",
});

export default function CreditosLayout({ children }) {
  return children;
}
