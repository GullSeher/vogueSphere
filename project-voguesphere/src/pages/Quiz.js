import React, { useState, useEffect } from "react";
import supabase from "../supabase/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";


export default function Quiz({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stage, setStage] = useState("welcome"); // welcome | quiz | submitted
  const [questions, setQuestions] = useState([]);
  const [pathQuestions, setPathQuestions] = useState([]);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  // Reset quiz
 // Reset quiz
const resetQuiz = (goToWelcome = false) => {
  setSelectedAnswers({});
  setShowWarning(false);

  if (goToWelcome) {
    setStage("welcome");
    return;
  }

  // Load first 3 general questions
  const generalQs = questions.slice(0, 3);
  setPathQuestions(generalQs);
  setCurrentQuestionId(generalQs[0]?.id);
  setTotalQuestions(4);

  // Go directly to quiz mode
  setStage("quiz");
};

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("quiz_questions")
        .select(`
          id, question_text, order_index,
          quiz_options:quiz_options_question_id_fkey (
            id, option_text, labels, image_path, next_question_id
          )
        `)
        .order("order_index", { ascending: true });

      if (!error && data) {
        const dataWithImages = data.map((q) => ({
          ...q,
          quiz_options: (q.quiz_options || []).map((opt) => ({
            ...opt,
            public_url: opt.image_path
              ? `https://apuzxvwyfdjzmzxveaib.supabase.co/storage/v1/object/public/quiz_images/${opt.image_path}`
              : null,
          })),
        }));
        setQuestions(dataWithImages);

        if (dataWithImages.length > 0) {
          const generalQs = dataWithImages.slice(0, 3);
          setPathQuestions(generalQs);
          setCurrentQuestionId(generalQs[0].id);
          setTotalQuestions(4);
        }
      }
      setLoading(false);
    };
    fetchQuestions();
  }, []);

  // Select answer
  const handleAnswerSelect = (questionId, optionId, nextQuestionId) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    setShowWarning(false);

    const questionIndex = pathQuestions.findIndex((q) => q.id === questionId);

    // branching after Q3
    if (questionIndex === 2 && nextQuestionId) {
      const nextQs = [];
      let q = questions.find((qq) => qq.id === nextQuestionId);
      while (q) {
        nextQs.push(q);
        if (q.quiz_options?.[0]?.next_question_id) {
          q = questions.find(
            (qq) => qq.id === q.quiz_options[0].next_question_id
          );
        } else {
          q = null;
        }
      }
      setPathQuestions([...pathQuestions.slice(0, 3), ...nextQs]);
      setCurrentQuestionId(nextQuestionId);
      return;
    }

    // Move to next if available
    const nextIndex = questionIndex + 1;
    if (nextIndex < pathQuestions.length) {
      setCurrentQuestionId(pathQuestions[nextIndex].id);
    }
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (Object.keys(selectedAnswers).length < 1) {
      alert("Please attempt at least 1 question before submitting!");
      return;
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const records = Object.entries(selectedAnswers)
      .map(([questionId, optionId]) => {
        const question = questions.find(
          (q) => String(q.id) === String(questionId)
        );
        const option = question?.quiz_options.find(
          (o) => String(o.id) === String(optionId)
        );
        if (!question || !option) return null;
        return {
          user_id: currentUser?.id,
          question_id: question.id,
          selected_option_id: option.id,
          value: JSON.stringify(option.labels ?? null),
        };
      })
      .filter(Boolean);

    const { error } = await supabase
      .from("user_quiz_responses")
      .insert(records)
      .select();

    if (error) {
      console.error("Error saving quiz:", error);
      alert("Error submitting quiz!");
    } else {
      setStage("submitted");
      navigate("/quiz-recommendation");
    }
  };

  // Navbar
  const Navbar = () => (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
      <Link
        to="/"
        className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300"
      >
        VogueSphere
      </Link>

      <ul className="hidden md:flex gap-8 font-medium">
        <li><Link to="/" className="hover:text-pink-700">Home</Link></li>
        <li><Link to="/recommendations" className="hover:text-pink-700">Trendy Fits</Link></li>
        {/* <li><Link to="/upload-match" className="hover:text-pink-700">Upload Match</Link></li> */}
        <li><Link to="/ai-feedback" className="hover:text-pink-700">AI Feedback</Link></li>
        <li><Link to="/community" className="hover:text-pink-700">Community</Link></li>
        <li><Link to="/about-us" className="hover:text-pink-700">About Us</Link></li>
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
          {/* <li><Link to="/upload-match" onClick={() => setMobileMenuOpen(false)}>Upload Match</Link></li> */}
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
  );

  // Welcome Screen
  if (stage === "welcome") {
    return (
      <>
        <Navbar />
        <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-100 text-center px-4">
          {/* Floating shapes */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <motion.div
              className="absolute top-20 left-10 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
              animate={{ y: [0, 30, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-20 right-10 w-52 h-52 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
              animate={{ y: [0, -30, 0] }}
              transition={{ duration: 10, repeat: Infinity }}
            />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 bg-white/60 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-lg p-10 md:p-16 max-w-xl mx-auto"
          >
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4"
            >
              Welcome to <span className="text-pink-500">VogueSphere</span> Style Quiz
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed"
            >
              Discover your personal fashion vibe. Take our quick quiz and unlock style suggestions tailored just for you.
            </motion.p>

            <motion.button
  whileHover={{
    scale: 1.08,
    boxShadow: "0px 8px 20px rgba(236, 72, 153, 0.4)",
  }}
  whileTap={{ scale: 0.96 }}
  onClick={() => {
    if (questions.length > 0) {
      const generalQs = questions.slice(0, 3); // same as initial
      setPathQuestions(generalQs);
      setCurrentQuestionId(generalQs[0].id);
      setTotalQuestions(4);
      setStage("quiz");
    }
  }}
  className="bg-gradient-to-r from-pink-600 via-rose-500 to-pink-400 text-white px-12 py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all duration-300"
>
  Start My Style Journey
</motion.button>

          </motion.div>
        </section>
      </>
    );
  }

  // Submitted Screen
  if (stage === "submitted") {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center px-4">
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            Quiz Submitted Successfully!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for completing the quiz.
          </p>
          <button
            onClick={resetQuiz}
            className="bg-pink-500 text-white px-8 py-3 rounded-full hover:bg-pink-600 transition duration-300"
          >
            Start Again
          </button>
        </div>
      </>
    );
  }

  const currentQuestion = pathQuestions.find((q) => q.id === currentQuestionId);
  const currentIndex = pathQuestions.findIndex((q) => q.id === currentQuestionId);
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  if (!currentQuestion) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          No questions available.
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 mt-28">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center transition-all duration-500">
         {/* Progress Bar */}
<div className="w-full bg-gray-200 rounded-full h-2 mb-6">
  <div
    className={`h-2 rounded-full transition-all duration-500 ${
      Object.keys(selectedAnswers).length > 0 ? "bg-pink-500" : "bg-gray-400"
    }`}
    style={{
      // progress = (number of answered questions / total questions) * 100
      width: Object.keys(selectedAnswers).length > 0
        ? `${(Object.keys(selectedAnswers).length / 4) * 100}%`
        : "0%",
    }}
  ></div>
</div>


          {/* Question Number */}
          <div className="text-lg font-semibold text-pink-600 mb-4 tracking-wide">
            Question {currentIndex + 1} <span className="text-gray-600">of</span> {totalQuestions}
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 leading-snug tracking-wide">
                {currentQuestion.question_text}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentQuestion.quiz_options.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      handleAnswerSelect(
                        currentQuestion.id,
                        option.id,
                        option.next_question_id
                      )
                    }
                    className={`border rounded-lg overflow-hidden flex flex-col items-center justify-center transition-all duration-300 ${
                      selectedAnswers[currentQuestion.id] === option.id
                        ? "border-pink-500 ring-2 ring-pink-300"
                        : "border-gray-300 hover:border-pink-300"
                    }`}
                  >
                    {option.public_url && (
                      <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center mb-4">
                        <img
                          src={option.public_url}
                          alt={option.option_text}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}

                    <span className="py-2 text-center font-medium text-gray-700">
                      {option.option_text}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              disabled={currentIndex === 0}
              onClick={() =>
                setCurrentQuestionId(pathQuestions[currentIndex - 1]?.id)
              }
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                currentIndex === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white shadow-md"
              }`}
            >
              Previous
            </button>

            <button
              onClick={() => {
                if (currentIndex === 2 && !selectedAnswers[pathQuestions[currentIndex]?.id]) {
                  setShowWarning(true);
                  return;
                }
                setCurrentQuestionId(pathQuestions[currentIndex + 1]?.id);
              }}
              disabled={currentIndex === totalQuestions - 1}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                currentIndex === totalQuestions - 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
              }`}
            >
              Next
            </button>
          </div>

          {/* Bottom Buttons */}
          <div className="mt-6 flex justify-center gap-6">
           <button
  onClick={() => resetQuiz(true)}
  className="px-6 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-300 shadow-md"
>
  Cancel
</button>


            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length < 1}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 shadow-md ${
                Object.keys(selectedAnswers).length < 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
            >
              Submit Quiz
            </button>
          </div>

          {showWarning && currentIndex === 2 && !selectedAnswers[currentQuestion.id] && (
            <p className="mt-4 text-red-500 text-sm">
              Attempt this question to see next
            </p>
          )}
        </div>
      </div>
    </>
  );
}
