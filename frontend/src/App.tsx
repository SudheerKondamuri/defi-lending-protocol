import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { config } from './config/wagmi';
import AppShell from './components/layout/AppShell';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard'; // Markets
import Portfolio from './pages/Portfolio';
import Liquidations from './pages/Liquidations';
import Governance from './pages/Governance';
import Analytics from './pages/Analytics';

const queryClient = new QueryClient();

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing onEnterApp={() => setCurrentPage('markets')} />;
      case 'markets':
        return <Dashboard />;
      case 'portfolio':
        return <Portfolio />;
      case 'liquidations':
        return <Liquidations />;
      case 'governance':
        return <Governance />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Landing onEnterApp={() => setCurrentPage('markets')} />;
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </AppShell>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
