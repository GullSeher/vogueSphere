import React, { useState } from "react";
import { Link } from "react-router-dom";
import img10 from "../assets/img10.jpeg"; // Mission Section image
import areejPic from "../assets/areej.jpeg"; // Areej image
import gullPic from "../assets/gull.jpeg"; // Gull Seher image
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

export default function AboutUs() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-b from-pink-50 via-pink-100 to-white font-sans">
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
      </div>

      {/* About Section */}
      <section
        className="relative w-full h-screen flex items-center justify-center md:justify-end px-4 md:px-24 mt-0"
        style={{
          backgroundImage:
            "url('https://img.freepik.com/free-photo/slim-lovely-girl-fluffy-jacket-fooling-around-pink-wall-interested-young-woman-stylish-peruke-expressing-happiness-photoshoot_197531-5359.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Blurred Glass Box */}
        <div
          className="absolute right-2 md:right-12 lg:right-20 xl:right-28 bg-white/25 backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-10 max-w-md md:max-w-lg text-left text-white animate-fade-in-right"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-wide">
            About VogueSphere
          </h2>
          <p className="text-sm md:text-lg leading-relaxed">
            VogueSphere is redefining fashion through AI innovation and a vibrant
            global community. We blend technology and creativity to empower users
            to explore, express, and enhance their personal style effortlessly.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section className="relative flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 mt-4 mb-20 px-4 md:px-12 bg-gradient-to-r from-pink-50 via-white to-pink-50 rounded-3xl shadow-md py-12 md:py-16 overflow-hidden animate-fade-in-left">
        {/* Decorative Background Shape */}
        <div className="absolute -z-10 right-0 bottom-0 w-64 md:w-96 h-64 md:h-96 bg-pink-200 rounded-full blur-3xl opacity-40"></div>

        {/* Left Text */}
        <div className="text-left max-w-md space-y-5">
          <h3 className="text-3xl md:text-4xl font-extrabold mb-3 text-pink-600 drop-shadow-lg">
            Our Mission
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm md:text-lg">
            At <span className="font-semibold text-pink-500">VogueSphere</span>, our mission is to empower individuals 
            to express their unique fashion identity through 
            <span className="font-semibold text-pink-500"> AI-driven insights </span> 
            and <span className="font-semibold text-pink-500">community collaboration</span>. 
            We believe fashion is more than trends — it’s confidence, creativity, and connection.
          </p>
        </div>

        {/* Right Image */}
        <div className="flex gap-6 items-start mt-6 md:mt-0">
          <motion.img
            src={img10}
            alt="Our Mission 1"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-60 h-60 md:w-80 md:h-80 object-cover object-top rounded-full shadow-2xl transform hover:scale-110 transition duration-700 ease-in-out border-4 border-white"
          />
        </div>
      </section>

      {/* How VogueSphere Works */}
      <section className="mt-0 mb-24 flex justify-center px-4 md:px-6">
        <div className="w-full max-w-md md:max-w-4xl">
          <h3 className="text-2xl md:text-3xl font-extrabold mb-12 text-center text-pink-600 drop-shadow-md transition-all duration-500 hover:text-pink-700">
            How VogueSphere Works
          </h3>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 md:left-6 top-0 h-full w-1 bg-pink-100 rounded-full"></div>

            {/* Steps */}
            {[1, 2, 3, 4].map((step, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row items-start mb-12 relative group transition-all duration-700 hover:translate-x-2"
              >
                <div className="flex-shrink-0 z-10 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center ring-4 ring-white shadow-md group-hover:bg-pink-200 transition-all duration-500">
                  <img src={
                    index === 0 ? "https://cdn-icons-png.flaticon.com/512/992/992651.png" :
                    index === 1 ? "https://cdn-icons-png.flaticon.com/512/2910/2910768.png" :
                    index === 2 ? "https://cdn-icons-png.flaticon.com/512/3094/3094853.png" :
                    "https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
                  } alt={`Step ${index+1}`} className="w-6 h-6" />
                </div>
                <div className="mt-4 md:mt-0 ml-0 md:ml-8 flex-1 bg-white rounded-xl shadow-md border border-pink-100 p-4 md:p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-200">
                  <h4 className="text-lg md:text-xl font-bold text-pink-600 mb-2">
                    {index === 0 ? "1. Upload & Analyze" :
                     index === 1 ? "2. Discover Trends" :
                     index === 2 ? "3. Join the Community" :
                     "4. AI Feedback"}
                  </h4>
                  <p className="text-gray-700 text-sm md:text-base">
                    {index === 0 ? "Upload your outfits and get AI-powered analysis instantly." :
                     index === 1 ? "Get personalized trend recommendations based on your style." :
                     index === 2 ? "Connect, share, and grow with a fashion-forward community." :
                     "Receive intelligent outfit suggestions and improvement tips powered by AI."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="mb-20 animate-fade-in-up px-4 md:px-0">
        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-12 text-center tracking-wide">
          Meet Our Team
        </h3>
        <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-14">
          {[{name:"Areej Fatima", pic:areejPic, role:"Member 1", desc:"Fashion visionary with a love for innovation."},
            {name:"Gull Seher", pic:gullPic, role:"Member 2", desc:"Bringing AI and style together seamlessly."}].map((member, idx) => (
            <div key={idx} className="text-center max-w-xs group cursor-pointer transform hover:scale-105 transition-transform duration-300 shadow-lg rounded-xl p-6 bg-white">
              <img
                src={member.pic}
                alt={member.name}
                className="w-28 h-28 rounded-full object-cover object-top mx-auto mb-5 ring-4 ring-pink-400 group-hover:ring-pink-600 transition duration-300"
              />
              <h4 className="font-extrabold text-pink-600 text-xl mb-1">{member.name}</h4>
              <p className="text-pink-400 font-semibold mb-2">{member.role}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{member.desc}</p>
            </div>
          ))}
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
     
    </>
  );
}