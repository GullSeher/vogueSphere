import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import CommentModal from "../components/InlineCommentBox.js";

function PostDetails() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [openCommentModal, setOpenCommentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPostAndComments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError || !postData) throw postError || new Error("Post not found");

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      setPost(postData);
      setComments(commentsData);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading the post or comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!post) return <div className="p-6 text-red-500">Post not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Post Image */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        <img
          src={post.image_url}
          alt="Post"
          className="w-full max-h-[500px] object-cover"
        />
      </div>

      {/* Post Caption */}
      <h2 className="text-3xl font-bold text-gray-800 mt-6 font-serif">
        {post.caption}
      </h2>

      {/* Comments Section */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">💬 Comments</h3>
          <button
            onClick={() => setOpenCommentModal(true)}
            className="bg-pink-500 text-white px-5 py-2 rounded-lg hover:bg-pink-600 transition-all"
          >
            Add Comment
          </button>
        </div>

        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="border border-gray-200 p-4 rounded-xl bg-gray-50 shadow-sm"
              >
                <p className="text-gray-700 text-sm">{comment.text}</p>
                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                  <span>👤 {comment.username}</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No comments yet. Be the first to add one!</p>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {openCommentModal && (
        <CommentModal
          postId={postId}
          onClose={() => {
            setOpenCommentModal(false);
            fetchPostAndComments(); // Refresh after comment
          }}
        />
      )}
    </div>
  );
}

export default PostDetails;