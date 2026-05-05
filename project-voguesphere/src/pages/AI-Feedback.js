import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import supabase from "../supabase/supabaseClient";
import { UserCircleIcon, Bars3Icon, XMarkIcon, SparklesIcon, CloudArrowUpIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/solid";

export default function AIFeedback() {
  const navigate = useNavigate();


  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ------------------- Auth check -------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
      else setUser(data.session.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/login");
    });

    return () => listener?.subscription.unsubscribe();
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFeedback(""); // Clear previous feedback
      setChatActive(false); // Hide chatbot
      setChatHistory([]); // Clear chat

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  // ------------------- Upload + AI Feedback -------------------
  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    try {
      const fileName = `${Date.now()}-${file.name}`;

      // Upload to Supabase silently
      const { error: uploadError } = await supabase.storage
        .from("AI_Feedback")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("AI_Feedback")
        .getPublicUrl(fileName);

      // Send image URL to backend for AI feedback
      const res = await fetch("http://127.0.0.1:5000/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: publicUrl }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback(data.feedback || "No feedback received.");
        setChatActive(true);

        // Save feedback + image URL silently in DB
        const { error: dbError } = await supabase
          .from("ai_feedback_records")
          .insert([{ user_id: user.id, image_url: publicUrl, feedback: data.feedback }]);

        if (dbError) console.error("DB insert error:", dbError);

      } else {
        setFeedback(`❌ Error: ${data.error}`);
      }

    } catch (error) {
      console.error("Upload error:", error);
      setFeedback("❌ Something went wrong.");
    }

    setLoading(false);
  };

  // ------------------- Chat handler -------------------
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newMessage = { role: "user", text: userMessage };
    setChatHistory((prev) => [...prev, newMessage]);
    setUserMessage("");
    setChatLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/stylist-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: res.ok ? data.reply : "❌ " + data.error },
      ]);

    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", text: "❌ Server not responding" }]);
    }

    setChatLoading(false);
  };
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setFeedback("");
    setChatActive(false);
    setChatHistory([]);
  };

  const triggerFileInput = () => {
    document.getElementById('upload-input').click();
  };

  // ------------------- JSX -------------------
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 via-pink-100 to-white font-sans text-gray-900">
      {/* ===== Navbar ===== */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
        <Link to="/" className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300">VogueSphere</Link>
        <ul className="hidden md:flex gap-8 font-medium">
          <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
          <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
          <li><Link to="/ai-feedback" className="hover:text-pink-700 transition-colors">AI Feedback</Link></li>
          <li><Link to="/community" className="hover:text-pink-700 transition-colors">Community</Link></li>
          <li><Link to="/about-us" className="hover:text-pink-700 transition-colors">About Us</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden md:inline-flex bg-white text-pink-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-pink-100 transition-all duration-300">Join Now</Link>
          <Link to="/UserProfile" className="text-pink-700 hover:text-pink-900 transition-transform duration-300 hover:scale-110">
            <UserCircleIcon className="h-8 w-8" />
          </Link>
          <button className="md:hidden text-pink-700 hover:text-pink-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <ul className="fixed top-[72px] left-0 w-full bg-white/95 backdrop-blur-md text-pink-700 flex flex-col items-center gap-6 py-8 shadow-2xl md:hidden border-t border-pink-100 z-[100] animate-in slide-in-from-top duration-300">
          <li><Link to="/" className="text-lg font-bold hover:text-pink-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
          <li><Link to="/recommendations" className="text-lg font-bold hover:text-pink-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>Trendy Fits</Link></li>
          <li><Link to="/ai-feedback" className="text-lg font-bold hover:text-pink-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li>
          <li><Link to="/community" className="text-lg font-bold hover:text-pink-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>Community</Link></li>
          <li><Link to="/about-us" className="text-lg font-bold hover:text-pink-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>About Us</Link></li>
          <li className="w-full px-12 text-center">
            <Link
              to="/login"
              className="inline-block w-full bg-pink-600 text-white py-3 rounded-full font-black shadow-lg shadow-pink-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Join Now
            </Link>
          </li>
        </ul>
      )}

      {/* ===== Main Upload Section ===== */}
      <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-28 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-pink-200/40 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/40 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-pink-100 text-pink-600 font-bold text-xs tracking-widest uppercase mb-6 shadow-sm">
            <SparklesIcon className="h-4 w-4" />
            AI Stylist
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 drop-shadow-sm tracking-tighter">
            Perfect Your Look
          </h2>
          <p className="text-gray-600 mt-6 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Upload your outfit and let our AI analyze your style, color coordination, and fashion balance in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 w-full max-w-6xl grid md:grid-cols-2 gap-10 items-start"
        >
          {/* Upload Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[3rem] shadow-2xl p-8 md:p-10 transition-all duration-500 hover:shadow-pink-200/50">
            <div className={`relative w-full h-[500px] flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] transition-all duration-500 bg-gradient-to-br from-white to-pink-50/50 ${!preview ? 'border-pink-200 hover:border-pink-400' : 'border-transparent'}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="upload-input"
              />

              {!preview ? (
                <label
                  htmlFor="upload-input"
                  className="flex flex-col items-center cursor-pointer group p-8"
                >
                  <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                    <CloudArrowUpIcon className="h-10 w-10" />
                  </div>
                  <span className="text-2xl font-black text-gray-800 mb-2">Select Outfit</span>
                  <p className="text-gray-500 text-sm text-center">Click to browse your photos</p>
                  <div className="mt-8 px-6 py-2 bg-pink-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-pink-200 group-hover:bg-pink-700 transition-colors">
                    Upload Image
                  </div>
                </label>
              ) : (
                <div className="flex flex-col items-center w-full h-full p-2">
                  <div className="relative w-full h-[460px] rounded-[2rem] overflow-hidden shadow-2xl bg-white flex items-center justify-center">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain p-4"
                    />
                    {feedback && (
                      <div className="absolute top-4 right-4 animate-bounce">
                        <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 w-full flex flex-col gap-3">
                    {!feedback && (
                      <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="relative w-full flex items-center justify-center gap-3 bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-pink-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-6 w-6" />
                            Analyze Style
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={triggerFileInput}
                      className="w-full py-4 text-pink-600 font-bold hover:bg-pink-50 rounded-2xl transition-colors border-2 border-transparent hover:border-pink-100"
                    >
                      Choose Different Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback & Chat Column */}
          <div className="flex flex-col gap-8">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[3rem] shadow-2xl p-8 md:p-10 transition-all duration-500 hover:shadow-pink-200/50">
              <AnimatePresence mode="wait">
                {feedback ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-[500px] flex flex-col"
                  >
                    <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                        <SparklesIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-800 leading-tight">AI Feedback</h3>
                        <p className="text-pink-500 text-xs font-bold uppercase tracking-widest">Analysis Ready</p>
                      </div>
                    </div>
                    <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
                      <p className="text-gray-700 leading-relaxed text-lg italic whitespace-pre-wrap">
                        {feedback}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-[500px] flex flex-col items-center justify-center border-4 border-dashed border-pink-200 rounded-[2.5rem] bg-gradient-to-br from-white to-pink-50/50"
                  >
                    <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 mb-6 shadow-inner">
                      <SparklesIcon className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-2">Style Analysis</h3>
                    <p className="text-gray-500 text-center max-w-xs px-4">Your personalized AI stylistic feedback will appear here after upload.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {chatActive && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-xl border border-pink-100 rounded-[2.5rem] shadow-2xl p-8 flex flex-col h-[500px]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
                    <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Virtual Stylist</h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-6 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent pr-2">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <p className="text-gray-400 text-sm italic">Ask me about matching accessories, color palettes, or style tips for this outfit!</p>
                    </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium ${msg.role === "user" ? "bg-pink-600 text-white shadow-lg shadow-pink-100" : "bg-pink-50 text-pink-900 border border-pink-100"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2 p-4 bg-pink-50 rounded-2xl w-20 border border-pink-100">
                      <div className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:0s]" />
                      <div className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    placeholder="Ask styling tips..."
                    className="w-full bg-white border-2 border-pink-100 rounded-2xl py-4 pl-6 pr-14 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-300 transition-all shadow-inner"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-pink-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-pink-200 hover:bg-pink-700 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
      {/* Footer */}
      <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-6 px-4 text-gray-700 mt-auto">
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