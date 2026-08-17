import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/markets" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/liquidations" element={<Liquidations />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell>
            <AnimatedRoutes />
          </AppShell>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
