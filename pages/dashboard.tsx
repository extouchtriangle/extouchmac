import React, { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
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

  // Create the path data for the filled area underneath the line
  const areaData =
    pathData +
    ` L ${padding + graphWidth} ${padding + graphHeight} L ${padding} ${
      padding + graphHeight
    } Z`;

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
      <svg
        width={chartWidth}
        height={chartHeight}
        className="overflow-visible"
        style={{ background: "transparent" }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b4bcc4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b4bcc4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines - base4 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + graphHeight - ratio * graphHeight;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={padding + graphWidth}
              y2={y}
              stroke="#3d424a"
              strokeWidth="0.5"
              opacity="0.4"
            />
          );
        })}

        {/* Shaded Area under the trendline */}
        {data.length > 1 && (
          <path d={areaData} fill="url(#chartGradient)" />
        )}

        {/* Connection Trendline */}
        {data.length > 1 && (
          <path
            d={pathData}
            fill="none"
            stroke="#b4bcc4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Individual Data Point Dots */}
        {data.map((d, i) => {
          const x = padding + (i * graphWidth) / (data.length - 1);
          const y =
            padding +
            graphHeight -
            ((d.score - minScore) / scoreRange) * graphHeight;
          return (
            <g key={i} className="group/dot">
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#b4bcc4"
                stroke="#1f2228"
                strokeWidth="1.5"
                className="transition-all duration-150"
              />
              {/* Tooltip on hover */}
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 pointer-events-none">
                <rect
                  x={x - 24}
                  y={y - 32}
                  width="48"
                  height="22"
                  rx="4"
                  fill="#282c34"
                  stroke="#515761"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 17}
                  textAnchor="middle"
                  fill="#e0dcd4"
                  fontSize="10"
                  fontWeight="bold"
                  style={{ fontFamily: "inherit" }}
                >
                  {d.score}
                </text>
              </g>
            </g>
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => {
          const x = padding + (i * graphWidth) / (data.length - 1);
          return (
            <text
              key={i}
              x={x}
              y={padding + graphHeight + 20}
              textAnchor="middle"
              fill="#676d77"
              fontSize="10"
              style={{ fontFamily: "inherit" }}
            >
              {d.date}
            </text>
          );
        })}

        {/* Y Axis labels */}
        {[0, 0.5, 1].map((ratio) => {
          const val = Math.round(minScore + ratio * scoreRange);
          const y = padding + graphHeight - ratio * graphHeight;
          return (
            <text
              key={ratio}
              x={padding - 12}
              y={y + 4}
              textAnchor="end"
              fill="#8b919a"
              fontSize="10"
              style={{ fontFamily: "inherit" }}
            >
              {val}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scores, setScores] = useState<{ value: number; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUser(user);

      const { data: scoreData, error } = await supabase
        .from("scores")
        .select("value, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (scoreData && !error) {
        setScores(scoreData);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const signOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#171a1e] text-[#e0dcd4] flex items-center justify-center ${geist.className} antialiased`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#b4bcc4]"></div>
      </div>
    );
  }

  // Calculate high score and global average
  const highScore = scores.length > 0 ? Math.max(...scores.map((s) => s.value)) : 0;
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.value, 0) / scores.length
      : 0;

  // Format historical chart coordinates
  const chartData = scores.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    score: s.value,
  }));

  return (
    <div className={`min-h-screen bg-[#171a1e] text-[#e0dcd4] relative overflow-hidden ${geist.className} antialiased`}>
      {/* Navigation Header */}
      <div className="bg-[#1f2228]/50 backdrop-blur-sm border-b border-[#282c34]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center w-full">
            <div></div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="w-32 px-4 py-2 bg-[#282c34] hover:bg-[#3d424a] text-[#8b919a] hover:text-[#e0dcd4] rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 border border-[#3d424a] hover:border-[#515761]"
              >
                <span>home</span>
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className="w-32 px-4 py-2 bg-[#282c34] hover:bg-[#3d424a] text-[#8b919a] hover:text-[#e0dcd4] rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 border border-[#3d424a] hover:border-[#515761]"
              >
                <span>leaderboard</span>
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-32 px-4 py-2 bg-[#3d424a] text-[#e0dcd4] rounded-lg text-sm transition-colors flex items-center justify-center space-x-2 border border-[#b4bcc4]"
              >
                <span>dashboard</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-2 bg-[#282c34] rounded-lg p-2 border border-[#3d424a]">
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#e0dcd4]">
            performance <span className="text-[#b4bcc4]">dashboard</span>
          </h2>
          <p className="text-[#8b919a] text-sm mt-1">
            yay, stats!
          </p>
        </div>

        {/* Numerical KPI Aggregation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#1f2228]/50 border border-[#282c34] rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#676d77] lowercase tracking-wider mb-1">Total Games</p>
              <h3 className="text-4xl font-bold text-[#e0dcd4]">{scores.length}</h3>
            </div>
            <div className="w-12 h-12 bg-[#282c34] border border-[#3d424a] rounded-xl flex items-center justify-center text-xl">
              <span>🧮</span>
            </div>
          </div>

          <div className="bg-[#1f2228]/50 border border-[#282c34] rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#676d77] lowercase tracking-wider mb-1">Average Score</p>
              <h3 className="text-4xl font-bold text-[#b4bcc4]">{avgScore.toFixed(1)}</h3>
            </div>
            <div className="w-12 h-12 bg-[#282c34] border border-[#3d424a] rounded-xl flex items-center justify-center text-xl">
              <span>📊</span>
            </div>
          </div>

          <div className="bg-[#1f2228]/50 border border-[#282c34] rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#676d77] lowercase tracking-wider mb-1">High Score</p>
              <h3 className="text-4xl font-bold text-[#e0dcd4]">{highScore}</h3>
            </div>
            <div className="w-12 h-12 bg-[#282c34] border border-[#3d424a] rounded-xl flex items-center justify-center text-xl">
              <span>🏆</span>
            </div>
          </div>
        </div>

        {/* Historical Progress Chart Block */}
        {scores.length > 0 ? (
          <div className="bg-[#1f2228]/50 border border-[#282c34] rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-[#e0dcd4] mb-6 flex items-center gap-2 lowercase tracking-wider">
              <span>📈</span> progress chart
            </h3>
            <div className="w-full">
              <LineChart data={chartData} />
            </div>
          </div>
        ) : (
          <div className="bg-[#1f2228]/30 border border-[#282c34] rounded-2xl p-12 text-center max-w-xl mx-auto">
            <div className="text-5xl mb-4 opacity-40">🎯</div>
            <h4 className="text-lg font-bold text-[#e0dcd4] mb-2">no games tracked yet</h4>
            <p className="text-[#8b919a] text-sm mb-6">finish at least one game to see the graph</p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-[#282c34] hover:bg-[#3d424a] border-2 border-[#b4bcc4] text-[#e0dcd4] rounded-xl font-bold text-sm transition-all"
            >
              homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
