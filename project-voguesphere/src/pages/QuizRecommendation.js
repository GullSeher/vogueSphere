import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// import { UserCircleIcon } from "@heroicons/react/24/solid";
import supabase from "../supabase/supabaseClient";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";


export default function QuizRecommendation() {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        console.warn("⚠️ No user logged in");
        setRecommended([]);
        setLoading(false);
        return;
      }

      // Fetch user quiz responses
      const { data: responses, error } = await supabase
        .from("user_quiz_responses")
        .select("question_id, value, timestamp")
        .eq("user_id", currentUser.id)
        .order("timestamp", { ascending: true }); // keep order

      if (error) throw error;
      if (!responses?.length) {
        setRecommended([]);
        setLoading(false);
        return;
      }

      // Use the latest timestamp only
      const latestTimestamp = responses[responses.length - 1].timestamp;
      const latestResponses = responses.filter(
        (r) => r.timestamp === latestTimestamp
      );

      // Separate responses by type
      let colorLabels = [];
      let bodyTypeLabels = [];
      let outfitLabels = [];

      latestResponses.forEach((r) => {
        try {
          const parsed = JSON.parse(r.value);
          const labels = Array.isArray(parsed)
            ? parsed.map((l) => l.toLowerCase().trim())
            : [parsed.toLowerCase().trim()];

          // Assign labels based on question type
          const questionId = r.question_id;

          // 1️⃣ Colors question
          if (questionId === "dd97363b-95e7-47c1-a813-1214b31b296a") {
            colorLabels.push(...labels);
          }
          // 2️⃣ Body type question
          else if (questionId === "2f4b2a9b-f392-4bbe-942c-1cec996a9e48") {
            bodyTypeLabels.push(...labels);
          }
          // 3️⃣ Outfit questions
          else {
            outfitLabels.push(...labels);
          }
        } catch {
          if (r.value) outfitLabels.push(r.value.toLowerCase().trim());
        }
      });

      // Fetch product files
      const { data: fileList, error: fileError } = await supabase.storage
        .from("scrape-data")
        .list("", { sortBy: { column: "created_at", order: "desc" } });
      if (fileError) throw fileError;

      let allProducts = [];
      for (const file of fileList) {
        const { data: urlData } = supabase.storage
          .from("scrape-data")
          .getPublicUrl(file.name);
        const res = await fetch(urlData.publicUrl);
        const jsonData = await res.json();
        if (jsonData?.products) allProducts.push(...jsonData.products);
      }

      // Score products based on hierarchy
      const scoredProducts = allProducts.map((product) => {
        const labels = product.labels?.map((l) => l.toLowerCase().trim()) || [];
        let score = 0;

        // Outfit labels (highest priority)
        outfitLabels.forEach((label) => {
          if (labels.includes(label)) score += 3;
          else if (labels.some((l) => l.includes(label))) score += 1.5;
        });

        // Body type labels (only if no specific outfit label selected)
        if (outfitLabels.length === 0) {
          bodyTypeLabels.forEach((label) => {
            if (labels.includes(label)) score += 2;
            else if (labels.some((l) => l.includes(label))) score += 1;
          });
        }

        // Color labels (lowest priority)
        colorLabels.forEach((label) => {
          if (labels.includes(label)) score += 1;
          else if (labels.some((l) => l.includes(label))) score += 0.5;
        });

        return { ...product, score, labels };
      });

      const topMatches = scoredProducts
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      const finalResults =
        topMatches.length > 0
          ? topMatches
          : scoredProducts.sort(() => 0.5 - Math.random()).slice(0, 30);

      setRecommended(finalResults);
    } catch (err) {
      console.error("❌ Error fetching recommendations:", err);
      setRecommended([]);
    } finally {
      setLoading(false);
    }
  };

  fetchRecommendations();
}, []);

 if (loading)
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-pink-50 to-white">
     <div className="relative w-full h-48 flex flex-col items-center justify-center">
  {/* Loading Text */}
  <h2 className="text-xl md:text-2xl font-semibold text-pink-600 mb-6 animate-pulse">
    Loading personalized recommendations...
  </h2>

  {/* Loader */}
  <div className="relative w-36 h-36">
    <div className="dot dot1"></div>
    <div className="dot dot2"></div>
    <div className="dot dot3"></div>
  </div>

  <style>
    {`
      .dot {
        position: absolute;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        margin: -11px 0 0 -11px;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
        animation: orbitPulse 1.5s linear infinite;
      }

      .dot1 { background: linear-gradient(45deg, #f472b6, #f9a8d4); animation-delay: 0s; }
      .dot2 { background: linear-gradient(45deg, #60a5fa, #93c5fd); animation-delay: 0.5s; }
      .dot3 { background: linear-gradient(45deg, #facc15, #fde68a); animation-delay: 1s; }

      @keyframes orbitPulse {
        0%   { transform: rotate(0deg) translateX(65px) rotate(0deg) scale(1); }
        25%  { transform: rotate(90deg) translateX(65px) rotate(-90deg) scale(1.3); }
        50%  { transform: rotate(180deg) translateX(65px) rotate(-180deg) scale(1); }
        75%  { transform: rotate(270deg) translateX(65px) rotate(-270deg) scale(1.3); }
        100% { transform: rotate(360deg) translateX(65px) rotate(-360deg) scale(1); }
      }
    `}
  </style>
</div>

    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
        <Link
          to="/"
          className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300"
        >
          VogueSphere 
        </Link>

        <ul className="hidden md:flex gap-8 font-medium">
          <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
          <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
          {/* <li><Link to="/upload-match" className="hover:text-pink-700 transition-colors">Upload Match</Link></li> */}
          <li><Link to="/ai-feedback" className="hover:text-pink-700 transition-colors">AI Feedback</Link></li>
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
          <Link
            to="/UserProfile"
            className="text-pink-700 hover:text-pink-900 transition-transform duration-300 hover:scale-110"
          >
            <UserCircleIcon className="h-8 w-8" />
          </Link>

          <button
            className="md:hidden text-pink-700 hover:text-pink-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>

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

      <main className="flex-grow max-w-7xl mx-auto p-6 mt-28">
  {/* Heading */}
<h1 className="text-4xl md:text-5xl font-extrabold mb-10 text-center tracking-tight">
  Your Personalized{" "}
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600">
    Outfit Recommendations
  </span>
</h1>


<div className="flex justify-center mt-6">
  <Link
    to="/quiz?restart=true"
    className="group relative flex items-center gap-2 px-5 py-2 rounded-full font-medium
               bg-white text-pink-600 border border-pink-300 
               shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:bg-pink-50"
  >
    <ArrowPathIcon className="h-5 w-5 text-pink-600 transition-transform duration-300 group-hover:rotate-180" />
    Retake Quiz
  </Link>
</div>


  {recommended.length === 0 ? (
    <p className="text-center text-gray-500 text-lg">
      No matching outfits found.
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
      {recommended.map((p, i) => (
        <div
          key={i}
          className="relative bg-white rounded-2xl shadow-md overflow-hidden transform transition duration-500 hover:scale-105 hover:shadow-2xl"
        >
          {/* Product Image */}
          {p.image && (
            <div className="relative w-full h-72 overflow-hidden">
              <img
                src={p.image}
                alt={p.title || "Product"}
                className="w-full h-full object-cover object-top"
              />
              {p.title && (
                <div className="absolute bottom-0 left-0 w-full bg-white bg-opacity-90 px-3 py-1">
                  <p className="text-black font-semibold text-sm text-center truncate">
                    {p.title}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Product Info */}
          <div className="p-4 flex flex-col gap-2">
            {p.price && (
              <p className="text-pink-600 font-semibold text-base">{p.price}</p>
            )}

            {p.link && (
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="text-gray-700 hover:text-pink-600 font-medium transition-colors duration-300 text-sm"
              >
                View Product
              </a>
            )}
          </div>

          {/* Soft overlay on hover */}
          <div className="absolute inset-0 bg-pink-50 opacity-0 hover:opacity-20 transition duration-500 pointer-events-none"></div>
        </div>
      ))}
    </div>
  )}
</main>

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
