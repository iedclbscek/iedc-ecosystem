import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, Construction } from 'lucide-react';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Loader from './components/ui/Loader';
import ScrollToTop from './components/ui/ScrollToTop';

// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import EventsPage from './pages/EventsPage';
import EventPage from './pages/EventPage';
import TeamPage from './pages/TeamPage';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityPage from './pages/CommunityPage';
import RegistrationPage from './pages/RegistrationPage';

// --- UPDATED PLACEHOLDER COMPONENT ---
const PlaceholderPage = ({ title, type = "404" }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 bg-bg-main relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
      
      <div className="max-w-md w-full text-center p-10 border-2 border-dashed border-gray-300 bg-white/50 backdrop-blur-sm">
        
        <div className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-6">
          {type === "404" ? (
            <AlertTriangle className="w-8 h-8 text-red-500" />
          ) : (
            <Construction className="w-8 h-8 text-yellow-500" />
          )}
        </div>

        <span className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
          ERROR_CODE: {type === "404" ? "404_NOT_FOUND" : "503_UNDER_CONSTRUCTION"}
        </span>

        <h1 className="text-4xl font-black text-text-dark mb-4 uppercase tracking-tighter leading-none">
          {title || "System Error"}
        </h1>
        
        <p className="text-text-light mb-8 font-medium leading-relaxed">
          The requested module has not been deployed yet or the signal path is broken. 
          Please re-route to the main dashboard.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return_Base
        </Link>
      </div>
    </div>
  );
};

// App router wrapper to access location
const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const handleLoadComplete = () => {
    setLoading(false);
  };

  useEffect(() => {
    // Reset loading state when navigating away from home
    if (location.pathname !== '/') {
      setLoading(false);
    }
  }, [location.pathname]);

  // Only show loader on home page
  if (loading && location.pathname === '/') {
    return <Loader onComplete={handleLoadComplete} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/nexus" element={<CommunitiesPage />} />
          <Route path="/nexus/:id" element={<CommunityPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          
          {/* Use the new placeholder style for 404 */}
          <Route path="*" element={<PlaceholderPage title="Signal Lost" type="404" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a', // Darker background for toasts
            color: '#fff',
            borderRadius: '0px', // Hard edges for venture theme
            border: '1px solid #333',
            fontFamily: 'monospace',
            fontSize: '12px'
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#10b981', // Emerald green
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            theme: {
              primary: '#ef4444',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;