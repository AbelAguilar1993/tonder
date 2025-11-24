import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "Explora oportunidades de empleo | EmpleoSafari",
  description:
    "Explora miles de oportunidades de empleo en empresas verificadas. Encuentra el puesto ideal con descripciones detalladas e información confiable sobre cada empresa.",
  keywords:
    "empleos disponibles, ofertas de trabajo, vacantes, búsqueda de empleo, oportunidades laborales",
});

export default function EmpleosLayout({ children }) {
  return children;
}
