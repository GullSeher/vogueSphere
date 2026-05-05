import React, { useState } from "react";
import AuthForm from "../components/AuthForm";
import { useNavigate } from "react-router-dom";
import {Link} from "react-router-dom";
// import { UserCircleIcon } from "@heroicons/react/24/solid";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";

import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fff]">
      {/* Navbar */}
      
{/* Navbar */}
   <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
          <Link
            to="/"
            className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300"
          >
            VogueSphere 
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex gap-8 font-medium">
            <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
            <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
            {/* <li><Link to="/upload-match" className="hover:text-pink-700 transition-colors">Upload Match</Link></li> */}
            <li><Link to="/ai-feedback" className="hover:text-pink-700 transition-colors">AI Feedback</Link></li>
            <li><Link to="/community" className="hover:text-pink-700 transition-colors">Community</Link></li>
            <li><Link to="/about-us" className="hover:text-pink-700 transition-colors">About Us</Link></li>
          </ul>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden md:inline-flex bg-white text-pink-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-pink-100 transition-all duration-300"
            >
              Join Now
            </Link>

            <Link
              to="/UserProfile"
              className="text-pink-700 hover:text-pink-900 transition-transform duration-300 hover:scale-110"
            >
              <UserCircleIcon className="h-8 w-8" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-pink-700 hover:text-pink-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <ul className="absolute top-full left-0 w-full bg-white text-pink-700 flex flex-col items-center gap-6 py-6 shadow-lg md:hidden border-t border-pink-200">
              <li><Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
              <li><Link to="/recommendations" onClick={() => setMobileMenuOpen(false)}>Trendy Fits</Link></li>
              {/* <li><Link to="/upload-match" onClick={() => setMobileMenuOpen(false)}>Upload Match</Link></li> */}
              <li><Link to="/ai-feedback" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li>
              <li><Link to="/community" onClick={() => setMobileMenuOpen(false)}>Community</Link></li>
              <li><Link to="/about-us" onClick={() => setMobileMenuOpen(false)}>About Us</Link></li>
              <li>
                <Link
                  to="/login"
                  className="bg-pink-100 text-pink-700 px-6 py-2 rounded-full font-semibold shadow-md hover:bg-pink-200 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Join Now
                </Link>
              </li>
            </ul>
          )}
        </nav>



      {/* Tabs */}
      <div className="pt-20"> {/* navbar height + some spacing */}
  <div className="flex justify-center mt-10">
    <div className="flex gap-2 bg-gray-100 rounded overflow-hidden">
      <button
        onClick={() => setActiveTab("login")}
        className={`px-6 py-2 font-medium text-sm ${
          activeTab === "login" ? "bg-white shadow font-semibold text-pink-500" : ""
        }`}
      >
        Login
      </button>
      <button
        onClick={() => setActiveTab("signup")}
        className={`px-6 py-2 font-medium text-sm ${
          activeTab === "signup" ? "bg-white shadow font-semibold text-pink-500" : ""
        }`}
      >
        Sign Up
      </button>
    </div>
  </div>
</div>


      {/* Auth Card */}
      <div className="flex justify-center mt-6">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md border">
          <h2 className="text-2xl font-semibold mb-2 text-gray-800">
            {activeTab === "login" ? "Login to VogueSphere" : "Sign Up for VogueSphere"}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {activeTab === "login"
              ? "Enter your credentials to access your account"
              : "Create a new account to get started"}
          </p>

          {/* Keep AuthForm logic same */}
          <AuthForm mode={activeTab} navigate={navigate} />
        </div>
      </div>

      {/* Footer */}
               <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 mt-12 text-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">
          
         
      
          {/* Copyright */}
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
          </p>
        </div>
      </footer>
      
    </div>
  );
}