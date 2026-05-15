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

const defaultConfig = {
  addition: {
    enabled: true,
    range1: { min: 2, max: 100 },
    range2: { min: 2, max: 100 },
  },
  subtraction: {
    enabled: true,
    range1: { min: 2, max: 100 },
    range2: { min: 2, max: 100 },
  },
  multiplication: {
    enabled: true,
    range1: { min: 2, max: 12 },
    range2: { min: 2, max: 100 },
  },
  division: {
    enabled: true,
    range1: { min: 2, max: 12 },
    range2: { min: 2, max: 100 },
  },
  duration: 120,
};

const ScoreHistogram = ({ scores, userScore }: { scores: number[]; userScore: number | null | undefined }) => {
  if (scores.length === 0) return null;

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1; // Avoid division by zero
  const numBins = Math.min(30, Math.max(10, Math.floor(Math.sqrt(scores.length) * 2)));
  const binWidth = range / numBins || 1;

  // Create bins
  const bins: number[] = new Array(numBins).fill(0);
  scores.forEach((score) => {
    const binIndex = Math.min(
      Math.floor((score - minScore) / binWidth),
      numBins - 1
    );
    bins[binIndex]++;
  });

  const maxCount = Math.max(...bins);
  const height = 400;
  const padding = 50;
  const width = 1200; // Base width for calculations

  // Create line path points
  const points: string[] = [];
  bins.forEach((count, index) => {
    const x = padding + ((index / (numBins - 1)) * (width - padding * 2));
    const y = height - padding - ((count / maxCount) * (height - padding * 2));
    points.push(`${x} ${y}`);
  });

  // Create area path (for filled area under line)
  const areaPath = `M ${padding} ${height - padding} ${points.join(' L ')} L ${width - padding} ${height - padding} Z`;

  // Create line path
  const linePath = `M ${points.join(' L ')}`;

  // Find user score position
  const userScoreX = userScore !== null && userScore !== undefined && range > 0
    ? padding + (((userScore - minScore) / range) * (width - padding * 2))
    : null;

  return (
    <div className="w-full">
      <svg width="100%" height={height + 60} className="overflow-visible" viewBox={`0 0 ${width} ${height + 60}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padding - (ratio * (height - padding * 2));
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#334155"
              strokeWidth="0.5"
              opacity="0.3"
            />
          );
        })}

        {/* Filled area under line */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity="0.3"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* User score vertical line */}
        {userScoreX !== null && (
          <line
            x1={userScoreX}
            y1={padding}
            x2={userScoreX}
            y2={height - padding}
            stroke="#60a5fa"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.8"
          />
        )}

        {/* User score dot */}
        {userScoreX !== null && userScore !== null && userScore !== undefined && range > 0 && (
          (() => {
            const userBinIndex = Math.min(
              Math.floor((userScore - minScore) / binWidth),
              numBins - 1
            );
            const userCount = bins[userBinIndex];
            const userY = height - padding - ((userCount / maxCount) * (height - padding * 2));
            return (
              <circle
                cx={userScoreX}
                cy={userY}
                r="4"
                fill="#60a5fa"
                stroke="#1e40af"
                strokeWidth="2"
              />
            );
          })()
        )}

        {/* X-axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#475569"
          strokeWidth="2"
        />

        {/* X-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const score = minScore + (ratio * range);
          const x = padding + (ratio * (width - padding * 2));
          return (
            <text
              key={ratio}
              x={x}
              y={height - padding + 15}
              textAnchor="middle"
              className="text-xs fill-slate-400"
              fontSize="10"
            >
              {Math.round(score)}
            </text>
          );
        })}

        {/* X-axis title */}
        <text
          x={width / 2}
          y={height - padding + 30}
          textAnchor="middle"
          className="text-xs fill-slate-500"
          fontSize="10"
        >
          Score Distribution
        </text>

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio) => {
          const count = Math.round(ratio * maxCount);
          const y = height - padding - (ratio * (height - padding * 2));
          return (
            <text
              key={ratio}
              x={padding - 5}
              y={y + 3}
              textAnchor="end"
              className="text-xs fill-slate-400"
              fontSize="9"
            >
              {count}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<
    {
      user_id: string;
      avg: number;
      highScore: number;
      avatar_url: string;
      user_name: string;
    }[]
  >([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPercentile, setUserPercentile] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseClient();
    
    // Fetch leaderboard data
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.from("scores").select(`
        user_id, 
        value,
        avatar_url
      `);

      if (!data || error) {
        return;
      }

      // Calculate averages and high scores
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

      // Calculate user rank and percentile if logged in
      if (user) {
        const userIndex = leaderboardArr.findIndex((entry) => entry.user_id === user.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
          const percentile = ((leaderboardArr.length - userIndex) / leaderboardArr.length) * 100;
          setUserPercentile(percentile);
        } else {
          setUserRank(null);
          setUserPercentile(null);
        }
      } else {
        setUserRank(null);
        setUserPercentile(null);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const signInWithGoogle = async () => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      console.error("Sign in error:", error);
    }
  };

  const signOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const startGame = () => {
    const params = new URLSearchParams({
      addEnabled: defaultConfig.addition.enabled ? "1" : "0",
      addMin1: defaultConfig.addition.range1.min.toString(),
      addMax1: defaultConfig.addition.range1.max.toString(),
      addMin2: defaultConfig.addition.range2?.min.toString() || "",
      addMax2: defaultConfig.addition.range2?.max.toString() || "",
      subEnabled: defaultConfig.subtraction.enabled ? "1" : "0",
      subMin: defaultConfig.subtraction.range1.min.toString(),
      subMax: defaultConfig.subtraction.range1.max.toString(),
      subMin2: defaultConfig.subtraction.range2?.min.toString() || "",
      subMax2: defaultConfig.subtraction.range2?.max.toString() || "",
      mulEnabled: defaultConfig.multiplication.enabled ? "1" : "0",
      mulMin1: defaultConfig.multiplication.range1.min.toString(),
      mulMax1: defaultConfig.multiplication.range1.max.toString(),
      mulMin2: defaultConfig.multiplication.range2?.min.toString() || "",
      mulMax2: defaultConfig.multiplication.range2?.max.toString() || "",
      divEnabled: defaultConfig.division.enabled ? "1" : "0",
      divMin: defaultConfig.division.range1.min.toString(),
      divMax: defaultConfig.division.range1.max.toString(),
      divMin2: defaultConfig.division.range2?.min.toString() || "",
      divMax2: defaultConfig.division.range2?.max.toString() || "",
      duration: defaultConfig.duration.toString(),
    });
    router.push(`/game?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
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
          <button
            onClick={signInWithGoogle}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-sm text-white transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign in</span>
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 pt-16 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-8">
            <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              DataMac
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-2xl mx-auto">
              Speed & Precision
            </p>
            <button
              onClick={() => router.push("/leaderboard")}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium text-sm text-white transition-colors border border-slate-600 hover:border-slate-500 shadow-sm hover:shadow"
            >
              Leaderboard
            </button>
          </div>

          {/* Benchmark Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="mb-8">
              {/* Histogram */}
              <div className="mb-6">
                <ScoreHistogram scores={leaderboard.map(l => l.highScore)} userScore={user ? leaderboard.find(l => l.user_id === user.id)?.highScore : null} />
              </div>

              {/* User rank info */}
              {user && userRank !== null && userPercentile !== null && (
                <div className="text-center">
                  <p className="text-slate-300 text-sm">
                    You rank <span className="font-semibold text-blue-400">#{userRank}</span> out of {leaderboard.length} players
                    <span className="text-slate-400 mx-2">•</span>
                    Better than <span className="font-semibold text-blue-400">{userPercentile.toFixed(1)}%</span> of players
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start Game Button */}
          <div className="text-center">
            <button
              onClick={startGame}
              className="px-10 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-lg transition-colors shadow-md hover:shadow-lg text-white"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
