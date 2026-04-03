import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PatientDashboard from './pages/PatientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import ReportAnalysisPatient from './pages/ReportAnalysisPatient';
import ReportAnalysisDoctor from './pages/ReportAnalysisDoctor';
import EcgAnalysis from './pages/EcgAnalysis';
import CancerAnalysisPatient from './pages/CancerAnalysisPatient';
import CancerAnalysisDoctor from './pages/CancerAnalysisDoctor';
import StitchPremiumUI from './pages/StitchPremiumUI';
import DNABackground from './components/DNABackground';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

function Layout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isPremiumPage = location.pathname === '/premium';

  return (
    <>
      {!isPremiumPage && <DNABackground isAuthPage={isAuthPage} />}
      <div className="flex flex-col min-h-screen relative z-10 transition-colors duration-300 bg-transparent">
        {!isPremiumPage && <Navbar />}
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/premium" element={<StitchPremiumUI />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
            <Route path="/analyze-patient" element={<ReportAnalysisPatient />} />
            <Route path="/analyze-doctor" element={<ReportAnalysisDoctor />} />
            <Route path="/analyze-ecg" element={<EcgAnalysis />} />
            <Route path="/cancer-analysis-patient" element={<CancerAnalysisPatient />} />
            <Route path="/cancer-analysis-doctor" element={<CancerAnalysisDoctor />} />
          </Routes>
        </main>
        {!isAuthPage && !isPremiumPage && <Footer />}
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
