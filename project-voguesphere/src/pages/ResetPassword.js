import { useState } from "react";
import supabase from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi"; // Importing icons
import { Link } from "react-router-dom";
import { UserCircleIcon, XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State to toggle password visibility
  const navigate = useNavigate();
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleResetPassword = async (e) => {
  e.preventDefault();

  if (!validatePassword(password)) {
    setMessage("Password must be at least 8 characters long, contain 1 special character, 1 digit, and 1 uppercase letter.");
    return;
  }

  const { error } = await supabase.auth.updateUser({ password });

  // Sign out immediately to prevent auto-login
  await supabase.auth.signOut();

  if (error) {
    setMessage("Error updating password. Try again.");
  } else {
    setMessage("Password updated successfully! Please login with your new password.");
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  }
};

  return (
    <>
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
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
              {/* <li><Link to="/upload-match" onClick={() => setMobileMenuOpen(false)}>Upload Match</Link></li>
              <li><Link to="/ai-feedback" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li> */}
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

      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6 text-pink-500">Reset Password</h2>
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              id="password"
              type={isPasswordVisible ? "text" : "password"} // Toggle between text and password
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:outline-none"
              placeholder="Enter new password"
            />
            <span
              onClick={() => setIsPasswordVisible(!isPasswordVisible)} // Toggle visibility
              className="absolute right-3 top-2/3 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {isPasswordVisible ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded font-semibold hover:from-pink-600 hover:to-purple-600 transition duration-200"
          >
            Reset Password
          </button>

          {message && (
            <div className="mt-4 text-center text-sm text-gray-600">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
     {/* Footer */}
                 <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4  text-gray-700"> {/* mt-12 → mt-6 */}
    
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">
            
           
        
            {/* Copyright */}
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
            </p>
          </div>
        </footer>
        </>
  );
}
