import { generateMetadata } from "../../utils/seo";

export const metadata = generateMetadata({
  title: "How It Works - Career Guide",
  description:
    "Learn how to effectively use EmpleoSafari to find job opportunities and connect with the right contacts for your career growth.",
  keywords:
    "guía de empleo, cómo buscar trabajo, consejos de carrera, tutorial de empleo",
});

export default function GuiaLayout({ children }) {
  return children;
}
