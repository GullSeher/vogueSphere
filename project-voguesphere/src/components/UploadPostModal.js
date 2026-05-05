import { useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast from "react-hot-toast";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

function UploadPostModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const fileUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(fileUrl);
    }
  };

  const handleUpload = async () => {
    // ✅ Image is mandatory
    if (!file) {
      toast.error("Please upload an image to share with others!");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Uploading post...");

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "")}`;
    const filePath = `user-uploads/${fileName}`;

    try {
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) throw userError || new Error("User not found");
      const userId = userData.user.id;

      // Insert post record (caption optional)
      const { error: insertError } = await supabase.from("posts").insert([
        {
          caption: caption || null,
          image_url: publicUrl,
          user_id: userId,
        },
      ]);

      if (insertError) throw insertError;

      toast.success("Post uploaded successfully!", { id: toastId });
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload post.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="border-b border-gray-100 p-4 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Create new post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Upload Area */}
          <div className="flex flex-col items-center justify-center">
            {previewUrl ? (
              <div className="relative w-64 h-64 mx-auto rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <PhotoIcon className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Caption Area */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex-shrink-0"></div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... (optional)"
              className="w-full border-none focus:ring-0 text-gray-700 resize-none h-20 p-0 text-sm md:text-base placeholder-gray-400"
              maxLength={2200}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-pink-500 text-white px-6 py-2 rounded-full font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default UploadPostModal;