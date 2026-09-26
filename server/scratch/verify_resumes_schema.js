require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSchema() {
  const { data, error } = await sb.from("resumes").select("id, template_id, source_mode, form_data, generated_content, created_at, updated_at").limit(1);
  if (error) {
    console.log("Schema error:", error);
  } else {
    console.log("Schema columns verified successfully!", data);
  }
}

testSchema();
