"use client";

import { createThirdwebClient } from "thirdweb";
import { createWallet, injectedProvider } from "thirdweb/wallets";

export const client = createThirdwebClient({
  clientId:
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
    "7bdbc0d84b2e56262e8e603b301e0762",
});

export async function connectInjectedMetamask(): Promise<{
  address: string | null;
}> {
  // If no injected provider, fallback will open WC modal
  const wallet = createWallet("io.metamask");
  await wallet.connect({ client });
  const account = await wallet.getAccount();
  return { address: account?.address ?? null };
}

export function hasInjectedProvider(): boolean {
  try {
    return Boolean(injectedProvider("io.metamask"));
  } catch {
    return false;
  }
}
