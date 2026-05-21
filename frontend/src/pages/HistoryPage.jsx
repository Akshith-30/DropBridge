import { Navigate } from 'react-router-dom';

/** Legacy /history → send history */
export default function HistoryPage() {
  return <Navigate to="/history/send" replace />;
}
