import { http, createConfig } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Local Anvil chain (fork or standalone)
const anvilChain = {
  ...localhost,
  id: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
  name: 'Anvil Local',
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
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
              url: 'http://localhost:5173',
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [anvilChain.id]: http('http://127.0.0.1:8545'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
