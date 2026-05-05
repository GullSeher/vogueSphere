# Title



Vogue Sphere



# Project Description

VogueSphere is a web-based AI fashion platform that helps users to discover personalized outfit recommendations based on their preferences and current fashion trends. Users can receive AI-powered feedback on their looks and connect with a vibrant fashion community.

# Project Objectives

* To provide AI-driven personalized outfit recommendations
* To enhance user styling decisions through picture analysis
* To simplify fashion browsing and outfit selection
* To keep users updated with latest fashion trends and brand collections
* To support product redirection to brand websites or Instagram pages

# Technologies Used

## Frontend

* React JS
* Tailwind CSS
* JavaScript
* Framer Motion

# Backend \& Database

* Supabase
* User Authentication (Login, Signup, Logout)
* Real-time Database
* Image Storage
* Row Level Security (RLS)

### Python (for AI model integration)

* AI \& ML Libraries
* YOLO (You Only Look Once): for image detection \& validation
* CLIP (Contrastive Language–Image Pre-training): for similarity matching between user images and outfit images
* Transformers: used for AI feedback generation, text understanding, and fashion-related advice through the chatbot.
* Selenium: Used to automate browser interactions and load dynamic content from fashion brand websites or social media pages for data extraction(optional future enhancement).
* BeautifulSoup: used for structured web scraping and extracting outfit images or brand information (if API is not available).
* Pillow (PIL) : used for image preprocessing, resizing, cropping, and format handling before passing images to YOLO/CLIP.

# Key Features

* User Authentication (Signup, Login, Logout)
* Fashion Trend Feed (web scraping)
* Product Redirection to Brand Websites
* Style, Color, Body Type \& Climate-Based Filtering
* Picture-Based Outfit Feedback
* Personalized Outfit Recommendation Quiz
* Community Interaction (Likes, Comments \& Shares)
* User Profile



# System Functionality



### User Registration \& Login

The user creates an account or logs into the system using secure authentication.



### Explore Trending Fashion (Trendy Fit Page)

After logging in, the user is redirected to the Trendy Fit page, where clothing items from different brand pages are displayed together on a single screen.

This helps users quickly explore the latest trends across multiple brands.



### Personalized Upload Feature

The user navigates to the Upload Page to get personalized suggestions based on an uploaded picture.



If the user uploads an irrelevant image (dog, scenery, objects), the system shows an error message.



If the picture contains a man, the system shows an error (the current system supports women’s fashion only).



If a valid picture is uploaded, the system displays visually similar outfit inspirations.

### Privacy-Conscious Users – Preference Quiz Option

For users who are not comfortable uploading their pictures, an alternative is provided: a Personalized Style Quiz.



The quiz includes questions about body type, skin tone, and style preferences.



After submitting the quiz, the user receives personalized outfit suggestions based on their responses.



### AI-Based Styling Feedback

Users can upload a picture to receive AI-generated styling advice, including suggestions for: Outfit improvements, Color coordination and Accessory recommendations. Also, Better styling ideas. For additional guidance, users can interact with the integrated fashion chatbot.



### Fashion Community Interaction

VogueSphere includes a dedicated Fashion Community where users can upload their looks.

Other users can: Like posts, Comment on looks and Appreciate or suggest improvements

This creates an engaging, interactive social fashion space.

### User Control \& Management

Users have full control over their activity: They can delete their own posts. They can delete their comments. They can update their profile anytime



# UML Diagrams Included

* Use Case Diagram
* Class Diagram
* Sequence Diagram
* Activity Diagram
* Entity Relationship (ER) Diagram

# Recommendation Approach



VogueSphere uses a content-based filtering approach, ensuring accurate and personalized outfit suggestions based on: User preferences (style, colors, body type), Uploaded picture analysis (future ML integration) , Trending brand posts.

This approach enables recommendations tailored specifically to each user without needing data from other users.



## Future Enhancements



Integration of Machine Learning for advanced outfit analysis



Virtual Try-On system (planned as future work)



Mobile Application (Android/iOS)



# Developed By

* Areej Fatima
* Gull Seher

Final Year Project – Bachelor of Computer Science



# License



This project is developed purely for academic and educational use.

