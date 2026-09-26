# Figma Prompt — Full App UI (All Phases in One Design)

Note: Figma/Figma AI generates visual design and prototype flow only — no working 
backend, no real AI logic, no functional voice. Use this to get a complete clickable 
mockup you can then hand to development (or feed screen-by-screen into a coding tool).

---

## PROMPT TO PASTE INTO FIGMA AI / FIRST DRAFT

```
Design a complete web app called "InterviewPrep AI" — a platform for students to 
practice technical and HR interviews with AI feedback. Design it as a modern, 
clean SaaS product with a confident, focused, student-friendly feel. Use a dark 
navy/indigo primary color with a bright accent (teal or coral) for CTAs, generous 
white space, rounded cards, and clear typography hierarchy. Design for desktop 
web, 1440px width, with all screens in one file organized into labeled sections/frames.

Design the following screens, in this order:

1. LANDING PAGE
   - Hero section: headline about practicing real interviews with AI, subheadline, 
     primary CTA "Start Practicing Free"
   - Section showing the 3 core features: Core Subject Quizzes, Mock Interview Room, 
     Project Analyzer
   - Social proof / stats section (mock numbers: questions practiced, students helped)
   - Footer

2. SIGN UP / LOGIN
   - Simple auth screen, email + password, Google sign-in option
   - Toggle between login and signup

3. DASHBOARD (home after login)
   - Sidebar nav: Dashboard, Quizzes, Interview Room, Project Analyzer, History, Profile
   - Top of page: welcome message, streak/progress indicator
   - "Weak topics" widget — cards showing topics needing practice (e.g. "DBMS: Indexing 
     — 40% accuracy") with a "Practice now" button on each
   - Recent activity feed: recent quizzes and interview sessions with scores
   - Quick-start buttons: "Take a quiz", "Start mock interview", "Analyze my project"

4. QUIZ — UPLOAD/SELECT SCREEN
   - Two options side by side: "Upload your own PDF notes" (drag-and-drop upload box) 
     or "Choose a topic" (grid of topic cards: DBMS, OS, CN, OOP, DSA)
   - Difficulty selector: Easy / Medium / Hard
   - "Generate Quiz" button

5. QUIZ — IN PROGRESS SCREEN
   - Progress bar showing question X of 10
   - Question card with question text
   - Answer area that adapts: multiple choice buttons for MCQ, or a text input for 
     short-answer questions
   - "Next question" button
   - Small topic tag on each question (e.g. "Indexing")

6. QUIZ — RESULTS SCREEN
   - Score summary circle/chart (e.g. 7/10)
   - List of all questions with correct/incorrect indicator, the user's answer, 
     the correct answer, and a short explanation for each
   - "Weak topics identified" callout box
   - CTA: "Practice these in Interview Room"

7. INTERVIEW ROOM — SETUP SCREEN
   - Mode selector: Technical / HR / Project-based (3 large selectable cards)
   - If Technical: topic picker (same topics as quiz)
   - If Project-based: dropdown to select a previously analyzed project
   - Toggle: Voice mode vs Text mode
   - "Start Interview" button

8. INTERVIEW ROOM — LIVE SESSION SCREEN (this is the core screen — make it feel real)
   - Layout resembling a video call interface: an "AI Interviewer" avatar/card on 
     one side speaking the current question (shown as a speech bubble or captions), 
     a mic button in the center for the user to record their voice answer, and a 
     live transcript area showing what's being said
   - Small waveform animation indicator near the mic when recording
   - Timer showing how long the user has been answering
   - "End interview" button, subtle and out of the way
   - Below the main area: small running list of questions asked so far (collapsed)

9. INTERVIEW ROOM — FEEDBACK (per answer, shown after each response)
   - Feedback card: "Technical Accuracy" score bar, "Communication" score bar
   - Bullet list: 2-3 specific improvement points
   - Detected filler word count callout (e.g. "You said 'um' 6 times")
   - "Next question" button to continue the session

10. INTERVIEW ROOM — SESSION SUMMARY (end of session)
    - Overall score breakdown: technical vs communication, shown as two large stat cards
    - Strengths list and improvement areas list, side by side
    - Full transcript accordion (collapsed by default, expandable per question)
    - CTA: "Practice again" and "Try a different topic"

11. PROJECT ANALYZER — UPLOAD SCREEN
    - Two input options: drag-and-drop zip upload, or a text field to paste a 
      GitHub repo URL
    - "Analyze Project" button with a loading state showing steps 
      (e.g. "Reading files... Understanding structure... Generating questions...")

12. PROJECT ANALYZER — RESULTS SCREEN
    - Project summary card: detected tech stack (shown as small tags/pills), 
      file structure overview
    - "How to explain this project" section: the generated 2-minute script, 
      shown in a readable card with a "Practice this script" button
    - "Likely interview questions about your project" — list of 8-10 questions 
      in expandable cards, each with a "Practice this question" button that 
      links to the Interview Room

13. HISTORY / PROGRESS PAGE
    - Line chart showing quiz and interview scores over time
    - Filterable table of past sessions: date, type (quiz/interview), topic, score
    - Topic mastery breakdown: horizontal bar chart per subject (DBMS, OS, CN, etc.)

14. PROFILE / SETTINGS
    - Basic user info, edit profile
    - Preferences: preferred voice/text mode default, difficulty default
    - Account/subscription placeholder section

Use consistent components across all screens: same sidebar nav, same card style, 
same button styles, same color-coded topic tags. Include a component/style guide 
frame at the start showing the color palette, typography scale, button states, 
and card components used throughout.

Make the Interview Room live session screen (#8) the most polished and detailed 
screen since it's the core differentiating feature of the product.
```

---

## Tips for using this in Figma

- If using **Figma AI (First Draft)**: paste the whole prompt in one go — it will generate multiple frames. Review and manually clean up spacing/alignment after, first-draft output usually needs polish.
- If it struggles with a 14-screen prompt in one shot, split it into 3 batches: (1) Landing/Auth/Dashboard, (2) Quiz + Interview Room screens, (3) Project Analyzer + History + Profile — paste each batch as a separate generation into the same file.
- Once you have the design, you can screenshot each frame and feed it to your coding tool (Claude Code/Cursor) with "build this screen in Next.js + Tailwind matching this design" — much more effective than describing UI in text alone.
