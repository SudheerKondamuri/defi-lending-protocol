import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppShell>
          <Dashboard />
        </AppShell>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
