import { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

export default function LikeButton({ postId }) {
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likers, setLikers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = async () => {
    try {
      const { data: likesData, error } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", postId);

      if (error) throw error;

      setLikesCount(likesData.length);

      if (likesData.length > 0) {
        const userIds = likesData.map((l) => l.user_id);
        const { data: users } = await supabase
          .from("users")
          .select("username")
          .in("id", userIds)
          .limit(3); // Fetch only 3 names for the display string

        if (users) {
          setLikers(users.map((u) => u.username));
        }
      } else {
        setLikers([]);
      }

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: userLike } = await supabase
          .from("likes")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", authData.user.id)
          .maybeSingle();

        setHasLiked(!!userLike);
      }
    } catch (err) {
      console.error("Error fetching likes:", err);
    } finally {
      setLoading(false);
    }
  };

  const [processing, setProcessing] = useState(false);

  const handleLike = async () => {
    if (processing) return; // Prevent rapid multiple clicks

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return alert("Please log in to like posts.");

    const userId = authData.user.id;
    setProcessing(true);

    try {
      if (hasLiked) {
        // --- UNLIKE LOGIC (Instagram style) ---
        setHasLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));

        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // --- LIKE LOGIC ---
        setHasLiked(true);
        setLikesCount((prev) => prev + 1);

        const { error } = await supabase
          .from("likes")
          .insert([{
            post_id: postId,
            user_id: userId,
            created_at: new Date(),
            visited: false
          }]);

        if (error) {
          if (error.code === '23505') { // Already exists
            setHasLiked(true);
          } else {
            throw error;
          }
        }
      }

      // Refresh names list and count from source of truth
      await fetchLikes();

    } catch (err) {
      console.error("Like toggle error:", err);
      // Re-fetch to ensure UI is correct if something went wrong
      fetchLikes();
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, [postId]);

  const getLikesText = () => {
    if (likesCount === 0) return null;

    // Filter out any undefined or empty usernames
    const validNames = likers.filter(name => name && name.trim() !== "");

    if (validNames.length === 0) return `Liked by ${likesCount} ${likesCount === 1 ? 'person' : 'people'}`;

    if (likesCount === 1) return `Liked by ${validNames[0]}`;
    if (likesCount === 2) {
      return validNames.length >= 2
        ? `Liked by ${validNames[0]} and ${validNames[1]}`
        : `Liked by ${validNames[0]} and 1 other`;
    }
    if (likesCount === 3) {
      if (validNames.length >= 3) return `Liked by ${validNames[0]}, ${validNames[1]} and ${validNames[2]}`;
      if (validNames.length === 2) return `Liked by ${validNames[0]}, ${validNames[1]} and 1 other`;
      return `Liked by ${validNames[0]} and 2 others`;
    }

    // For 4 or more likes
    const othersCount = likesCount - validNames.length;
    return `Liked by ${validNames.join(", ")} and ${othersCount} other${othersCount !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col gap-1 items-start">
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className={`focus:outline-none transition-colors duration-200 ${hasLiked ? "text-red-500" : "text-gray-600 hover:text-red-500"
            }`}
        >
          {hasLiked ? <HeartIconSolid className="w-7 h-7" /> : <HeartIcon className="w-7 h-7" />}
        </motion.button>
        {likesCount > 0 && (
          <span className="font-bold text-sm text-gray-900">
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </span>
        )}
      </div>

      {likesCount > 0 && (
        <p className="text-xs text-gray-500 font-medium cursor-default">
          {getLikesText()}
        </p>
      )}
    </div>
  );
}