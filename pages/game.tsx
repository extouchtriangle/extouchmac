import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import { Range, OperationConfig, GameConfig, SpeechRecognition } from "../types";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

interface Problem {
  lhs: number;
  rhs: number;
  operation: string;
  answer: number;
}

export default function Game() {
  const router = useRouter();
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [totalProblems, setTotalProblems] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameActive, setGameActive] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastVoiceResult, setLastVoiceResult] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const currentProblemRef = useRef<Problem | null>(null);
  const gameActiveRef = useRef<boolean>(false);
  const gameConfigRef = useRef<GameConfig | null>(null);
  const scoreRef = useRef<number>(0);
  const correctAnswersRef = useRef<number>(0);
  const totalProblemsRef = useRef<number>(0);
  const isListeningRef = useRef<boolean>(false);

  const parseSpokenNumber = (text: string, isInterim: boolean = false): number | null => {
    const normalized = text.toLowerCase()
      .replace(/\b(and|the|a|an)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const directNumber = parseInt(normalized.replace(/[^0-9]/g, ''));
    if (!isNaN(directNumber)) {
      return directNumber;
    }
    
    const numberWords: { [key: string]: number } = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000
    };
    
    if (isInterim) {
      for (const [word, value] of Object.entries(numberWords)) {
        if (normalized.includes(word) || word.startsWith(normalized) || normalized.startsWith(word)) {
          return value;
        }
      }
    } else {
      for (const [word, value] of Object.entries(numberWords)) {
        if (normalized.includes(word)) {
          return value;
        }
      }
    }
    
    return null;
  };

  useEffect(() => {
    currentProblemRef.current = currentProblem;
    gameActiveRef.current = gameActive;
    gameConfigRef.current = gameConfig;
    scoreRef.current = score;
    correctAnswersRef.current = correctAnswers;
    totalProblemsRef.current = totalProblems;
    isListeningRef.current = isListening;
  }, [currentProblem, gameActive, gameConfig, score, correctAnswers, totalProblems, isListening]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (voiceEnabled && gameActiveRef.current) {
          setTimeout(() => {
            if (voiceEnabled && gameActiveRef.current && !isListeningRef.current) {
              try {
                recognition.start();
              } catch (error) {
                console.log('Auto-restart speech recognition error:', error);
              }
            }
          }, 50);
        }
      };
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          
          const spokenNumber = parseSpokenNumber(transcript, !result.isFinal);
          
          if (result.isFinal) {
            setLastVoiceResult(transcript);
            
            console.log('Voice recognition result (FINAL):', {
              transcript,
              spokenNumber,
              currentAnswer: currentProblemRef.current?.answer,
              gameActive: gameActiveRef.current,
              voiceEnabled
            });
          } else {
            setLastVoiceResult(transcript + '...');
            
            console.log('Voice recognition result (INTERIM):', {
              transcript,
              spokenNumber,
              currentAnswer: currentProblemRef.current?.answer
            });
          }
          
          if (spokenNumber !== null && currentProblemRef.current && gameActiveRef.current) {
            if (spokenNumber === currentProblemRef.current.answer) {
              console.log('Correct answer detected via voice!', result.isFinal ? '(FINAL)' : '(INTERIM)');
              setScore(scoreRef.current + 1);
              setCorrectAnswers(correctAnswersRef.current + 1);
              setTotalProblems(totalProblemsRef.current + 1);
              if (gameConfigRef.current) {
                setCurrentProblem(generateProblem(gameConfigRef.current));
              }
              setUserAnswer("");
              return;
            }
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;
    
    if (voiceEnabled && gameActive && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log('Speech recognition already started or error:', error);
      }
    } else if (!voiceEnabled || !gameActive) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.log('Speech recognition stop error:', error);
      }
    }
  }, [voiceEnabled, gameActive, isListening]);

  useEffect(() => {
    if (router.isReady) {
      const config: GameConfig = {
        addition: {
          enabled: router.query.addEnabled === "1",
          range1: {
            min: parseInt(router.query.addMin1 as string) || 2,
            max: parseInt(router.query.addMax1 as string) || 100,
          },
          range2: {
            min: parseInt(router.query.addMin2 as string) || 2,
            max: parseInt(router.query.addMax2 as string) || 100,
          },
        },
        subtraction: {
          enabled: router.query.subEnabled === "1",
          range1: {
            min: parseInt(router.query.subMin as string) || 2,
            max: parseInt(router.query.subMax as string) || 100,
          },
          range2: {
            min: parseInt(router.query.subMin as string) || 2,
            max: parseInt(router.query.subMax as string) || 100,
          },
        },
        multiplication: {
          enabled: router.query.mulEnabled === "1",
          range1: {
            min: parseInt(router.query.mulMin1 as string) || 2,
            max: parseInt(router.query.mulMax1 as string) || 12,
          },
          range2: {
            min: parseInt(router.query.mulMin2 as string) || 2,
            max: parseInt(router.query.mulMax2 as string) || 100,
          },
        },
        division: {
          enabled: router.query.divEnabled === "1",
          range1: {
            min: parseInt(router.query.divMin as string) || 2,
            max: parseInt(router.query.divMax as string) || 12,
          },
          range2: {
            min: parseInt(router.query.divMin2 as string) || 2,
            max: parseInt(router.query.divMax2 as string) || 100,
          },
        },
        duration: parseInt(router.query.duration as string) || 60,
      };
      setGameConfig(config);
      startGame(config, config.duration);
    }
  }, [router.isReady, router.query]);

  function getEnabledOps(config: GameConfig) {
    const ops = [];
    if (config.addition.enabled) ops.push("addition");
    if (config.subtraction.enabled) ops.push("subtraction");
    if (config.multiplication.enabled) ops.push("multiplication");
    if (config.division.enabled) ops.push("division");
    return ops;
  }

  function randomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const generateProblem = (config: GameConfig): Problem => {
    const enabledOps = getEnabledOps(config);
    const opName = enabledOps[Math.floor(Math.random() * enabledOps.length)];
    let lhs, rhs, answer, symbol;

    if (opName === "addition") {
      lhs = randomInRange(
        config.addition.range1.min,
        config.addition.range1.max
      );
      rhs = randomInRange(
        config.addition.range2!.min,
        config.addition.range2!.max
      );
      answer = lhs + rhs;
      symbol = "+";
    } else if (opName === "subtraction") {
      rhs = randomInRange(
        config.subtraction.range1.min,
        config.subtraction.range1.max
      );
      answer = randomInRange(
        config.subtraction.range2.min,
        config.subtraction.range2.max
      );
      lhs = rhs + answer;
      symbol = "−";
    } else if (opName === "multiplication") {
      lhs = randomInRange(
        config.multiplication.range1.min,
        config.multiplication.range1.max
      );
      rhs = randomInRange(
        config.multiplication.range2!.min,
        config.multiplication.range2!.max
      );
      answer = lhs * rhs;
      symbol = "×";
    } else if (opName === "division") {
      rhs = randomInRange(
        config.division.range1.min,
        config.division.range1.max
      );
      answer = randomInRange(
        config.division.range2!.min,
        config.division.range2!.max
      );
      lhs = rhs * answer;
      symbol = "÷";
    }
    return { lhs, rhs, operation: symbol, answer } as Problem;
  };

  const startGame = (config: GameConfig, duration: number) => {
    setGameActive(true);
    setScore(0);
    setTotalProblems(0);
    setCorrectAnswers(0);
    setTimeLeft(duration);
    setCurrentProblem(generateProblem(config));
    setUserAnswer("");
  };

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) return;
    
    if (voiceEnabled) {
      recognitionRef.current.stop();
      setVoiceEnabled(false);
      setIsListening(false);
    } else {
      setVoiceEnabled(true);
      if (gameActive) {
        recognitionRef.current.start();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem || !gameActive || !gameConfig) return;

    const answer = parseInt(userAnswer);
    if (answer === currentProblem.answer) {
      setScore(score + 1);
      setCorrectAnswers(correctAnswers + 1);
    }

    setTotalProblems(totalProblems + 1);
    setCurrentProblem(generateProblem(gameConfig));
    setUserAnswer("");
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^0-9]/g, "");
    setUserAnswer(newValue);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && gameActive) {
      setGameActive(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setVoiceEnabled(false);
      setIsListening(false);
      (async () => {
        console.log("Saving score to Supabase");
        const supabase = createSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log("user", user?.user_metadata?.avatar_url, score);
        if (user) {
          await supabase.from("scores").insert([
            {
              user_id: user.id,
              value: score,
              avatar_url: user.user_metadata?.avatar_url,
            },
          ]);
        }
      })();
    }
    return () => clearTimeout(timer);
  }, [gameActive, timeLeft]);

  useEffect(() => {
    if (!currentProblem || !gameActive || !gameConfig) return;
    const answer = parseInt(userAnswer);
    if (answer === currentProblem.answer) {
      setScore((s) => s + 1);
      setCorrectAnswers((c) => c + 1);
      setTotalProblems((t) => t + 1);
      setCurrentProblem(generateProblem(gameConfig));
      setUserAnswer("");
    }
  }, [userAnswer]);

  if (!gameConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${geist.className}`}>
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
                className="w-32 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-slate-600 hover:border-slate-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Dashboard</span>
              </button>
            </div>
            
            {/* Right: Empty space */}
            <div></div>
          </div>
        </div>
      </div>

      {/* Game Stats - separate section below header */}
      {gameActive && (
        <div className="border-slate-700">
          <div className="container mx-auto px-6 py-6">
            <div className="flex justify-center items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 transition-colors">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-red-400">Time: {timeLeft}s</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 transition-colors">
                <span className="text-sm font-semibold text-blue-400">Score: {score}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div className="container mx-auto px-6 py-8 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="max-w-2xl w-full">
          {/* Voice controls */}
          {/* <div className="mb-8 animate-slide-in-down">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleVoiceRecognition}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 animate-zoom-in hover-bounce ${
                  voiceEnabled
                    ? isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse-glow'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                style={{ animationDelay: "0.2s" }}
              >
                <span className="text-lg animate-pulse">
                  {voiceEnabled ? (isListening ? '🎤' : '🔇') : '🎤'}
                </span>
                <span>{voiceEnabled ? (isListening ? 'Listening...' : 'Voice On') : 'Voice Off'}</span>
              </button>
              
              {lastVoiceResult && (
                <div className="bg-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 animate-bounce-in animate-shake">
                  Heard: "{lastVoiceResult}"
                </div>
              )}
            </div>
            
            <p className="text-center text-slate-400 text-sm mt-2 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {voiceEnabled 
                ? "Speak the answer to automatically advance!" 
                : "Click the microphone to enable voice recognition"
              }
            </p>
          </div> */}

          {/* Game content */}
          {gameActive && currentProblem ? (
            <div className="text-center">
              {/* Problem display */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 mb-8 border border-slate-700">
                <div className="text-6xl md:text-7xl font-bold mb-8">
                  <span className="text-blue-400">{currentProblem.lhs}</span>
                  <span className="mx-6 text-slate-300">{currentProblem.operation}</span>
                  <span className="text-purple-400">{currentProblem.rhs}</span>
                  <span className="mx-6 text-slate-300">=</span>
                  <span className="text-cyan-400">?</span>
                </div>
              </div>

              {/* Answer input */}
              <form onSubmit={handleSubmit} className="mb-8">
                <div className="relative max-w-md mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={userAnswer}
                    onChange={handleAnswerChange}
                    className={`w-full text-center text-4xl font-bold py-6 px-8 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${geistMono.className}`}
                    autoFocus
                    placeholder="?"
                  />
                </div>
              </form>

              {/* Progress indicator */}
              <div className="flex justify-center space-x-2 animate-slide-in-up" style={{ animationDelay: "1.6s" }}>
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < Math.min(score, 5) ? 'bg-green-500 animate-pulse-glow' : 'bg-slate-700'
                    }`}
                    style={{ animationDelay: `${1.8 + i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Game over screen */
            <div className="text-center">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700 animate-bounce-in">
                <div className="text-6xl mb-6 animate-float-up">🎉</div>
                <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
                  Game Over!
                </h2>
                <div className="text-6xl font-bold text-cyan-400 mb-8 animate-zoom-in animate-pulse-glow" style={{ animationDelay: "0.4s" }}>
                  {score}
                </div>
                <p className="text-slate-400 text-lg mb-8 animate-slide-in-up" style={{ animationDelay: "0.6s" }}>
                  Great job! You completed {totalProblems} problems.
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 animate-zoom-in hover-bounce"
                  style={{ animationDelay: "0.8s" }}
                >
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">🎮</span>
                    Play Again
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
