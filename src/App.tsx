import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  ArrowUp, 
  MessageSquarePlus, 
  Trash2, 
  Menu, 
  X, 
  Sparkles, 
  ChevronRight, 
  Send, 
  Settings, 
  Download, 
  Github, 
  ArrowUpDown, 
  AlertCircle,
  Sun,
  Moon,
  User,
  LogIn,
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  LogOut
} from "lucide-react";
import { Message, ChatThread, LLMModel } from "./types";
import { sendChatRequest, FREE_MODELS } from "./utils/openRouter";
import ChatMessage from "./components/ChatMessage";
import ModelSelector from "./components/ModelSelector";

// Client-side Firebase Imports
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup 
} from "firebase/auth";
import { auth, googleProvider } from "./lib/firebase";
import { 
  fetchUserThreads, 
  saveThreadMeta, 
  saveChatMessage, 
  deleteThreadFromFirestore 
} from "./lib/threadService";

const QUICK_STARTERS = [
  { label: "Summarize a concept", prompt: "Explain the difference between supervised and unsupervised learning in simple details." },
  { label: "Write a utility script", prompt: "Write a high-performance Python script that takes a list of URLs and checks their HTTP status code." },
  { label: "Draft an announcement", prompt: "Draft a modern LinkedIn post announcing ChatBuddy, a browser-based, multi-LLM workspace with automatic fail-safe fallbacks." },
  { label: "Refactor a function", prompt: "Refactor this Javascript map loop to use clean, modern ES6 async reductions with flawless try-catch handling." }
];

export default function App() {
  // Theme configuration state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("chatbuddy_theme") as "light" | "dark") || "light";
  });


  useEffect(() => {
    localStorage.setItem("chatbuddy_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  
  // Authenticated user state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Authentication Modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalLoading, setAuthModalLoading] = useState(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);

  // General state
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(FREE_MODELS[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-close sidebar on mobile view initial load
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(true);
      if (currentUser) {
        // Hydrate Chat History from Firestore
        try {
          const cloudThreads = await fetchUserThreads(currentUser.uid);
          setThreads(cloudThreads);
          if (cloudThreads.length > 0) {
            setActiveThreadId(cloudThreads[0].id);
          } else {
            setActiveThreadId(null);
          }
        } catch (err: any) {
          console.error("Cloud Threads fetch error:", err);
          setGlobalError("Unable to load cloud thread history. Retrying in local mode.");
        }
      } else {
        // Fallback or retrieve Guest Threads from localStorage
        const saved = localStorage.getItem("chatbuddy_threads2");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const localHydrated = parsed.map((t: any) => ({
              ...t,
              created_at: new Date(t.created_at),
              messages: t.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }))
            }));
            setThreads(localHydrated);
            if (localHydrated.length > 0) {
              setActiveThreadId(localHydrated[0].id);
            } else {
              setActiveThreadId(null);
            }
          } catch (err) {
            console.error("Local storage threads parse failure:", err);
            setThreads([]);
            setActiveThreadId(null);
          }
        } else {
          setThreads([]);
          setActiveThreadId(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Guest threads history to localStorage
  useEffect(() => {
    if (!user && !authLoading) {
      localStorage.setItem("chatbuddy_threads2", JSON.stringify(threads));
    }
  }, [threads, user, authLoading]);

  // Get active thread details
  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Auto-scroll inside chat lists
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages, isGenerating]);

  // Handle Dynamic Textarea Height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(220, textareaRef.current.scrollHeight)}px`;
    }
  }, [inputVal]);

  // Collapses Sidebar on mobile screens
  const triggerSidebarCollapseIfMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  // New Chat Sequence
  const handleNewChat = () => {
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      title: "New Conversation",
      messages: [],
      created_at: new Date(),
    };
    
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setInputVal("");
    setGlobalError(null);
    
    // Automatically collapse sidebar on selections
    triggerSidebarCollapseIfMobile();

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete Thread
  const handleDeleteThread = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filter locally
    setThreads((prev) => prev.filter((t) => t.id !== idToDelete));
    if (activeThreadId === idToDelete) {
      const remaining = threads.filter((t) => t.id !== idToDelete);
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
      } else {
        setActiveThreadId(null);
      }
    }

    // Filter cloud database if authenticated
    if (user) {
      try {
        await deleteThreadFromFirestore(user.uid, idToDelete);
      } catch (err: any) {
        console.error("Firestore delete error:", err);
      }
    }
  };

  // Handle Quick Starters clicks
  const handleQuickClick = (prompt: string) => {
    setInputVal(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Submission Pipeline
  const handleFormSubmission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isGenerating) return;

    setGlobalError(null);
    const userPrompt = inputVal;
    setInputVal(""); // Clear prompt box
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Capture or create active thread
    let currentThreadId = activeThreadId;
    let currentThread = activeThread;
    const threadCreatedAt = new Date();

    if (!currentThreadId || !currentThread) {
      const newThread: ChatThread = {
        id: `thread-${Date.now()}`,
        title: userPrompt.length > 30 ? `${userPrompt.substring(0, 30)}...` : userPrompt,
        messages: [],
        created_at: threadCreatedAt,
      };
      currentThreadId = newThread.id;
      currentThread = newThread;
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
    }

    // Assign standard prompt message
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: userPrompt,
      timestamp: new Date()
    };

    // Calculate dynamic thread title update
    const finalTitle = currentThread.title === "New Conversation" 
      ? (userPrompt.length > 25 ? `${userPrompt.slice(0, 25)}...` : userPrompt)
      : currentThread.title;

    // Save Thread Meta on Cloud
    if (user) {
      try {
        await saveThreadMeta(user.uid, currentThreadId, finalTitle, threadCreatedAt);
        await saveChatMessage(user.uid, currentThreadId, userMsg);
      } catch (dbErr: any) {
        console.error("Firestore thread metadata update error:", dbErr);
      }
    }

    // Update active state in-place locally
    setThreads((prev) => 
      prev.map((t) => {
        if (t.id === currentThreadId) {
          return {
            ...t,
            title: finalTitle,
            messages: [...t.messages, userMsg]
          };
        }
        return t;
      })
    );

    // AI Placeholder response block (streaming typed state)
    const aiMsgId = `msg-${Date.now()}-ai`;
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "Processing response...",
      timestamp: new Date(),
      modelUsed: selectedModel.id,
      isStreaming: true
    };

    if (user) {
      try {
        await saveChatMessage(user.uid, currentThreadId, aiMsgPlaceholder);
      } catch (dbErr: any) {
        console.error("Firestore placeholder save error:", dbErr);
      }
    }

    setThreads((prev) => 
      prev.map((t) => {
        if (t.id === currentThreadId) {
          return { ...t, messages: [...t.messages, aiMsgPlaceholder] };
        }
        return t;
      })
    );

    setIsGenerating(true);

    try {
      // Package messages for request context (omit pending helper roles)
      const targetHistory = [...(currentThread?.messages || []), userMsg];
      const res = await sendChatRequest(targetHistory, selectedModel.id);

      const updatedAiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: res.content,
        timestamp: new Date(),
        modelUsed: res.modelUsed,
        fallbacked: res.fallbacked,
        originalModel: res.originalModel,
        isStreaming: true // triggers client writing effect
      };

      if (user) {
        try {
          await saveChatMessage(user.uid, currentThreadId, updatedAiMsg);
        } catch (dbErr: any) {
          console.error("Firestore final AI answer save error:", dbErr);
        }
      }

      // Settle response values
      setThreads((prev) => 
        prev.map((t) => {
          if (t.id === currentThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) => {
                if (m.id === aiMsgId) {
                  return updatedAiMsg;
                }
                return m;
              })
            };
          }
          return t;
        })
      );

    } catch (err: any) {
      console.error(err);
      
      const errorAiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: err.message || "Failed to generate answer due to provider errors.",
        timestamp: new Date(),
        error: true,
        isStreaming: false
      };

      if (user) {
        try {
          await saveChatMessage(user.uid, currentThreadId, errorAiMsg);
        } catch (dbErr: any) {
          console.error("Firestore error state message save error:", dbErr);
        }
      }

      setThreads((prev) => 
        prev.map((t) => {
          if (t.id === currentThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) => {
                if (m.id === aiMsgId) {
                  return errorAiMsg;
                }
                return m;
              })
            };
          }
          return t;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Settle message streaming flag once typewriter completes typing
  const handleTypingComplete = async (msgId: string) => {
    // Settle locally
    setThreads((prev) => 
      prev.map((t) => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: t.messages.map((m) => {
              if (m.id === msgId) {
                return { ...m, isStreaming: false };
              }
              return m;
            })
          };
        }
        return t;
      })
    );

    // Update cloud message state
    if (user && activeThreadId) {
      const activeMsg = activeThread?.messages.find(m => m.id === msgId);
      if (activeMsg) {
        try {
          await saveChatMessage(user.uid, activeThreadId, {
            ...activeMsg,
            isStreaming: false
          });
        } catch (err: any) {
          console.error("Firestore message streaming update error:", err);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmission();
    }
  };

  // Export Chat Thread logs as JSON
  const handleExportChat = () => {
    if (!activeThread?.messages || activeThread.messages.length === 0) return;
    const blob = new Blob([JSON.stringify(activeThread, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatbuddy-thread-${activeThread.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllChats = async () => {
    if (confirm("Are you sure you want to absolute clear your message logs history?")) {
      const threadIdsToDelete = threads.map(t => t.id);
      
      setThreads([]);
      setActiveThreadId(null);
      setInputVal("");
      setGlobalError(null);

      if (user) {
        try {
          for (const tid of threadIdsToDelete) {
            await deleteThreadFromFirestore(user.uid, tid);
          }
        } catch (err: any) {
          console.error("Error batch deleting Firestore history:", err);
        }
      } else {
        localStorage.removeItem("chatbuddy_threads2");
      }
    }
  };

  // OAuth Google Popup authentication
  const handleGoogleLogin = async () => {
    setAuthModalError(null);
    setAuthModalLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthModalError(`Google Sign-In failed: ${err.message || err}`);
    } finally {
      setAuthModalLoading(false);
    }
  };

  return (
    <div className={`flex h-full w-full overflow-hidden ${theme === "dark" ? "dark bg-[#121110] text-[#fbfaf7]" : "bg-[#fbfaf7] text-[#1d1c1a]"} font-sans antialiased`}>
      
      {/* Mobile Sidebar Backdrop overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#1d1c1a]/15 dark:bg-[#000]/40 backdrop-blur-xs z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Collapsible Side Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 sm:relative shrink-0 border-r border-[#e5e2da] dark:border-[#22211f] bg-[#faf9f4] dark:bg-[#151412] flex flex-col h-full transition-all duration-300 ${
          isSidebarOpen 
            ? "w-64 sm:w-72 translate-x-0 opacity-100" 
            : "w-64 sm:w-0 -translate-x-full sm:translate-x-0 overflow-hidden sm:border-r-0 pointer-events-none opacity-0 sm:opacity-100"
        }`}
      >
        <div className="p-4 border-b border-[#f3f1eb] dark:border-[#201f1d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#8b5cf6]/10 dark:bg-[#8b5cf6]/20 border border-[#8b5cf6]/20 dark:border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6] dark:text-[#a78bfa]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-[#1d1c1a] dark:text-[#fbfaf7]">
              ChatBuddy Hub
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#faf6f0] dark:hover:bg-[#1f1e1c] text-[#8a857c] dark:text-[#9c968c] hover:text-[#1d1c1a] dark:hover:text-[#fbfaf7] transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#d97706]/40 dark:border-[#d97706]/30 bg-[#fbfaf7] dark:bg-[#1f1e1b] hover:bg-[#faf6f0] dark:hover:bg-[#282723] hover:border-[#d97706] text-[#d97706] dark:text-amber-500 text-xs font-semibold tracking-wide transition-all duration-150 shadow-xs cursor-pointer"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#a19c91] dark:text-[#7d786e] h-32">
              <Bot className="h-5 w-5 mb-2 opacity-50 stroke-[1.5]" />
              <p className="text-xs md:text-sm leading-relaxed">No past conversations.</p>
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              return (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setGlobalError(null);
                    // Automatically collapse sidebar on selection
                    triggerSidebarCollapseIfMobile();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveThreadId(thread.id);
                      setGlobalError(null);
                      triggerSidebarCollapseIfMobile();
                    }
                  }}
                  className={`group w-full flex items-center justify-between p-2.5 rounded-xl text-left border text-[13.5px] sm:text-sm transition-all duration-150 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 ${
                    isActive 
                      ? "bg-[#faf6f0] dark:bg-[#1f1e1c] border-amber-200/50 dark:border-amber-900/30 text-[#1d1c1a] dark:text-[#f3f1ed] font-medium" 
                      : "bg-transparent border-transparent hover:bg-[#faf8f4] dark:hover:bg-[#181715] text-[#8a857c] dark:text-[#9c968c] hover:text-[#1d1c1a] dark:hover:text-[#f3f1ed]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-amber-600 dark:bg-amber-500" : "bg-[#c6c2b9] dark:bg-[#4a4740] group-hover:bg-amber-500"}`} />
                    <span className="truncate">{thread.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(thread.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 text-stone-400 dark:text-stone-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Account / Sign In Segment */}
        <div className="p-3 border-t border-[#f3f1eb] dark:border-[#201f1d] bg-[#fcfbf9] dark:bg-[#121110]">
          {authLoading ? (
            <div className="flex items-center justify-center p-2 text-[#8a857c] dark:text-[#9c968c]">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500 mr-2" />
              <span className="text-[10px]">Verifying account details...</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2.5 p-2 bg-[#faf6f0] dark:bg-[#1e1d1b] border border-[#e5e2da] dark:border-[#2b2926] rounded-xl">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User logo"} 
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border border-stone-200 dark:border-stone-700" 
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-amber-600 shrink-0">
                  {user.email ? user.email.substring(0, 2).toUpperCase() : "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#1d1c1a] dark:text-[#f3f1ed] truncate leading-tight">
                  {user.displayName || user.email?.split("@")[0] || "Auth User"}
                </p>
                <p className="text-[9px] text-[#8a857c] dark:text-[#908b82] truncate leading-none mt-0.5">
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-medium transition-colors cursor-pointer"
                title="Log Out Account"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="p-1 px-1.5 bg-white dark:bg-[#181715] border border-dashed border-[#e5e2da] dark:border-[#2b2926] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 py-1">
                <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center border border-[#e5e2da] dark:border-[#2b2926] text-[#8a857c] dark:text-[#a09a8f]">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[#8a857c] dark:text-[#a09a8f] uppercase tracking-wide leading-none">Guest Mode</span>
                  <span className="text-[8px] text-[#a19c91] dark:text-[#6a665e] mt-0.5 leading-none">Not Retaining Cloud History</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setAuthModalError(null);
                  setIsAuthModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#d97706] hover:bg-amber-750 text-white text-[10px] font-semibold tracking-wide shadow-2xs transition-all duration-150 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="p-3 border-t border-[#f3f1eb] dark:border-[#201f1d] bg-[#f8f7f2] dark:bg-[#11100e] space-y-2.5Unique">
          {threads.length > 0 && (
            <button
              onClick={clearAllChats}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#8a857c] dark:text-[#9c968c] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/25 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}

          {/* Embedded theme selector switch */}
          <div className="flex items-center justify-between p-1 bg-white dark:bg-[#1c1b18] border border-[#e5e2da] dark:border-[#2b2926] rounded-xl shadow-2xs">
            <span className="text-[10px] text-[#8a857c] dark:text-[#a09a8f] font-medium pl-2 uppercase tracking-wider font-sans">Theme</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${theme === "light" ? "bg-[#faf9f4] border border-[#e5e2da] text-[#d97706] shadow-2xs" : "text-[#a19c91] hover:text-[#1d1c1a]"}`}
                title="Use Light Theme"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${theme === "dark" ? "bg-stone-800 border border-stone-700 text-amber-500 shadow-2xs" : "text-[#a19c91] hover:text-[#fbfaf7]"}`}
                title="Use Dark Theme"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#a19c91] dark:text-[#706c64] font-mono pt-1">
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" /> ChatBuddy v1.0
            </span>
            <a 
              href="https://github.com" 
              target="_blank" 
              className="hover:text-[#1d1c1a] dark:hover:text-[#f3f1ed] flex items-center gap-1"
              rel="noreferrer"
            >
              <Github className="h-3 w-3" /> Hostable
            </a>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header toolbar */}
        <header className="h-14 border-b border-[#e5e2da] dark:border-[#201f1d] px-4 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#181715] shadow-xs z-20 transition-colors duration-150">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-[#faf6f0] dark:hover:bg-[#201f1d] text-[#1d1c1a] dark:text-[#f3f1ed] border border-[#e5e2da] dark:border-[#201f1d] transition-all cursor-pointer mr-1"
                title="Open Sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            
            {/* Show tiny active title when chat has started */}
            {(activeThread && activeThread.messages.length > 0) && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-250">
                <div className="h-5 w-5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-500">
                  <Bot className="h-3 w-3" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xs text-[#1d1c1a] dark:text-[#f3f1ed]">
                    ChatBuddy
                  </h2>
                  <p className="text-[10px] text-[#8a857c] dark:text-[#a09a8f] font-mono">
                    using {selectedModel.name.split(" ")[0]}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Export conversation */}
            {(activeThread && activeThread.messages.length > 0) && (
              <button
                onClick={handleExportChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#e5e2da] dark:border-[#201f1d] rounded-xl bg-white dark:bg-[#1f1e1c] hover:bg-[#faf9f4] dark:hover:bg-[#282724] text-[11px] text-[#5c5954] dark:text-[#c4c1b9] cursor-pointer transition-colors"
                title="Export entire thread details as JSON log file"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export Thread</span>
              </button>
            )}

            {/* Quick-toggle Theme Button on header */}
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className="p-1.5 rounded-xl border border-[#e5e2da] dark:border-[#201f1d] bg-white dark:bg-[#1f1e1c] hover:bg-[#faf9f4] dark:hover:bg-[#282724] text-[#5c5954] dark:text-[#c4c1b9] transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            
            <span className="text-[10px] font-mono font-medium rounded-full bg-[#f3f1eb] dark:bg-[#201f1d] px-2.5 py-1 text-[#8a857c] dark:text-[#a09a8f] border border-[#e5e2da] dark:border-[#201f1d] hidden sm:inline-block">
              Cloud Database Active
            </span>
          </div>
        </header>

        {/* Global Exception Alert Banner */}
        {globalError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 py-2.5 px-4 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 pr-4">
              <span className="font-semibold">Setup Notice:</span> {globalError}
            </div>
            <button 
              onClick={() => setGlobalError(null)}
              className="p-0.5 text-rose-400 dark:text-rose-500 hover:text-rose-700 dark:hover:text-[#fbfaf7] rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dynamic Chat Flow Panel */}
        <div 
          id="chat-scroll-container"
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar bg-radial-gradient from-white to-[#fbfaf7] dark:from-[#181715] dark:to-[#121110] transition-colors duration-150"
        >
          {(!activeThread || activeThread.messages.length === 0) ? (
            /* CENTER STATE - Vertically and Horizontally centered Title, Tagline and Starter Panel */
            <div className="min-h-[70%] max-w-xl mx-auto flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-x-0 -top-4 mx-auto w-24 h-24 bg-[#8b5cf6]/5 dark:bg-[#8b5cf6]/10 rounded-full filter blur-xl animate-pulse-slow" />
                <div className="h-16 w-16 rounded-2xl bg-[#8b5cf6]/10 dark:bg-[#8b5cf6]/15 border border-[#8b5cf6]/20 dark:border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6] dark:text-[#a78bfa] mx-auto shadow-sm">
                  <Bot className="h-9 w-9 stroke-[1.25]" />
                </div>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#1d1c1a] dark:text-[#fbfaf7] tracking-tight mb-2">
                ChatBuddy
              </h1>
              <p className="font-sans text-xs md:text-sm text-amber-700 dark:text-amber-500 uppercase tracking-widest font-semibold mb-6">
                Your Personal Digital Assistant
              </p>

              <p className="text-sm md:text-base text-[#8a857c] dark:text-[#a09a8f] max-w-sm mb-10 leading-relaxed">
                Connect seamlessly with top OpenRouter free-tier LLMs secure on the cloud. Sign in to sync your conversation histories across devices permanently!
              </p>

              {/* Quick Prompt Starters */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-left">
                {QUICK_STARTERS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickClick(s.prompt)}
                    className="p-3.5 rounded-2xl border border-[#e5e2da] dark:border-[#201f1d] bg-white dark:bg-[#181715] hover:bg-[#faf9f4] dark:hover:bg-[#1e1d1b] hover:border-[#d97706]/50 dark:hover:border-[#d97706]/50 text-left transition-all duration-200 shadow-2xs group cursor-pointer"
                  >
                    <div className="font-semibold text-xs md:text-sm text-[#1d1c1a] dark:text-[#f3f1ed] flex items-center justify-between mb-1.5 text-[#5c5954] dark:text-[#c4c1b9] group-hover:text-[#d97706] dark:group-hover:text-amber-500">
                      <span>{s.label}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" />
                    </div>
                    <p className="text-[11px] md:text-xs text-[#8a857c] dark:text-[#a09a8f] leading-normal line-clamp-2">
                      {s.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT LIST VIEW */
            <div className="space-y-8 max-w-2xl mx-auto pb-24">
              {activeThread.messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  selectedModelName={selectedModel.name}
                  onTypingComplete={handleTypingComplete}
                />
              ))}
              
              {/* Spinner/Generating visualizer state */}
              {isGenerating && (
                <div className="max-w-2xl mx-auto flex items-center gap-3 pl-2 py-4 animate-pulse">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 flex items-center justify-center text-[#d97706] dark:text-amber-500 animate-bounce">
                      <Bot className="h-3.5 w-3.5 shrink-0" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#1d1c1a] dark:text-[#f3f1ed] font-medium uppercase font-display tracking-wider">
                      ChatBuddy is thinking...
                    </span>
                    <span className="text-[9px] text-[#8a857c] dark:text-[#908b82] font-mono leading-none">
                      Requesting {selectedModel.name.split(" ")[0]} via cloud tunnel
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar Section container */}
        <footer className="shrink-0 bg-gradient-to-t from-[#fbfaf7] via-[#fbfaf7]/95 to-transparent dark:from-[#121110] dark:via-[#121110]/95 dark:to-transparent pt-6 pb-6 px-4 z-15 transition-colors duration-150">
          <div className="max-w-2xl mx-auto relative">
            <form 
              onSubmit={handleFormSubmission} 
              className={`relative bg-white dark:bg-[#181715] border rounded-2xl transition-all duration-200 outline-hidden flex flex-col justify-between ${
                isFocused 
                  ? "border-[#d97706] shadow-md ring-1 ring-[#d97706]/20" 
                  : "border-[#e5e2da] dark:border-[#2b2926] shadow-xs"
              }`}
            >
              {/* Autogrowing Text Area */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputVal}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isFocused ? "" : "Ask Chatbuddy.."}
                disabled={isGenerating}
                className="w-full bg-transparent resize-none outline-none py-3.5 pl-4 pr-32 text-sm md:text-base leading-relaxed text-[#1d1c1a] dark:text-[#fbfaf7] placeholder-[#8a857c] dark:placeholder-[#807b73] custom-scrollbar focus:ring-0 focus:outline-none focus:border-0 focus:shadow-none min-h-[46px] select-text"
              />

              {/* Absolute Layout Buttons Group in Bottom Right / Right inline */}
              <div className="absolute right-3.5 bottom-2 flex items-center gap-2">
                {/* Robot Model Selector button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    disabled={isGenerating}
                    className={`h-7.5 w-7.5 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isModelSelectorOpen 
                        ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-[#8b5cf6] dark:text-[#a78bfa]" 
                        : "bg-[#faf9f4] dark:bg-[#1f1e1c] border-[#e5e2da] dark:border-[#2b2926] hover:border-[#8b5cf6] dark:hover:border-[#8b5cf6] hover:text-[#8b5cf6] dark:hover:text-[#a78bfa] text-[#8a857c] dark:text-[#a09a8f]"
                    }`}
                    title="Change Model"
                  >
                    <Bot className="h-4 w-4" />
                  </button>

                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={(model) => setSelectedModel(model)}
                    isOpen={isModelSelectorOpen}
                    onClose={() => setIsModelSelectorOpen(false)}
                  />
                </div>

                {/* Submit Circle Up Arrow icon */}
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isGenerating}
                  className={`h-7.5 w-7.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    inputVal.trim() && !isGenerating
                      ? "bg-[#d97706] text-white hover:bg-amber-700 shadow-xs"
                      : "bg-[#f3f1eb] dark:bg-[#1e1d1b] text-[#c6c2b9] dark:text-[#52504b] cursor-not-allowed border border-[#e5e2da]/20 dark:border-[#2b2926]/20"
                  }`}
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-xs text-[#a19c91] dark:text-[#706c64] tracking-wide">
              Selected LLM: <strong>{selectedModel.name}</strong> • ChatBuddy can make mistakes. Verify critical facts.
            </p>
          </div>
        </footer>

      </main>

      {/* Modern, Clean OTP and OAuth Authentication Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-[#121110]/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#181715] border border-[#e5e2da] dark:border-[#201f1d] shadow-2xl p-6 relative">
            
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8a857c] dark:text-[#908b82] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/25 flex items-center justify-center text-amber-600 dark:text-[#d97706] mx-auto mb-3 border border-amber-500/20">
                <LogIn className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-xl text-[#1d1c1a] dark:text-[#fbfaf7] tracking-tight">
                Chat Buddy
              </h3>
              <p className="text-xs text-[#8a857c] dark:text-[#a09a8f] font-medium mt-0.5">
                Your Personal Digital Assistant
              </p>
              <p className="text-[11px] text-[#8a857c]/80 dark:text-[#9a958b]/80 mt-2.5">
                Log in to save your conversation history and sync securely.
              </p>
            </div>

            {authModalError && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 p-3 rounded-xl flex items-start gap-2.5 text-[11px]">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="flex-1">{authModalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={authModalLoading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[#e5e2da] dark:border-[#2b2926] bg-white dark:bg-[#1f1e1c] hover:bg-[#faf9f4] dark:hover:bg-[#282725] text-xs font-semibold text-[#1d1c1a] dark:text-[#fbfaf7] shadow-2xs cursor-pointer transition-all duration-150 disabled:opacity-50"
              >
                {authModalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                ) : (
                  <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.415 0-6.195-2.774-6.195-6.195s2.78-6.195 6.195-6.195c1.55 0 2.96.57 4.05 1.51l3.078-3.078C19.3 1.215 15.93 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.82 0 12.24-5.42 12.24-12.24 0-.79-.08-1.57-.22-2.315H12.24z"
                    />
                  </svg>
                )}
                {authModalLoading ? "Connecting Google Account..." : "Continue with Google"}
              </button>

              <div className="text-center text-[10px] text-[#8a857c] dark:text-[#807b73] px-2 leading-relaxed">
                By logging in, you can securely access your chats across devices. We support 256-bit safe state storage synchronized with Firestore.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
