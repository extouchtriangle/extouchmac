import React, { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/router";

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

const LineChart = ({ data }: { data: { date: string; score: number }[] }) => {
  if (data.length === 0) return null;

  const maxScore = Math.max(...data.map((d) => d.score));
  const minScore = Math.min(...data.map((d) => d.score));
  const scoreRange = maxScore - minScore || 1;

  const chartWidth = Math.max(600, data.length * 80);
  const chartHeight = 400;
  const padding = 60;
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  // Create the path data for the line
  const pathData = data
    .map((d, i) => {
      const x = padding + (i * graphWidth) / (data.length - 1);
      const y =
        padding +
        graphHeight -
        ((d.score - minScore) / scoreRange) * graphHeight;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Calculate the total path length for animation
  const pathLength = data.reduce((total, d, i) => {
    if (i === 0) return 0;
    const prevX = padding + ((i - 1) * graphWidth) / (data.length - 1);
    const prevY =
      padding +
      graphHeight -
      ((data[i - 1].score - minScore) / scoreRange) * graphHeight;
    const currX = padding + (i * graphWidth) / (data.length - 1);
    const currY =
      padding +
      graphHeight -
      ((d.score - minScore) / scoreRange) * graphHeight;
    const distance = Math.sqrt(
      Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2)
    );
    return total + distance;
  }, 0);

  return (
    <div className="relative h-full overflow-x-auto">
      <svg
        className="w-full h-full min-w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ minWidth: `${chartWidth}px` }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * graphHeight) / 4}
            x2={chartWidth - padding}
            y2={padding + (i * graphHeight) / 4}
            stroke="#374151"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4].map((i) => {
          // Reverse the order: maxScore at top (i=0), minScore at bottom (i=4)
          const scoreValue = maxScore - (scoreRange * i) / 4;
          const yPosition = padding + (i * graphHeight) / 4;
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={yPosition}
                x2={padding - 5}
                y2={yPosition}
                stroke="#6b7280"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={yPosition + 4}
                textAnchor="end"
                className="text-xs fill-slate-400"
              >
                {Math.round(scoreValue)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={chartHeight - padding}
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* Area under the curve */}
        <path
          d={`${pathData} L ${padding + graphWidth} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
          fill="url(#areaGradient)"
        />

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i * graphWidth) / (data.length - 1);
          const y =
            padding +
            graphHeight -
            ((d.score - minScore) / scoreRange) * graphHeight;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#3b82f6"
                stroke="#1e293b"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                className="text-xs fill-slate-300 font-medium"
              >
                {d.score}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding + (i * graphWidth) / (data.length - 1);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={chartHeight - padding}
                x2={x}
                y2={chartHeight - padding + 5}
                stroke="#6b7280"
                strokeWidth="1"
              />
              <text
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-slate-400"
                transform={`rotate(-45 ${x} ${chartHeight - padding + 20})`}
              >
                {d.date}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 10}
          textAnchor="middle"
          className="text-sm fill-slate-300 font-medium"
        >
          Date
        </text>
        <text
          x={10}
          y={chartHeight / 2}
          textAnchor="middle"
          className="text-sm fill-slate-300 font-medium"
          transform={`rotate(-90 10 ${chartHeight / 2})`}
        >
          Score
        </text>
      </svg>
    </div>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) {
        router.push("/");
        return;
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          router.push("/");
        }
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const fetchScores = async () => {
      if (!user) return;

      const supabase = createSupabaseClient();
      try {
        const { data, error } = await supabase
          .from("scores")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching scores:", error);
        } else {
          setScores(data || []);
        }
      } catch (error) {
        console.error("Error fetching scores:", error);
      }
    };

    if (user) {
      fetchScores();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const averageScore =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score.value, 0) / scores.length
      : 0;

  const chartData = scores.map((score) => ({
    date: new Date(score.created_at).toLocaleDateString(),
    score: score.value,
  }));

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
                className="w-32 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-slate-600 hover:border-slate-500"
              >
                <span className="text-lg">🏆</span>
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-32 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-blue-500"
              >
                <span className="text-lg">📊</span>
                <span>Dashboard</span>
              </button>
            </div>
            
            {/* Right: User Profile */}
            <div className="flex items-center space-x-3">
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
                  onClick={() => {
                    const supabase = createSupabaseClient();
                    supabase.auth.signOut();
                    router.push("/");
                  }}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-6 py-8">


        {/* Stats grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-200 animate-slide-in-up hover-bounce group" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium group-hover:animate-shake">Total Games</p>
                <p className="text-3xl font-bold text-blue-400 animate-pulse-glow">{scores.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:animate-morph">
                <span className="text-2xl animate-pulse">🎮</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-green-500/50 transition-all duration-200 animate-slide-in-up hover-bounce group" style={{ animationDelay: "0.8s" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium group-hover:animate-shake">Average Score</p>
                <p className="text-3xl font-bold text-green-400 animate-pulse-glow">{averageScore.toFixed(0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:animate-morph">
                <span className="text-2xl animate-pulse">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-yellow-500/50 transition-all duration-200 animate-slide-in-up hover-bounce group" style={{ animationDelay: "1s" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium group-hover:animate-shake">Best Score</p>
                <p className="text-3xl font-bold text-yellow-400 animate-pulse-glow">
                  {scores.length > 0 ? Math.max(...scores.map((s) => s.value)) : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:animate-morph">
                <span className="text-2xl animate-pulse">🏆</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart section */}
        {scores.length > 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 h-[calc(100vh-20rem)]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              📈 Progress Chart
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </h3>
            <div className="h-[calc(100%-4rem)]">
              <LineChart data={chartData} />
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 h-[calc(100vh-20rem)] flex items-center justify-center">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-slate-400 text-lg mb-6">No games played yet</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
              >
                Start Your First Game
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;

