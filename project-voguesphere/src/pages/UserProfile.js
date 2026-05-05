
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import { toast } from "react-hot-toast";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

// ==================== Custom Confirmation Modal ====================
const DeleteConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-white via-pink-50 to-purple-50 border border-pink-100 rounded-2xl shadow-2xl text-center space-y-6 w-full max-w-md p-8"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-200/30 via-purple-200/20 to-transparent opacity-70 pointer-events-none"></div>

            <div className="relative w-16 h-16 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-inner">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div className="relative">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Post?</h2>
              <p className="text-gray-600 text-base">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>

            <div className="relative flex justify-center gap-4">
              <button
                onClick={onConfirm}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold"
              >
                Yes, Delete
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-2.5 bg-white/80 text-gray-800 rounded-full border border-gray-200 hover:bg-gray-100 transition-all duration-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==================== Main Component ====================
const UserProfile = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    bio: "",
    image: "/images/profile.jpg",
  });
  const [userPosts, setUserPosts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  // Fetch profile, posts & notifications
  const fetchUserData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return (window.location.href = "/login");

    // Fetch user profile from "users" table
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile({
      name: userData?.name || user.user_metadata?.full_name || "User",
      username: userData?.username || "",
      bio: userData?.bio || "",
      image: userData?.profile_picture || "/images/profile.jpg",
    });

    // Fetch posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, image_url")
      .eq("user_id", user.id);

    if (postsData) setUserPosts(postsData.map((p) => ({ id: p.id, image: p.image_url })));

    // Fetch notifications
    await fetchNotifications(user.id);
  };

  const fetchNotifications = async (userId) => {
    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId);

    const postIds = posts?.map((p) => p.id) || [];
    if (postIds.length === 0) {
      setNotificationCount(0);
      return;
    }

    const { data: likes } = await supabase
      .from("likes")
      .select("id")
      .in("post_id", postIds)
      .eq("visited", false);

    const { data: comments } = await supabase
      .from("comments")
      .select("id")
      .in("post_id", postIds)
      .eq("visited", false);

    setNotificationCount((likes?.length || 0) + (comments?.length || 0));
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const confirmDeletePost = (postId, imageUrl) => {
    setPostToDelete({ postId, imageUrl });
    setShowDeleteModal(true);
  };

  const handleDeletePost = async () => {
    const { postId, imageUrl } = postToDelete;
    setShowDeleteModal(false);

    const path = imageUrl.split("/post-images/")[1];
    if (!path) return toast.error("Failed to parse image path.");

    const { error: storageError } = await supabase.storage.from("post-images").remove([path]);
    if (storageError) return toast.error("Failed to delete image ❌");

    const { error: dbError } = await supabase.from("posts").delete().eq("id", postId);
    if (dbError) return toast.error("Failed to delete post ❌");

    setUserPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post deleted successfully ✅");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = "/login";
  };

  const handleNotificationsClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", user.id);

    const postIds = posts?.map((p) => p.id) || [];
    if (postIds.length === 0) {
      setNotificationCount(0);
      return;
    }

    await supabase.from("likes").update({ visited: true }).in("post_id", postIds).eq("visited", false);
    await supabase.from("comments").update({ visited: true }).in("post_id", postIds).eq("visited", false);

    setNotificationCount(0);
    window.location.href = "/notifications";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/20 font-sans antialiased">
      {/* ==================== Navbar ==================== */}
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

      {/* ==================== Profile Section ==================== */}
      <div className="mt-24 mb-8 px-4 flex-grow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-purple-100/50 p-8 md:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-50/20 to-transparent rounded-3xl"></div>

            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0 -mt-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-lg opacity-30 transition-opacity"></div>
                <img
                  src={profile.image}
                  alt="Profile"
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-xl"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    {profile.name || "User"}
                  </h2>
                  <p className="text-gray-500 text-base md:text-lg mt-2 font-medium">
                    @{profile.username || "username"}
                  </p>
                  <p className="text-gray-600 text-sm md:text-base mt-3 leading-relaxed">
                    {profile.bio || "No bio yet."}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                  {/* Posts */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex-1 flex flex-col items-center bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-default"
                  >
                    <span className="font-extrabold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {userPosts.length}
                    </span>
                    <p className="text-gray-600 text-sm md:text-base mt-1 font-medium">Posts</p>
                  </motion.div>

                  {/* Notifications */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex-1 relative flex flex-col items-center bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={handleNotificationsClick}
                  >
                    <span className="font-extrabold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {notificationCount}
                    </span>
                    <p className="text-gray-600 text-sm md:text-base mt-1 font-medium">
                      Notifications
                    </p>
                    {notificationCount > 0 && (
                      <p className="text-pink-500 text-xs font-semibold mt-1 animate-pulse">
                        New!
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Buttons */}
                <div className="mt-6 flex justify-center gap-6 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Logout
                  </motion.button>

                  <Link
                    to="/edit-profile"
                    className="px-8 py-3 border-2 border-gray-200 rounded-full font-semibold text-gray-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ==================== User Posts Section ==================== */}
      <div className="px-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-6xl mx-auto"
        >
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-purple-100/50 p-6 md:p-10">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
              Your Posts
            </h3>
            {userPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Link to="/community" className="inline-block">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 mb-4 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                  >
                    <svg
                      className="w-10 h-10 text-purple-400 group-hover:text-pink-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6 2v4"
                      />
                    </svg>
                  </motion.div>
                </Link>
                <p className="text-gray-500">No posts yet. Start sharing your outfits!</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userPosts.map((post) => (
                  <div key={post.id} className="relative group aspect-square">
                    <Link to={`/community?postId=${post.id}`}>
                      <img
                        src={post.image}
                        alt="Post"
                        className="w-full h-full object-cover rounded-xl shadow-sm group-hover:opacity-80 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                      />
                    </Link>
                    <button
                      onClick={() => confirmDeletePost(post.id, post.image)}
                      className="absolute top-2 right-2 text-white bg-red-500/80 rounded-full p-1.5 hover:bg-red-600 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ==================== Footer ==================== */}
      <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 text-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ==================== Delete Modal ==================== */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default UserProfile;
