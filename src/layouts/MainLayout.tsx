import { type FC } from "hono/jsx";

type MainLayoutProps = {
  children: any;
  title?: string;
};

export const MainLayout: FC<MainLayoutProps> = ({ children, title = "Local File Storage" }) => {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@2.0.4"></script>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <script>
          {`
            tailwind.config = {
              theme: {
                extend: {}
              }
            }
          `}
        </script>
      </head>
      <body class="bg-gray-50 text-gray-900">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </div>
      </body>
    </html>
  );
};