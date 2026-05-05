import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/login");
        return;
      }

      const loggedInUserId = user.id;

      // Fetch user's posts
      const { data: userPostsData, error: postsError } = await supabase
        .from("posts")
        .select("id, image_url")
        .eq("user_id", loggedInUserId);

      if (postsError) {
        toast.error("Failed to load posts.");
        return;
      }

      const userPostIds = userPostsData.map((post) => post.id);

      if (userPostIds.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Fetch likes
      const { data: likesData = [] } = await supabase
        .from("likes")
        .select("id, post_id, user_id, created_at")
        .in("post_id", userPostIds);

      // Fetch comments
      const { data: commentsData = [] } = await supabase
        .from("comments")
        .select("id, post_id, text, user_id, created_at")
        .in("post_id", userPostIds);

      // Fetch users
      const { data: usersData = [] } = await supabase
        .from("users")
        .select("id, username, profile_picture");

      const likesNotifications = likesData.map((like) => {
        const userInfo = usersData.find((u) => u.id === like.user_id);
        const post = userPostsData.find((p) => p.id === like.post_id);

        return {
          id: like.id,
          type: "like",
          postId: like.post_id,
          username: userInfo?.username || "Unknown",
          profilePic: userInfo?.profile_picture || "/images/profile.jpg",
          postImage: post?.image_url || "",
          createdAt: like.created_at,
        };
      });

      const commentsNotifications = commentsData.map((comment) => {
        const userInfo = usersData.find((u) => u.id === comment.user_id);
        const post = userPostsData.find((p) => p.id === comment.post_id);

        return {
          id: comment.id,
          type: "comment",
          postId: comment.post_id,
          username: userInfo?.username || "Unknown",
          profilePic: userInfo?.profile_picture || "/images/profile.jpg",
          postImage: post?.image_url || "",
          commentText: comment.text,
          createdAt: comment.created_at,
        };
      });

      const combinedNotifications = [
        ...likesNotifications,
        ...commentsNotifications,
      ].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setNotifications(combinedNotifications);
    } catch (error) {
      toast.error("Failed to fetch notifications.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-serif">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 shadow-2xl bg-gradient-to-r from-pink-100 via-white to-pink-200">
        <Link to="/" className="text-3xl font-extrabold">
          VogueSphere
        </Link>

        <ul className="hidden md:flex gap-8 font-medium">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/recommendations">Trendy Fits</Link></li>
          <li><Link to="/ai-feedback">AI Feedback</Link></li>
          <li><Link to="/community">Community</Link></li>
          <li><Link to="/about-us">About Us</Link></li>
        </ul>

        <div className="flex items-center gap-4">
          <Link to="/UserProfile">
            <UserCircleIcon className="h-8 w-8 text-pink-700" />
          </Link>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-8 w-8" />
            ) : (
              <Bars3Icon className="h-8 w-8" />
            )}
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="flex-grow flex justify-center pt-32 pb-16">
        <div className="w-full max-w-3xl bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center text-pink-600 mb-8">
            Your Notifications
          </h2>

          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-6">
              {notifications.map((note, index) => (
                <Link
                  to={`/community?postId=${note.postId}`}
                  key={`${note.type}-${note.id}`}
                  className="block"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-5 rounded-xl shadow border-l-4 border-pink-400 hover:bg-pink-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={note.profilePic}
                        className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm"
                        alt="user"
                      />

                      <div>
                        {note.type === "like" ? (
                          <p>
                            <span className="font-semibold text-pink-600">
                              {note.username}
                            </span>{" "}
                            liked your post
                          </p>
                        ) : (
                          <p>
                            <span className="font-semibold text-purple-600">
                              {note.username}
                            </span>{" "}
                            commented:{" "}
                            <span className="italic text-gray-600">
                              "{note.commentText}"
                            </span>
                          </p>
                        )}

                      </div>
                    </div>

                    {/* POST THUMBNAIL */}
                    {note.postImage && (
                      <div className="w-16 h-16 shrink-0 ml-4">
                        <img
                          src={note.postImage}
                          alt="post"
                          className="w-full h-full aspect-square object-contain bg-gray-50 rounded-lg border border-pink-100 shadow-sm group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} VogueSphere. All rights reserved.
      </footer>
    </div>
  );
};

export default Notifications;




