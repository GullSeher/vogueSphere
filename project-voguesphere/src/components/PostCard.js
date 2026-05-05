import { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import InlineCommentBox from "./InlineCommentBox";
import LikeButton from "./LikeButton";
import { ChatBubbleLeftIcon, TrashIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

export default function PostCard({ post, onPostDeleted }) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comments, setComments] = useState([]);
  const [userData, setUserData] = useState({ username: "Anonymous", profile_picture: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, text, user_id, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const commentsWithUsernames = await Promise.all(
        data.map(async (comment) => {
          const { data: userData } = await supabase
            .from("users")
            .select("username")
            .eq("id", comment.user_id)
            .single();
          return { ...comment, username: userData ? userData.username : "Unknown", fadeOut: false };
        })
      );
      setComments(commentsWithUsernames);
    }
  };

  const fetchUserData = async () => {
    const { data } = await supabase
      .from("users")
      .select("username, profile_picture")
      .eq("id", post.user_id)
      .single();

    if (data) setUserData(data);

    const { data: authData } = await supabase.auth.getUser();
    setCurrentUser(authData?.user || null);
  };

  useEffect(() => {
    fetchComments();
    fetchUserData();
  }, [post.id]);

  // Permanent delete
  const handleDeleteComment = async (commentId) => {
    // 1. Optimistic UI Update: Fade out immediately
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, fadeOut: true } : c))
    );

    try {
      // 2. Perform deletion in Supabase
      const { error } = await supabase.from("comments").delete().eq("id", commentId);

      if (error) {
        console.error("Supabase Deletion Error:", error);
        throw error;
      }

      // 3. If successful, remove from state after fade animation
      setTimeout(() => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success("Comment deleted");
      }, 200);

    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(`Failed: ${error.message || "Unknown error"}`);

      // Revert optimistic update if failed
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, fadeOut: false } : c))
      );
    } finally {
      setCommentToDeleteId(null);
    }
  };

  // ✅ Post Deletion Logic
  const confirmDeletePost = async () => {
    const toastId = toast.loading("Deleting post...");
    try {
      // 1. Delete image from storage if it exists
      if (post.image_url) {
        const pathParts = post.image_url.split('/post-images/');
        if (pathParts.length > 1) {
          const storagePath = pathParts[1];
          const { error: storageError } = await supabase.storage
            .from("post-images")
            .remove([storagePath]);

          if (storageError) console.warn("Could not delete image:", storageError);
        }
      }

      // 2. Delete post record
      const { error: dbError } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (dbError) throw dbError;

      toast.success("Post deleted", { id: toastId });
      if (onPostDeleted) onPostDeleted();

    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post", { id: toastId });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const visibleComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-50 overflow-hidden mb-6 transition-shadow hover:shadow-md relative w-full h-[700px] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-[2px]">
            <img
              src={userData.profile_picture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541"}
              alt="Profile"
              className="w-full h-full rounded-full object-cover border-2 border-white"
            />
          </div>
          <div className="ml-3">
            <span className="block text-sm font-bold text-gray-900 leading-none">
              {userData.username}
            </span>
          </div>
        </div>

        {/* Delete Post Button for Owner */}
        {currentUser && currentUser.id === post.user_id && (
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-400 hover:text-red-500 p-1"
            >
              <TrashIcon className="w-5 h-5" />
            </button>

            {/* 🔴 Custom Inline UI Confirmation Box for POST */}
            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-10 animate-in fade-in zoom-in duration-200">
                <p className="text-xs text-gray-700 font-semibold mb-2">Delete this post?</p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmDeletePost}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 rounded transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
                <div className="absolute -top-1 right-2 w-2 h-2 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      {/* {post.image_url && (
        <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden">
          <img
            src={post.image_url}
            alt="Post content"
            className="w-full h-auto max-h-[180px] object-cover"
          />
        </div>
      )} */}

      {/* Image Container - Removed gray space and fixed height */}
      <div className="w-full aspect-[4/5] bg-white flex items-center justify-center overflow-hidden">
        <img
          src={post.image_url}
          alt="Post"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="p-3 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-pink-100 scrollbar-track-transparent">
        {/* Actions */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <LikeButton postId={post.id} />

          <button
            onClick={() => setShowCommentBox(true)}
            className="hover:opacity-70 transition-opacity"
          >
            <ChatBubbleLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Caption & Comments Container */}
        <div className="space-y-4">
          {/* Caption - styled to be distinct */}
          {post.caption && (
            <div className="mb-3 p-2 bg-pink-50/30 rounded-lg border-l-4 border-pink-400">
              <div className="text-[11px]">
                <span className="font-bold text-pink-700 mr-2">{userData.username}</span>
                <span className="text-gray-900 font-medium italic whitespace-pre-wrap">{post.caption}</span>
              </div>
            </div>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.length > 2 && (
                <button
                  className="text-pink-600 text-[10px] font-bold mb-2 hover:text-pink-800 transition-colors"
                  onClick={() => setShowAllComments(!showAllComments)}
                >
                  {showAllComments ? "Show less" : `View all ${comments.length} comments`}
                </button>
              )}

              <div className="space-y-2">
                {visibleComments.map((c) => (
                  <div
                    key={c.id}
                    className={`text-[10px] flex items-start justify-between transition-all duration-300 py-0.5 ${c.fadeOut ? "opacity-0 scale-95" : "opacity-100"
                      }`}
                  >
                    <div className="flex-1">
                      <span className="font-bold text-black mr-1.5">{c.username}</span>
                      <span className="text-gray-700 leading-snug">{c.text}</span>
                    </div>

                    {currentUser && currentUser.id === c.user_id && (
                      <button
                        onClick={() => setCommentToDeleteId(c.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors ml-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Comment Input at Bottom of Card */}
      {showCommentBox && (
        <div className="p-3 border-t border-gray-100 bg-white shrink-0">
          <InlineCommentBox
            postId={post.id}
            onCommentAdded={() => {
              fetchComments();
              setShowAllComments(true);
            }}
          />
        </div>
      )}

      {/* Pink-Themed Modal for Comment Deletion */}
      {commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-pink-50 rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 border border-pink-200">
            <h3 className="text-lg font-bold text-pink-700 mb-2">Delete Comment?</h3>
            <p className="text-pink-900 mb-6 text-sm">
              Are you sure you want to <strong>permanently delete</strong> this comment?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCommentToDeleteId(null)}
                className="px-4 py-2 text-pink-700 font-medium hover:bg-pink-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(commentToDeleteId)}
                className="px-4 py-2 bg-pink-600 text-white font-medium hover:bg-pink-700 rounded-lg shadow-md transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}