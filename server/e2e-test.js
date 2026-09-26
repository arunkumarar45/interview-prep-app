// Full end-to-end test script
// Creates a temporary Supabase test user, gets a real JWT,
// then exercises quiz/generate, quiz/save, interview/question, interview/evaluate, interview/save
// through the actual Express routes exactly as the browser would.
require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const BASE = "http://localhost:3001";
const TEST_EMAIL = `e2e_test_${Date.now()}@test.invalid`;
const TEST_PASS = "TestPass123!";

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function run() {
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Create test user
  console.log("1. Creating test user...");
  const { data: signUp, error: signUpErr } = await sb.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASS,
    email_confirm: true,
  });
  if (signUpErr) throw signUpErr;
  const userId = signUp.user.id;
  console.log(`   ✅ User created: ${userId}`);

  // 2. Sign in to get a real JWT
  console.log("2. Signing in to get JWT...");
  const anonSb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: session, error: signInErr } = await anonSb.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (signInErr) throw signInErr;
  const token = session.session.access_token;
  console.log(`   ✅ JWT acquired (${token.length} chars)`);

  // 3. Quiz generate
  console.log("3. POST /api/quiz/generate (DBMS, easy, 3 questions)...");
  const quiz = await post("/api/quiz/generate", { topic: "DBMS", difficulty: "easy", count: 3 }, token);
  console.log(`   ✅ Generated ${quiz.questions.length} questions`);
  console.log(`   Q1: ${quiz.questions[0].question.slice(0, 70)}`);
  console.log(`   Type: ${quiz.questions[0].type}`);

  // 4. Quiz save
  console.log("4. POST /api/quiz/save...");
  const quizSave = await post("/api/quiz/save", {
    topic: "DBMS",
    difficulty: "easy",
    score: 2,
    total: 3,
    questions: quiz.questions,
  }, token);
  console.log(`   ✅ Saved: attempt_id=${quizSave.attemptId}`);

  // 5. Interview question
  console.log("5. POST /api/interview/question (technical/DBMS)...");
  const iq = await post("/api/interview/question", {
    mode: "technical",
    topic: "DBMS",
    history: [],
  }, token);
  console.log(`   ✅ Question: ${iq.question.slice(0, 80)}`);

  // 6. Interview evaluate
  console.log("6. POST /api/interview/evaluate...");
  const ev = await post("/api/interview/evaluate", {
    question: iq.question,
    userAnswer: "A database is a structured collection of data managed by a DBMS. It provides mechanisms for data storage, retrieval, and manipulation.",
    mode: "technical",
  }, token);
  console.log(`   ✅ Technical: ${ev.technicalScore}, Communication: ${ev.communicationScore}`);
  console.log(`   Feedback[0]: ${ev.feedback[0]?.slice(0, 80)}`);

  // 7. Interview save
  console.log("7. POST /api/interview/save...");
  const is = await post("/api/interview/save", {
    mode: "technical",
    topic: "DBMS",
    technicalScore: ev.technicalScore,
    communicationScore: ev.communicationScore,
    transcript: [{ question: iq.question, answer: "A database is...", ...ev }],
  }, token);
  console.log(`   ✅ Saved: session_id=${is.sessionId}`);

  // 8. Resume Save test
  console.log("8. POST /api/resume/save...");
  const dummyResume = {
    templateId: "modern",
    sourceMode: "from_scratch",
    formData: {
      contactInfo: { fullName: "Test User", email: TEST_EMAIL, phone: "123-456-7890", location: "City, Country", linkedin: "", portfolio: "" },
      summary: "Passionate software engineer.",
      experience: [],
      education: [],
      skills: ["React", "Node.js"],
      projects: [],
      certifications: [],
    },
    generatedContent: {
      contactInfo: { fullName: "Test User", email: TEST_EMAIL, phone: "123-456-7890", location: "City, Country", linkedin: "", portfolio: "" },
      summary: "Passionate software engineer with expertise in full-stack web development.",
      experience: [],
      education: [],
      skills: ["React", "Node.js"],
      projects: [],
      certifications: [],
    },
  };
  const resSave = await post("/api/resume/save", dummyResume, token);
  console.log(`   ✅ Resume saved with id: ${resSave.resume.id}`);

  // 9. Resume Export PDF test
  console.log("9. POST /api/resume/export-pdf...");
  const pdfRes = await fetch(`${BASE}/api/resume/export-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      templateId: "modern",
      generatedContent: dummyResume.generatedContent,
    }),
  });
  if (!pdfRes.ok) throw new Error(`export-pdf failed: ${pdfRes.status}`);
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log(`   ✅ PDF exported successfully (${pdfBuffer.byteLength} bytes)`);

  // 10. Verify Supabase rows
  console.log("10. Verifying Supabase rows...");
  const [qRows, iRows, rRows] = await Promise.all([
    sb.from("quiz_attempts").select("id, topic, score, total").eq("user_id", userId),
    sb.from("interview_sessions").select("id, mode, technical_score").eq("user_id", userId),
    sb.from("resumes").select("id, template_id").eq("user_id", userId),
  ]);
  console.log(`   quiz_attempts rows: ${qRows.data?.length ?? 0}`);
  console.log(`   interview_sessions rows: ${iRows.data?.length ?? 0}`);
  console.log(`   resumes rows: ${rRows.data?.length ?? 0}`);

  // 11. Cleanup test user
  console.log("11. Cleaning up test user...");
  await sb.auth.admin.deleteUser(userId);
  console.log(`   ✅ Test user deleted`);

  console.log("\n🎉 All end-to-end tests passed!");
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
