import { useState } from "react";
import supabase from "../supabase/supabaseClient";

export default function InlineCommentBox({ postId, onCommentAdded }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      alert("You must be logged in to comment.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("comments").insert([
      {
        post_id: postId,
        text: comment,
        username: userData.user.user_metadata?.username || userData.user.email.split('@')[0],
        user_id: userData.user.id,
        created_at: new Date(),
        visited: false,
      },
    ]);

    if (insertError) {
      alert("Failed to add comment.");
    } else {
      onCommentAdded();
      setComment("");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleComment} className="flex items-center gap-2">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
        className="flex-grow border-none text-sm focus:ring-0 px-2 py-1 placeholder-gray-500"
        disabled={loading}
      />

      {comment.trim() && (
        <button
          type="submit"
          className="text-pink-500 font-bold text-sm hover:text-pink-700 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          {loading ? "..." : "Post"}
        </button>
      )}
    </form>
  );
}