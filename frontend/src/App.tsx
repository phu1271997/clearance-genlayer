import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { RegisterWork } from './pages/RegisterWork';
import { Works } from './pages/Works';
import { WorkDetail } from './pages/WorkDetail';
import { SubmitClaim } from './pages/SubmitClaim';
import { ClaimDetail } from './pages/ClaimDetail';
import { MyWorks } from './pages/MyWorks';

export const App: React.FC = () => {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100 font-sans selection:bg-purple-600 selection:text-white">
          <Navbar />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<RegisterWork />} />
              <Route path="/works" element={<Works />} />
              <Route path="/works/:workId" element={<WorkDetail />} />
              <Route path="/claim/new/:workId" element={<SubmitClaim />} />
              <Route path="/claim/:claimId" element={<ClaimDetail />} />
              <Route path="/my-works" element={<MyWorks />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
};

export default App;
