import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import PipelinePage from './pages/PipelinePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
