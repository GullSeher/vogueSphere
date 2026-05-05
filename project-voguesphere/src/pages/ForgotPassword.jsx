import { useState } from "react";
import supabase from "../supabase/supabaseClient";
import { Link } from "react-router-dom";
import { UserCircleIcon, XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // 1️⃣ Check if email exists in `users` table
    const { data, error: checkError } = await supabase
      .from("users") 
      .select("email")
      .eq("email", email)
      .single();

    if (checkError || !data) {
      setIsError(true);
      setMessage("❌ This account does not exist. Please sign up first.");
      setLoading(false);
      return;
    }

    // 2️⃣ If exists, send reset link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) {
      setIsError(true);
      setMessage("⚠️ Something went wrong. Try again.");
    } else {
      setIsError(false);
      setMessage("✅ A password reset link has been sent to your email!");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 px-4">
        
        {/* Navbar */}
        <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
          <Link to="/" className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300">
            VogueSphere
          </Link>

          <ul className="hidden md:flex gap-8 font-medium">
            <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
            <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
            <li><Link to="/community" className="hover:text-pink-700 transition-colors">Community</Link></li>
            <li><Link to="/about-us" className="hover:text-pink-700 transition-colors">About Us</Link></li>
          </ul>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden md:inline-flex bg-white text-pink-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-pink-100 transition-all duration-300"
            >
              Join Now
            </Link>

            <Link to="/UserProfile" className="text-pink-700 hover:text-pink-900 transition-transform duration-300 hover:scale-110">
              <UserCircleIcon className="h-8 w-8" />
            </Link>

            <button className="md:hidden text-pink-700 hover:text-pink-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <ul className="absolute top-full left-0 w-full bg-white text-pink-700 flex flex-col items-center gap-6 py-6 shadow-lg md:hidden border-t border-pink-200">
              <li><Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
              <li><Link to="/recommendations" onClick={() => setMobileMenuOpen(false)}>Trendy Fits</Link></li>
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

        {/* Form */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 text-pink-500">
            Forgot Password
          </h2>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-black focus:outline-none text-gray-800 placeholder-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded font-semibold hover:from-pink-600 hover:to-purple-600 transition duration-200 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            {message && (
              <div className={`mt-6 text-center text-sm font-medium ${isError ? "text-red-500" : "text-green-600"}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 text-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">
         
          <div className="w-12 h-[1px] bg-pink-200 my-1"></div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
