"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        activeChain={baseSepolia}
        clientId="7bdbc0d84b2e56262e8e603b301e0762"
      >
        {children}
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
