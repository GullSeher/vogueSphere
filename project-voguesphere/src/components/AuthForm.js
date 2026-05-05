import React, { useState, useEffect } from "react";
import supabase from "../supabase/supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function AuthForm({ mode, navigate, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setEmail("");
    setFullName("");
    setPassword("");
  }, [mode]);

  const isPasswordValid = (pwd) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&()_+{}\[\]:;<>,.?/~\\-]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "signup" && !isPasswordValid(password)) {
      toast.error("Password must be at least 8 characters, include 1 capital letter, 1 digit, and 1 special character.");
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: "https://yourdomain.com/email-verified",
          },
        });

        if (error) {
          if (
            error.message.includes("User already registered") ||
            error.message.toLowerCase().includes("already") ||
            error.status === 400
          ) {
            toast.error("This email is already registered. Please log in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Verification email sent! Check your inbox.");
        // setTimeout(() => navigate("/login"), 2500);
        navigate("/login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            toast.error("Please verify your email before logging in.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Login successful! Redirecting...");
        if (onLoginSuccess) onLoginSuccess();

        const from = location.state?.from || "/";
        const tab = location.state?.tab;

        setTimeout(() => navigate(from, { state: { tab } }), 2000);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="text-sm text-gray-600 font-medium">Full Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-pink-400 focus:outline-none mt-1"
            placeholder="e.g. Emma Watson"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label className="text-sm text-gray-600 font-medium">Email</label>
        <input
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-pink-400 focus:outline-none mt-1"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm text-gray-600 font-medium">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:ring-2 focus:ring-pink-400 focus:outline-none mt-1"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>

        {mode === "signup" && (
          <p className="text-xs text-gray-500 mt-1">
            Password must be at least 8 characters, 1 uppercase, 1 number, 1 special character.
          </p>
        )}

        {mode === "login" && (
          <div className="text-right mt-1">
            <Link to="/forgot-password" className="text-sm text-pink-600 hover:underline">
              Forgot Password?
            </Link>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded hover:from-pink-600 hover:to-purple-600 transition font-semibold"
      >
        {mode === "signup" ? "Sign Up" : "Login"}
      </button>
    </form>
  );
}