import React, { useState,useEffect } from "react";
import { Link ,useNavigate} from "react-router-dom";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import supabase from "../supabase/supabaseClient";

export default function UploadMatch() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // ===== Check if user is logged in =====
  useEffect(() => {
    // const session = supabase.auth.session(); // ya localStorage.getItem("user") agar wahan store ho
    // if (!session) {
    //   navigate("/login"); // agar login nahi, to redirect
    // } else {
    //   setUser(session.user); // user info set karo
    // }
    const session = supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          navigate("/login");
        } else {
          setUser(data.session.user); // logged-in user
        }});
  }, [navigate]);

const handleUpload = async () => {
  if (!file) return alert("Please upload an image");

  setLoading(true);
  setError(null);
  setResult(null); // reset previous result

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5001/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    // Check if backend sent a friendly message
    if (data.error) {
      setError(data.error);
      setResult(null); // no products to show
    } else {
      setResult(data);
      setError(null);
    }
  } catch (err) {
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-b from-pink-50 to-white">
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
                    {/* <li><Link to="/ai-feedback" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li> */}
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
          <div className="flex flex-col items-center justify-center px-6 mt-32 md:mt-40 mb-20">

  {/* ✨ Heading */}
  <h1 className="text-4xl md:text-6xl font-extrabold text-center bg-gradient-to-r from-pink-600 via-purple-600 to-pink-400 text-transparent bg-clip-text drop-shadow-lg tracking-wide animate-fadeIn">
    Upload & Discover Your Perfect Match
  </h1>

  {/* Decorative underlines */}
  <div className="w-36 h-1 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mt-3"></div>
  <div className="w-20 h-1 bg-pink-300 rounded-full mt-1"></div>

  {/* ✨ Sub Text */}
  <p className="text-gray-600 text-lg md:text-xl font-medium mt-6 text-center max-w-2xl leading-relaxed">
    Upload your picture and let <span className="text-pink-600 font-semibold">VogueSphere</span> detect your style and match fashion products tailored just for you.
  </p>

  {/* ============ Upload Card ============ */}
  <div className="mt-12 bg-white/70 backdrop-blur-xl border border-pink-200 rounded-3xl shadow-2xl p-10 w-full max-w-2xl text-center transition-all hover:shadow-pink-300/80">

    {/* Upload area (Clickable) */}
    <label
      htmlFor="fileInput"
      className="border-2 border-dashed border-pink-300 rounded-2xl p-6 mb-6 bg-pink-50/40 hover:bg-pink-100/60 transition cursor-pointer block"
    >
      {file ? (
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="w-full h-64 object-contain rounded-2xl shadow-inner"
        />
      ) : (
        <p className="text-gray-500 text-lg">📸 Click here or use the button below to upload</p>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="hidden"
        id="fileInput"
      />
    </label>

    {/* Buttons */}
    <div className="flex justify-center gap-4">
      <label
        htmlFor="fileInput"
        className="bg-white border border-pink-400 text-pink-600 px-6 py-2 rounded-full font-semibold cursor-pointer hover:bg-pink-50 transition"
      >
        Select Image
      </label>

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition transform hover:scale-105 disabled:opacity-50"
      >
        Upload & Match
      </button>
    </div>
  </div>

  {/* ================= LOADING ================= */}
 {loading && (
    <div className="mt-12 flex flex-col items-center gap-6 animate-fadeIn">
      {/* Analysis Bar Chart Container */}
      <div className="w-24 h-24 flex items-end justify-center gap-2">
        
        {/* Bar 1: Pink */}
        <div className="w-4 bg-pink-500 rounded-t-full shadow-lg animate-bar-1" style={{ height: '30%' }}></div>
        
        {/* Bar 2: Deep Purple */}
        <div className="w-4 bg-indigo-600 rounded-t-full shadow-lg animate-bar-2" style={{ height: '70%' }}></div>
        
        {/* Bar 3: Lighter Pink */}
        <div className="w-4 bg-pink-400 rounded-t-full shadow-lg animate-bar-3" style={{ height: '50%' }}></div>

        {/* Bar 4: Lightest Purple */}
        <div className="w-4 bg-indigo-400 rounded-t-full shadow-lg animate-bar-4" style={{ height: '40%' }}></div>
      </div>
      
      <p className="text-pink-600 text-xl font-bold tracking-wider">Analyzing your style...</p>
    </div>
)}

  {/* ================= ERROR ================= */}
  {error && (
    <p className="text-red-500 text-center mt-8 font-medium animate-shake">
      ⚠️ {error}
    </p>
  )}

  {/* ================= RESULTS ================= */}
  {result && !loading && (
    <div className="mt-14 w-full max-w-6xl">

      {/* Predicted Labels */}
      {result.predicted_labels && (
        <h2 className="text-xl md:text-2xl font-semibold text-center mb-6 text-gray-800">
          Detected Styles:{" "}
          <span className="text-pink-600 font-bold">
            {result.predicted_labels.join(", ")}
          </span>
        </h2>
      )}

      {/* Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-12">
        {Array.isArray(result.matched_products) && result.matched_products.length > 0 ? (
          result.matched_products.map((p, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden group 
                         transform transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl"
            >
              <div className="relative w-full h-72 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.title || "Product"}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              <div className="p-4">
                <p className="text-gray-800 font-semibold text-md truncate">{p.title}</p>
                <p className="text-pink-600 font-bold mt-1">{p.price}</p>

                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-sm text-gray-600 hover:text-pink-600 transition"
                >
                  View Product →
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400 text-lg">
            No matching products found.
          </p>
        )}
      </div>
      
    </div>
    
  )}

 <style>{`
  /* Standard Fade In */
  @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
  .animate-fadeIn { animation: fadeIn 0.8s ease-in-out; }

  /* Animation for Bar 1 (Slowest) */
  @keyframes bar-1-move {
    0%, 100% { height: 30%; }
    50% { height: 80%; }
  }
  .animate-bar-1 { 
    animation: bar-1-move 2s ease-in-out infinite alternate; 
  }

  /* Animation for Bar 2 */
  @keyframes bar-2-move {
    0%, 100% { height: 70%; }
    50% { height: 40%; }
  }
  .animate-bar-2 { 
    animation: bar-2-move 1.5s ease-in-out infinite alternate; 
  }

  /* Animation for Bar 3 */
  @keyframes bar-3-move {
    0%, 100% { height: 50%; }
    50% { height: 90%; }
  }
  .animate-bar-3 { 
    animation: bar-3-move 1.8s ease-in-out infinite alternate; 
  }

  /* Animation for Bar 4 (Fastest) */
  @keyframes bar-4-move {
    0%, 100% { height: 40%; }
    50% { height: 65%; }
  }
  .animate-bar-4 { 
    animation: bar-4-move 1.2s ease-in-out infinite alternate; 
  }
`}</style>
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
