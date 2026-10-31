import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" closeButton />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
