import { type FC } from "hono/jsx";
import { type Language } from "../utils/i18n.js";
import { LanguageSelector } from "../components/LanguageSelector.js";

type MainLayoutProps = {
  children: any;
  title?: string;
  language: Language;
};

export const MainLayout: FC<MainLayoutProps> = ({ children, title = "Local File Storage", language }) => {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      </head>
      <body class="bg-gray-50 text-gray-900">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
          <div class="flex justify-end mb-4">
            <LanguageSelector currentLanguage={language} />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
};