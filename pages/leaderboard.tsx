import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient, User } from "@supabase/supabase-js";
import { UserMetadata } from "../types";
// Import Geist Mono explicitly from Next.js font package
import { Geist_Mono } from "next/font/google";

const geist = Geist_Mono({
  subsets: ['latin'],
});

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export default function Leaderboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    {
      user_id: string;
      avg: number;
      highScore: number;
      avatar_url: string;
      user_name: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Fetch leaderboard data
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.from("scores").select(`
        user_id,
        value,
        avatar_url,
        user_name
      `);

      if (!data || error) {
        setIsLoading(false);
        return;
      }

      // Calculate averages
      const userScores: Record<
        string,
        {
          total: number;
          count: number;
          highScore: number;
          avatar_url: string;
          user_name: string;
        }
      > = {};

      for (const row of data) {
        if (!userScores[row.user_id]) {
          userScores[row.user_id] = {
            total: 0,
            count: 0,
            highScore: 0,
            avatar_url: row.avatar_url,
            user_name: row.user_name,
          };
        }
        userScores[row.user_id].total += row.value;
        userScores[row.user_id].count += 1;
        userScores[row.user_id].highScore = Math.max(
          userScores[row.user_id].highScore,
          row.value
        );
      }

      const leaderboardArr = Object.entries(userScores)
        .map(([user_id, { total, count, highScore, avatar_url, user_name }]) => ({
          user_id,
          avg: total / count,
          highScore,
          avatar_url,
          user_name,
        }))
        .sort((a, b) => b.highScore - a.highScore);

      setLeaderboard(leaderboardArr);
      setIsLoading(false);
    };

    fetchLeaderboard();

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#171a1e] text-[#e0dcd4] flex items-center justify-center ${geist.className} antialiased`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#b4bcc4]"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#171a1e] text-[#e0dcd4] relative overflow-hidden ${geist.className} antialiased`}>
      {/* Header */}
      <div className="bg-[#1f2228]/50 backdrop-blur-sm border-b border-[#282c34]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center w-full">
            {/* Left: Empty space */}
            <div></div>

            {/* Middle: Navigation Links */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="w-32 px-4 py-2 bg-[#282c34] hover:bg-[#3d424a] text-[#8b919a] hover:text-[#e0dcd4] rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 border border-[#3d424a] hover:border-[#515761]"
              >
                <span>home</span>
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className="w-32 px-4 py-2 bg-[#3d424a] text-[#e0dcd4] rounded-lg text-sm transition-colors flex items-center justify-center space-x-2 border border-[#b4bcc4]"
              >
                <span>leaderboard</span>
              </button>
              {user && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-32 px-4 py-2 bg-[#282c34] hover:bg-[#3d424a] text-[#8b919a] hover:text-[#e0dcd4] rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 border border-[#3d424a] hover:border-[#515761]"
                >
                  <span>dashboard</span>
                </button>
              )}
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-2 bg-[#282c34] rounded-lg p-2 hover:bg-[#3d424a] border border-[#3d424a] transition-colors">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border border-[#515761]"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-[#282c34] border border-[#b4bcc4] rounded-full flex items-center justify-center">
                      <span className="text-[#e0dcd4] font-bold text-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={signOut}
                    className="text-[#cdacac] hover:text-[#ccc4b4] p-1 rounded hover:bg-[#cdacac]/10 transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="text-[#515761] text-sm">Not signed in</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight text-[#e0dcd4]">
              top <span className="text-[#b4bcc4]">math mains</span>
            </h2>
            <p className="text-[#8b919a] text-sm">
              ranked by highest score • {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-[#1f2228]/50 border border-[#282c34] rounded-2xl p-6 backdrop-blur-sm">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4 opacity-50">📊</div>
                <h3 className="text-xl font-bold text-[#e0dcd4] mb-2">
                  no scores yet
                </h3>
                <p className="text-[#8b919a] text-sm mb-6">
                  be the first to play and set a record!
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-8 py-3 bg-[#282c34] hover:bg-[#3d424a] border-2 border-[#b4bcc4] text-[#e0dcd4] rounded-xl font-bold text-sm transition-all shadow-md"
                >
                  start playing
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((row, index) => (
                  <div
                    key={row.user_id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      index === 0
                        ? "bg-[#2c2b23] border border-[#6d6641]/50"
                        : index === 1
                        ? "bg-[#24262a] border border-[#50545c]/50"
                        : index === 2
                        ? "bg-[#2b2520] border border-[#6b513c]/50"
                        : "bg-[#171a1e]/60 hover:bg-[#171a1e] border border-[#282c34]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-[#ecc157]/10 text-[#ecc157]"
                            : index === 1
                            ? "bg-[#a8b2c1]/10 text-[#a8b2c1]"
                            : index === 2
                            ? "bg-[#dca474]/10 text-[#dca474]"
                            : "bg-[#282c34] text-[#8b919a]"
                        }`}>
                          {index === 0
                            ? "01"
                            : index === 1
                            ? "02"
                            : index === 2
                            ? "03"
                            : String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-sm text-[#e0dcd4]">
                              {row.user_name || ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#b4bcc4]">
                          {row.highScore.toFixed(0)}
                        </div>
                        <div className="text-xs text-[#676d77] uppercase tracking-wider">
                          high score
                        </div>
                      </div>
                      {row.avatar_url ? (
                        <img
                          src={row.avatar_url}
                          alt="Avatar"
                          className="w-10 h-10 rounded-xl object-cover border border-[#3d424a]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#282c34] border border-[#3d424a] flex items-center justify-center">
                          <span className="text-[#8b919a] font-bold text-xs">
                            {row.user_id.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 bg-[#171a1e] text-[#8b919a] px-6 py-2.5 rounded-xl border border-[#282c34] text-xs font-medium">
                    <span>📈</span>
                    <span>
                      {leaderboard.length} total player{leaderboard.length !== 1 ? "s" : ""} • best high score:{" "}
                      <span className="text-[#e0dcd4] font-bold">{leaderboard[0]?.highScore.toFixed(0) || "0"}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
