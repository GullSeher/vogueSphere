import { useState, useEffect } from "react";
import supabase from "../supabase/supabaseClient";
import UploadPostModal from "../components/UploadPostModal";
import PostCard from "../components/PostCard";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

function Community() {
  const [posts, setPosts] = useState([]);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // New state for full profile
  const [isScrolled, setIsScrolled] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postIdFromNotification = searchParams.get("postId");

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data || []);
    }
  };

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("profile_picture")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setUserProfile(data);
    }
  };

  // Auth check + fetch posts
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { state: { from: "/community" } });
      } else {
        setUser(user);
        fetchUserProfile(user.id); // Fetch detailed profile
        fetchPosts();
      }
    };

    getUser();
  }, [navigate]);

  // Scroll listener for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Scroll to post when coming from Notifications
  useEffect(() => {
    if (postIdFromNotification && posts.length > 0) {
      const el = document.getElementById(`post-${postIdFromNotification}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Optional highlight
        el.classList.add("ring-2", "ring-pink-500", "ring-offset-2");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-pink-500", "ring-offset-2");
        }, 3000);
      }
    }
  }, [postIdFromNotification, posts]);

  return (
    <div className="font-serif min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 
          border-b border-pink-300 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif transition-all duration-300
          ${isScrolled ? "shadow-xl backdrop-blur-lg bg-white/80" : ""}`}
      >
        <Link
          to="/"
          className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300 text-pink-700"
        >
          VogueSphere
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-8 font-medium">
          <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
          <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
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

      <div className="max-w-5xl mx-auto flex justify-center py-8 px-4 pt-28 flex-1">
        <div className="w-full max-w-sm space-y-6">

          {/* Create Post Trigger */}
          <div
            onClick={() => setOpenUploadModal(true)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition overflow-visible"
          >
            {/* Profile Picture with requested styling */}
            <div className="relative flex-shrink-0 -mt-4">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-lg opacity-30 transition-opacity"></div>
              <img
                src={userProfile?.profile_picture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541"}
                alt="Profile"
                className="relative w-14 h-14 rounded-full object-cover border-4 border-white shadow-xl"
              />
            </div>

            <p className="text-gray-500 flex-grow text-sm pl-2">What's on your mind?</p>
            <PlusIcon className="h-6 w-6 text-pink-500 mr-2" />
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div
                  key={post.id}
                  id={`post-${post.id}`}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  <PostCard post={post} onPostDeleted={fetchPosts} />
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400">No posts yet. Start the trend!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Upload Button (Mobile friendly) */}
      <button
        onClick={() => setOpenUploadModal(true)}
        className="fixed bottom-8 right-8 md:hidden bg-gradient-to-r from-pink-500 to-violet-500 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform z-50"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* UPLOAD MODAL */}
      {openUploadModal && (
        <UploadPostModal
          onClose={() => {
            setOpenUploadModal(false);
            fetchPosts();
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 mt-auto text-gray-700">
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

export default Community;