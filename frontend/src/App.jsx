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
import TransferHistoryPage from './pages/TransferHistoryPage';
import SettingsPage from './pages/SettingsPage';
import AuthBootstrap from './components/AuthBootstrap';
import { connectPresence, disconnectPresence } from './webrtc/presenceClient';
import { getAccessToken } from './store/authStore';
import { waitForBackend } from './lib/waitForBackend';

/** React StrictMode mounts twice in dev — only disconnect when the last mount unmounts. */
let presenceMountCount = 0;

function PresenceBootstrap() {
  useEffect(() => {
    let cancelled = false;
    presenceMountCount += 1;

    (async () => {
      const ready = await waitForBackend();
      if (!cancelled) {
        if (!ready) {
          console.warn(
            '[DropBridge] Backend not reachable at localhost:8080 — presence will retry. Start: cd backend && mvn spring-boot:run'
          );
        }
        // Logged-in users connect via networkPresenceStore.init() (JWT-scoped sync).
        if (!getAccessToken()) {
          connectPresence();
        }
      }
    })();

    return () => {
      cancelled = true;
      presenceMountCount -= 1;
      if (presenceMountCount <= 0) {
        presenceMountCount = 0;
        // Signed-in presence is owned by networkPresenceStore (logout disconnects).
        if (!getAccessToken()) {
          disconnectPresence();
        }
      }
    };
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
        <Route path="/history/:variant" element={<TransferHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/status/:sessionId" element={<StatusPage />} />
        <Route path="/receive/:sessionId" element={<ReceivePage />} />
      </Routes>
    </Router>
  );
}
