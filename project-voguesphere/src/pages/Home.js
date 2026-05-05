import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";


// Assets
import heroVideo from "../assets/Hero-section.mp4";

import img1 from "../assets/img7.png";
import img2 from "../assets/AI-Feedback.png";
import img3 from "../assets/Community.png";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    //  const videoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const FeatureCard = ({ img, title, desc, link, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
        <div className="w-full h-80 overflow-hidden">
          <img
            src={img}
            alt={title}
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700"
          />
        </div>
      </div>
      <Link to={link} className="block mt-4 hover:text-pink-600 transition-colors duration-300">
        <h3 className="text-2xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="text-gray-600 font-medium">{desc}</p>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 via-pink-100 to-white font-sans">
    

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

      {/* HERO SECTION */}
      <section className="relative w-full min-h-screen flex items-end justify-center text-center overflow-hidden pt-20">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            className="absolute inset-0 w-full h-full object-cover object-center md:object-contain lg:object-cover"
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Hero Text (slightly lower center) */}
        <motion.div
          className="relative z-10 mb-50 p-4 md:p-8 rounded-lg max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
            Find the Style That Defines You
          </h1>
          <p className="text-lg md:text-xl text-pink-100 mb-8">
            Smart Fashion Powered by Innovation and Style.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/login">
              <motion.button
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-semibold shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </Link>
            <Link to="/about-us">
              <motion.button
                className="bg-white/20 border-2 border-white/50 text-white hover:bg-white/30 backdrop-blur-sm px-8 py-3 rounded-full font-semibold shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn More
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

    {/* AI Feedback Section */}
<section className="relative text-center py-16 px-6 md:px-10 bg-gradient-to-b from-white to-rose-50 overflow-hidden">

  <motion.h2
    className="relative text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 z-10"
    initial={{ y: 40, opacity: 0 }}
    whileInView={{ y: 0, opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
  >
    AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600">Outfit Feedback</span>
  </motion.h2>

  <motion.p
    className="max-w-2xl mx-auto text-gray-700 text-base md:text-lg mb-8 leading-relaxed"
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay: 0.2 }}
  >
    Let our AI stylist analyze your outfit and provide instant feedback on color coordination and overall fashion balance.
  </motion.p>

  {/* Main Card */}
  <div className="flex justify-center">
    <motion.div
      className="relative bg-white/70 backdrop-blur-xl border border-rose-200 p-8 rounded-3xl shadow-lg w-full max-w-lg 
      hover:shadow-[0_10px_30px_rgba(255,182,193,0.35)] transition-all duration-400"
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay: 0.3 }}
    >
      <div className="relative z-10">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Fashion Analysis</h3>
        <p className="mb-6 text-base text-gray-600 leading-relaxed">
          Upload your outfit photo to receive AI-powered insights and personalized style suggestions.
        </p>

        <Link to="/ai-feedback">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white px-8 py-3 rounded-2xl font-semibold text-base shadow-lg transition-all duration-300"
          >
            Try AI Feedback
          </motion.button>
        </Link>
      </div>
    </motion.div>
  </div>

</section>


{/* FEATURE SECTION */}
<section className="relative py-20 px-6 md:px-12 bg-gradient-to-b from-white to-rose-50 overflow-hidden">
  
  {/* Section Wrapper */}
  <div className="max-w-6xl mx-auto text-center">

    <motion.h2
      className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-14"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      Explore the{" "}
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600">
        VogueSphere
      </span>{" "}
      Experience
    </motion.h2>

    {/* Feature Cards Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 place-items-center">
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <FeatureCard
          img={img2}
          title="AI Feedback"
          desc="Get instant outfit insights powered by artificial intelligence."
          link="/ai-feedback"
          className="text-center"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <FeatureCard
          img={img1}
          title="Trendy Fits"
          desc="Discover the latest looks curated for your unique style."
          link="/recommendations"
          className="text-center"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        <FeatureCard
          img={img3}
          title="Community"
          desc="Connect, share, and get inspired by fashion enthusiasts like you."
          link="/community"
          className="text-center"
        />
      </motion.div>

    </div>
  </div>
</section>


    {/* CTA Section */}
<section className="relative mt-12 sm:mt-16 text-center py-10 sm:py-14 bg-gradient-to-br from-pink-500 via-pink-400 to-pink-600 text-white overflow-hidden shadow-xl rounded-xl sm:rounded-2xl mx-4 sm:mx-6 border border-pink-300">
  <motion.div
    className="relative z-10 px-4 sm:px-6"
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.9 }}
  >
    <motion.h2
      className="text-xl sm:text-3xl md:text-4xl font-bold mb-2"
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      Ready to Transform Your Style?
    </motion.h2>

    <motion.p
      className="text-xs sm:text-base md:text-lg text-pink-100 mb-6 max-w-lg sm:max-w-xl mx-auto leading-relaxed"
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      Join <span className="text-white font-semibold">VogueSphere</span> today and let AI refine your fashion sense!
    </motion.p>

    <Link to="/login">
      <motion.div
        className="relative inline-block group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 opacity-70 blur-md group-hover:blur-lg transition-all duration-300"></div>
        <button className="relative z-10 px-6 sm:px-10 py-3 sm:py-3.5 font-semibold text-sm sm:text-base text-pink-600 bg-white rounded-full shadow-md transition-all duration-300 hover:bg-pink-100 hover:text-pink-700">
          Sign Up Now
        </button>
      </motion.div>
    </Link>
  </motion.div>
</section>

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