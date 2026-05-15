import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client function to ensure environment variables are loaded
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createSupabaseClient();

  const { data: notes, error } = await supabase.from("notes").select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ notes, status: "good" });
}
