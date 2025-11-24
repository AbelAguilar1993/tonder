import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "Explora las mejores empresas para trabajar | EmpleoSafari",
  description:
    "Descubre empresas y sus vacantes disponibles. Conoce su cultura, valores y las oportunidades que ofrecen.",
  keywords:
    "empresas, compañías, empleadores, cultura empresarial, directorio de empresas",
});

export default function EmpresasLayout({ children }) {
  return children;
}
