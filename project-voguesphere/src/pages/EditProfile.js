

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";


// import { UserCircleIcon } from "@heroicons/react/24/solid";

const EditProfile = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    bio: "",
    profilePicture: null,
    preview: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const { data: { user }, error: userError } = await supabase.auth.getUser();

  //     if (userError || !user) {
  //       console.log("Error fetching user:", userError);
  //       setLoading(false);
  //       return;
  //     }

  //     const { data, error } = await supabase
  //       .from("users")
  //       .select("*")
  //       .eq("id", user.id)
  //       .single();

  //     if (error) {
  //       console.log("Error fetching user data:", error);
  //       setLoading(false);
  //       return;
  //     }

  //     setFormData({
  //       name: data.name || "",
  //       username: data.username || "",
  //       email: user.email || "",
  //       bio: data.bio || "",
  //       profilePicture: data.profile_picture || null,
  //       preview: null,
  //     });

  //     setLoading(false);
  //   };

  //   fetchData();
  // }, []);


  useEffect(() => {
  const fetchUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("User not logged in");
      setLoading(false);
      return;
    }

    // Fetch custom profile data from "users" table if needed
    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setFormData({
      name: userRow?.name || user.user_metadata?.full_name || "",  // <--- Auth name
      username: userRow?.username || "",
      email: user.email,
      bio: userRow?.bio || "",
      profilePicture: userRow?.profile_picture || null,
      preview: null,
    });

    setLoading(false);
  };

  fetchUser();
}, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setFormData({ ...formData, profilePicture: file, preview });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("User not found or error:", userError);
      setSaving(false);
      return;
    }

    let profilePictureUrl = formData.profilePicture;

    if (formData.profilePicture instanceof File) {
      const filePath = `profile_pictures/${user.id}-${formData.profilePicture.name}`;
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, formData.profilePicture, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        profilePictureUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name: formData.name,
      username: formData.username,
      email: user.email,
      bio: formData.bio,
      profile_picture: profilePictureUrl || null,
    });

    if (error) {
      console.error("Error inserting/updating user:", error);
      setSaving(false);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      email: user.email,
      profilePicture: profilePictureUrl,
    }));

    setSuccessMsg("Profile updated successfully!");
    setSaving(false);
    navigate("/UserProfile"); // ✅ Redirect to user profile
  };

  return (
    <div className="bg-gradient-to-br from-pink-100 via-white to-pink-50 min-h-screen font-sans pt-32 font-serif">
       <div>  {/* Navbar */}
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
            {/* <li><Link to="/ai-feedback" className="hover:text-pink-700 transition-colors">AI Feedback</Link></li> */}
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
              {/* <li><Link to="/ai-feedback" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li> */}
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

      {/* Page Title */}
      <div className="text-center mt-10">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-2">Edit Your Profile</h2>
        <p className="text-gray-500">Make changes to your account here</p>
      </div>

      {/* Form Container */}
      <div className="mx-auto mt-8 bg-white w-[90%] max-w-2xl p-8 rounded-3xl shadow-lg">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-28 h-28">
            <img
              src={formData.preview || formData.profilePicture || "/images/profile.jpg"}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover border border-gray-300"
            />
            <label className="absolute bottom-0 right-0 bg-white border border-gray-300 p-1 rounded-full cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              ✏️
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">Click to change picture</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Name</label>
            <input
              type="text"
              name="name"
              className="w-full border px-4 py-2 rounded-full placeholder-gray-400"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Username</label>
            <input
              type="text"
              name="username"
              className="w-full border px-4 py-2 rounded-full placeholder-gray-400"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Email</label>
            <input
              type="email"
              name="email"
              readOnly
              className="w-full border px-4 py-2 rounded-full bg-gray-100 text-gray-500 cursor-not-allowed"
              value={formData.email}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Bio</label>
            <textarea
              name="bio"
              rows="3"
              className="w-full border px-4 py-2 rounded-xl placeholder-gray-400"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
  type="button"
  onClick={() => navigate("/UserProfile")} // <-- this triggers navigation
  className="px-4 py-2 text-red-600 border border-red-600 rounded-full hover:bg-red-50"
>
  Cancel
</button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-pink-600 text-white rounded-full hover:bg-pink-500 transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {successMsg && (
            <p className="text-green-600 text-center mt-4">{successMsg}</p>
          )}
        </form>
      </div>

     {/* Footer */}
                   <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 mt-12 text-gray-700">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">
              
              
              {/* Copyright */}
              <p className="text-xs text-gray-500">
                © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
              </p>
            </div>
          </footer>
     
    </div>
  );
};

export default EditProfile;
