import { http, createConfig } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Determine RPC URL dynamically so EC2 public IP or localhost works automatically
const getRpcUrl = () => {
  if (import.meta.env.VITE_RPC_URL) return import.meta.env.VITE_RPC_URL;
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8545`;
  }
  return 'http://127.0.0.1:8545';
};

const rpcUrl = getRpcUrl();

// Local Anvil chain (fork or standalone)
const anvilChain = {
  ...localhost,
  id: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
  name: 'Anvil Local',
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
} as const;

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '';

export const config = createConfig({
  chains: [anvilChain],
  connectors: [
    injected(),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            metadata: {
              name: 'DeFi Lending Protocol',
              description: 'Decentralized lending and borrowing protocol',
              url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [anvilChain.id]: http(rpcUrl),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
