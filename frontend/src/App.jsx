import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BackgroundEffects from './components/BackgroundEffects';
import Navbar from './components/Navbar';
import IncomingTransferPrompt from './components/IncomingTransferPrompt';
import HomePage from './pages/HomePage';
import StatusPage from './pages/StatusPage';
import ReceivePage from './pages/ReceivePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HistoryPage from './pages/HistoryPage';
import AuthBootstrap from './components/AuthBootstrap';
import { connectPresence } from './webrtc/presenceClient';

function PresenceBootstrap() {
  useEffect(() => {
    connectPresence();
  }, []);
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthBootstrap />
      <PresenceBootstrap />
      <BackgroundEffects />
      <IncomingTransferPrompt />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/status/:sessionId" element={<StatusPage />} />
        <Route path="/receive/:sessionId" element={<ReceivePage />} />
      </Routes>
    </Router>
  );
}
