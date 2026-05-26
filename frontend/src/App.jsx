import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import SharedReview from './pages/SharedReview';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ThemeToggle />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/share/:shareToken" element={<SharedReview />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reviews/:id" element={<ProtectedRoute><ReviewDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
