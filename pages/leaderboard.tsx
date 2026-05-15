import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient, User } from "@supabase/supabase-js";
import { UserMetadata } from "../types";

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
        avatar_url
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
            user_name: ``,
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

  console.log("leaderboard", leaderboard);

  const signOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center w-full">
            {/* Left: Empty space */}
            <div></div>
            
            {/* Middle: Navigation Links */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="w-32 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-slate-600 hover:border-slate-500"
              >
                <span className="text-lg">🏠</span>
                <span>Home</span>
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className="w-32 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-yellow-500"
              >
                <span className="text-lg">🏆</span>
                <span>Leaderboard</span>
              </button>
              {user && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-32 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-slate-600 hover:border-slate-500"
                >
                  <span className="text-lg">📊</span>
                  <span>Dashboard</span>
                </button>
              )}
            </div>
            
            {/* Right: User Profile */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-2 hover:bg-slate-700 transition-colors">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={signOut}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="text-slate-400">Not signed in</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Top Mathletes
            </h2>
            <p className="text-slate-400 text-lg">
              Ranked by highest score • {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  No scores yet
                </h3>
                <p className="text-slate-400 mb-6">
                  Be the first to play and set a record!
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Start Playing
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((row, index) => (
                  <div
                    key={row.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30"
                        : index === 1
                        ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30"
                        : index === 2
                        ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30"
                        : "bg-slate-700/50 hover:bg-slate-700 border border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0
                            ? "bg-yellow-500 text-yellow-900"
                            : index === 1
                            ? "bg-gray-400 text-gray-900"
                            : index === 2
                            ? "bg-orange-500 text-orange-900"
                            : "bg-slate-600 text-slate-300"
                        }`}>
                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : `#${index + 1}`}
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-white">
                              {row.user_name}
                            </p>
                            {/* <p className="text-sm text-slate-400">
                              Avg: {row.avg.toFixed(0)}
                            </p> */}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">
                          {row.highScore.toFixed(0)}
                        </div>
                        <div className="text-sm text-slate-400">
                          high score
                        </div>
                      </div>
                      {row.avatar_url ? (
                        <img
                          src={row.avatar_url}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {row.user_id.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-slate-700/50 text-slate-300 px-6 py-3 rounded-lg border border-slate-600">
                    <span className="text-lg">📈</span>
                    <span className="font-medium">
                      {leaderboard.length} total player{leaderboard.length !== 1 ? "s" : ""} • Best high score:{" "}
                      {leaderboard[0]?.highScore.toFixed(0) || "0"}
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
