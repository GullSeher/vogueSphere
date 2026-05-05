import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "react-hot-toast";

import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AboutUS from './pages/Aboutus';
import EmailVerifiedSuccess from './pages/EmailVerified';
import Community from './pages/Community'; 
import PostDetails from './pages/PostDetails';
import UserProfile from './pages/UserProfile'; 
import Notifications from './pages/Notifications';
import EditProfile from './pages/EditProfile';
import Quiz from './pages/Quiz';
import AIFeedback from './pages/AI-Feedback'
import QuizRecommendation from './pages/QuizRecommendation';

import UploadMatch from './pages/UploadMatch';

// import AIOutfitFeedback from './pages/AIOutfitFeedback'; // Import the AI Outfit Feedback component
import RecommendationsPage from "./pages/RecommendationsPage";
// ✅ Import the ScrollToTop component
import ScrollToTop from './components/ScrollToTop';

import './index.css';
import './App.css';

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        {/* ✅ Add this just above Routes */}
        <ScrollToTop />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/email-verified" element={<EmailVerifiedSuccess />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about-us" element={<AboutUS />} />
          <Route path="/community" element={<Community />} />  
          <Route path="/post/:postId" element={<PostDetails />} />
          <Route path="/UserProfile" element={<UserProfile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          {/* <Route path="/ai-outfit-feedback" element={<AIOutfitFeedback />} /> */}
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/upload-match" element={<UploadMatch />} />
          <Route path="/quiz-recommendation" element={<QuizRecommendation />} />
           <Route path="/ai-feedback" element={<AIFeedback/>}/>

          {/* Add other routes as needed */}

        </Routes>
      </Router>
    </>
  );
}

export default App;
