require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await sb.from("resumes").select("count", { count: "exact", head: true });
  if (error) {
    console.log("Resumes table check:", error.message);
  } else {
    console.log("Resumes table exists! Count:", data);
  }
}

test();
