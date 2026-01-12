import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, BookOpen, Clock, Sun, Moon } from 'lucide-react'

interface Question {
  number: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  justification: Record<string, string>;
  domain?: number;
}

interface QuizResult {
  id: string;
  date: string;
  score: number;
  total: number;
  timeSpent: number;
  scaledScore?: number;
  questions: Array<{
    question: Question;
    userAnswer: string;
    isCorrect: boolean;
  }>;
}

function App() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [view, setView] = useState<'home' | 'quiz' | 'result'>('home')
  const [history, setHistory] = useState<QuizResult[]>([])
  const [quizConfig, setQuizConfig] = useState({
    count: 10,
    useTimer: false,
    timerMinutes: 10,
    sessionType: 'training' as 'training' | 'quiz' | 'exam',
    domains: [1, 2, 3, 4]
  })
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [sessionResults, setSessionResults] = useState<QuizResult['questions']>([])
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all')
  const [startTime, setStartTime] = useState<number>(0)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  // Load history & views
  useEffect(() => {
    const saved = localStorage.getItem('cism_history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/questions.json')
        const data = await response.json()
        if (Array.isArray(data)) {
          setAllQuestions(data)
        } else if (data.questions) {
          setAllQuestions(data.questions)
        }
      } catch (e) {
        console.error("Failed to load questions:", e)
      }
    }
    fetchQuestions()
  }, [])

  // Apply theme to body
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  // Timer logic
  useEffect(() => {
    if (view === 'quiz' && quizConfig.useTimer && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => (prev! > 0 ? prev! - 1 : 0)), 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0) {
      handleFinish()
    }
  }, [view, timeLeft, quizConfig.useTimer])

  const startQuiz = () => {
    const viewCounts = JSON.parse(localStorage.getItem('cism_question_counts') || '{}');

    // Helper to pick least seen
    const pickLeastSeen = (arr: Question[], count: number) => {
      return arr
        .sort((a, b) => {
          const countA = viewCounts[a.number] || 0;
          const countB = viewCounts[b.number] || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5; // Randomize within same view tier
        })
        .slice(0, count);
    };

    let shuffled: Question[] = [];

    if (quizConfig.sessionType === 'exam') {
      const counts = { 1: 26, 2: 30, 3: 50, 4: 44 };
      const d1 = allQuestions.filter(q => q.domain === 1);
      const d2 = allQuestions.filter(q => q.domain === 2);
      const d3 = allQuestions.filter(q => q.domain === 3);
      const d4 = allQuestions.filter(q => q.domain === 4);

      shuffled = [
        ...pickLeastSeen(d1, counts[1]),
        ...pickLeastSeen(d2, counts[2]),
        ...pickLeastSeen(d3, counts[3]),
        ...pickLeastSeen(d4, counts[4])
      ].sort(() => Math.random() - 0.5);
    } else {
      let filtered = [...allQuestions]
      if (quizConfig.domains.length > 0) {
        filtered = filtered.filter(q => q.domain && quizConfig.domains.includes(q.domain))
      }
      shuffled = pickLeastSeen(filtered, quizConfig.count);
    }

    setActiveQuestions(shuffled)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setSessionResults([])
    setView('quiz')
    setStartTime(Date.now())
    setIsConfirmed(false)
    if (quizConfig.sessionType === 'exam') {
      setTimeLeft(240 * 60) // 4 Hours
    } else if (quizConfig.useTimer) {
      setTimeLeft(quizConfig.timerMinutes * 60)
    } else {
      setTimeLeft(null)
    }
  }

  const handleSelect = (key: string) => {
    if (isConfirmed) return
    setSelectedAnswer(key)
    // Note: sessionResults update moved to confirmation step
  }

  const recordCurrentResult = () => {
    if (!selectedAnswer) return
    const current = activeQuestions[currentIndex]

    // Update question attempt counts
    const counts = JSON.parse(localStorage.getItem('cism_question_counts') || '{}')
    counts[current.number] = (counts[current.number] || 0) + 1
    localStorage.setItem('cism_question_counts', JSON.stringify(counts))

    setSessionResults(prev => [...prev, {
      question: current,
      userAnswer: selectedAnswer,
      isCorrect: selectedAnswer === current.answer
    }])
  }

  const handleNext = () => {
    if (quizConfig.sessionType !== 'training') recordCurrentResult()

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(i => i + 1)
      setSelectedAnswer(null)
      setIsConfirmed(false)
    } else {
      handleFinish()
    }
  }

  const handleConfirm = () => {
    setIsConfirmed(true)
    recordCurrentResult()
  }

  const calculateScaledScore = (results: QuizResult['questions']) => {
    const weights: Record<number, number> = { 1: 0.17, 2: 0.20, 3: 0.33, 4: 0.30 };
    const domainStats: Record<number, { correct: number; total: number }> = {};

    results.forEach(r => {
      const d = r.question.domain || 1;
      if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0 };
      domainStats[d].total++;
      if (r.isCorrect) domainStats[d].correct++;
    });

    let totalWeight = 0;
    let weightedAccuracy = 0;

    Object.keys(domainStats).forEach(dKey => {
      const d = parseInt(dKey);
      const stats = domainStats[d];
      const accuracy = stats.correct / stats.total;
      weightedAccuracy += accuracy * weights[d];
      totalWeight += weights[d];
    });

    if (totalWeight === 0) return 200;

    // Normalize accuracy based on tested domains
    const normalizedAccuracy = weightedAccuracy / totalWeight;
    // Scale 0-1 to 200-800
    return Math.round(200 + (normalizedAccuracy * 600));
  }

  const handleFinish = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    const score = sessionResults.filter(r => r.isCorrect).length
    const scaledScore = calculateScaledScore(sessionResults)

    const newResult: QuizResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      score,
      total: activeQuestions.length,
      timeSpent,
      scaledScore,
      questions: sessionResults
    }
    const updatedHistory = [newResult, ...history]
    setHistory(updatedHistory)
    localStorage.setItem('cism_history', JSON.stringify(updatedHistory))
    setView('result')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const rs = s % 60
    return `${m}:${rs < 10 ? '0' : ''}${rs}`
  }

  if (allQuestions.length === 0) return <div className="min-h-screen flex items-center justify-center gradient-text text-xl font-bold animate-pulse">Initializing CISM Core...</div>

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-8">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12 px-4 cursor-pointer" onClick={() => setView('home')}>
        <div className="flex items-center gap-3">
          <BookOpen className="text-indigo-400" size={32} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CISM <span className="gradient-text">Mastery</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Domain Knowledge Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
            className="p-2 glass text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setBankOpen(true); }}
            className="p-2 glass text-amber-400 hover:text-amber-300 transition-colors"
            title="Quiz Bank Progress"
          >
            <BookOpen size={20} />
          </button>
          {view === 'quiz' && (
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className={`glass px-4 py-2 flex items-center gap-2 font-mono text-sm ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`}>
                  <Clock size={16} /> {formatTime(timeLeft)}
                </div>
              )}
              <button onClick={handleFinish} className="px-4 py-2 glass bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20">FINISH</button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 transition-all duration-300">
        {view === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass p-10 text-center relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-4">Ready for Certification?</h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto italic text-sm">Configure your session and dive into 1,000 official CISM questions organized by domain.</p>

                <div className="flex flex-col items-center gap-6 mb-10 max-w-xl mx-auto">
                  {/* Row 1: Question Count */}
                  <div className="w-full space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center block">Question Count</label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[5, 10, 20, 50].map(n => (
                        <button key={n} onClick={() => setQuizConfig(c => ({ ...c, count: n }))} className={`px-5 py-2 text-xs font-bold glass transition-all ${quizConfig.count === n ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-white/5'}`}>{n}</button>
                      ))}
                      <div className="flex items-center glass px-3 bg-white/5 border-dashed border-white/10">
                        <input
                          type="number"
                          min="1"
                          max={allQuestions.length}
                          value={quizConfig.count}
                          onChange={(e) => setQuizConfig(c => ({ ...c, count: Math.min(allQuestions.length, Math.max(1, parseInt(e.target.value) || 0)) }))}
                          className="w-12 bg-transparent text-center text-xs font-bold focus:outline-none py-1.5"
                        />
                        <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Qty</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center block">Target Domains</label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[1, 2, 3, 4].map(d => (
                        <button
                          key={d}
                          onClick={() => setQuizConfig(c => ({
                            ...c,
                            domains: c.domains.includes(d)
                              ? c.domains.filter(x => x !== d)
                              : [...c.domains, d]
                          }))}
                          className={`px-4 py-2 text-[10px] font-bold glass transition-all border ${quizConfig.domains.includes(d) ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'text-slate-500 border-white/5 hover:bg-white/5'}`}
                        >
                          DOMAIN {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Timer */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center block">Timer Settings</label>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setQuizConfig(c => ({ ...c, useTimer: !c.useTimer }))} className={`flex-1 px-4 py-2 text-xs font-bold glass flex items-center justify-center gap-2 transition-all ${quizConfig.useTimer ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
                          <Clock size={14} /> {quizConfig.useTimer ? 'Active' : 'Disabled'}
                        </button>
                        {quizConfig.useTimer && (
                          <div className="flex items-center glass px-3 bg-white/5 border-dashed border-white/10">
                            <input
                              type="number"
                              min="1"
                              max="300"
                              value={quizConfig.timerMinutes}
                              onChange={(e) => setQuizConfig(c => ({ ...c, timerMinutes: Math.min(300, Math.max(1, parseInt(e.target.value) || 0)) }))}
                              className="w-10 bg-transparent text-center text-xs font-bold focus:outline-none py-1.5"
                            />
                            <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Min</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Session Type */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center block">Session Type</label>
                      <div className="flex glass p-1 gap-1">
                        <button
                          onClick={() => setQuizConfig(c => ({ ...c, sessionType: 'training' }))}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all ${quizConfig.sessionType === 'training' ? 'bg-indigo-500 text-white rounded-xl shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          Training
                        </button>
                        <button
                          onClick={() => setQuizConfig(c => ({ ...c, sessionType: 'quiz' }))}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all ${quizConfig.sessionType === 'quiz' ? 'bg-indigo-500 text-white rounded-xl shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          Quiz
                        </button>
                        <button
                          onClick={() => setQuizConfig(c => ({ ...c, sessionType: 'exam' }))}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all ${quizConfig.sessionType === 'exam' ? 'bg-amber-500 text-white rounded-xl shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          Exam
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {quizConfig.sessionType === 'exam' && (
                  <div className="mb-8 p-4 glass bg-amber-500/5 border border-amber-500/20 rounded-2xl max-w-md animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">High-Stakes Mode Active</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">The <span className="text-slate-200 font-bold">Official Exam</span> simulates the real CISM test. You will have <span className="text-amber-400 font-bold">4 Hours</span> to complete <span className="text-amber-400 font-bold">150 Questions</span> sampled across all domains according to ISACA weights.</p>
                  </div>
                )}

                <button onClick={startQuiz} className="px-16 py-4 glass bg-indigo-500 text-white font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-95">START MISSION</button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Recent Session History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.slice(0, 4).map(res => (
                    <div key={res.id} className="glass p-5 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                      <div>
                        <div className="text-xs text-slate-500 font-bold mb-1">{res.date}</div>
                        <div className="text-xl font-bold">{res.score} <span className="text-slate-500 text-sm font-normal">/ {res.total}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time Spent</div>
                        <div className="text-indigo-400 font-mono text-sm">{formatTime(res.timeSpent)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'quiz' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-8 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 glass bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Q {currentIndex + 1}</span>
                {activeQuestions[currentIndex].domain && (
                  <span className="px-3 py-1 glass bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">Domain {activeQuestions[currentIndex].domain}</span>
                )}
              </div>
              <div className="h-1 flex-1 bg-indigo-500/10 rounded-full overflow-hidden ml-4">
                <motion.div animate={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }} className="h-full bg-indigo-500" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-10 text-slate-100 italic">{activeQuestions[currentIndex].question}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {Object.entries(activeQuestions[currentIndex].options).map(([key, val]) => {
                const isSelected = selectedAnswer === key;
                const showOutcome = (quizConfig.sessionType === 'training' && isConfirmed);
                const isCorrect = showOutcome && key === activeQuestions[currentIndex].answer;
                const isIncorrect = showOutcome && isSelected && key !== activeQuestions[currentIndex].answer;

                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={`option-button !mb-0 min-h-[60px] !p-4 !text-sm transition-all ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''}`}
                  >
                    <span className="flex-shrink-0 w-6 h-6 glass flex items-center justify-center font-bold text-[10px]">{key}</span>
                    <span className="flex-1 transition-all">{val}</span>
                  </button>
                )
              })}
            </div>

            {selectedAnswer && quizConfig.sessionType === 'quiz' && (
              <button
                onClick={handleNext}
                className="w-full py-4 glass bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-600 shadow-xl"
              >
                PROCEED TO NEXT <ChevronRight size={18} />
              </button>
            )}

            {selectedAnswer && quizConfig.sessionType === 'training' && !isConfirmed && (
              <button
                onClick={handleConfirm}
                className="w-full py-4 glass bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-600 shadow-xl"
              >
                CHECK ANSWER <ChevronRight size={18} />
              </button>
            )}

            {isConfirmed && quizConfig.sessionType === 'training' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><BookOpen size={14} /> Comprehensive Rationale</h3>
                <div className="space-y-3 mb-6">
                  {Object.entries(activeQuestions[currentIndex].justification).map(([key, ex]) => {
                    const isCorrectAnswer = key === activeQuestions[currentIndex].answer;
                    return (
                      <div key={key} className="flex gap-3 items-start opacity-80">
                        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isCorrectAnswer ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'}`}>{key}</span>
                        <p className={`text-xs text-slate-400 leading-relaxed italic ${isCorrectAnswer ? 'font-bold' : ''}`}>"{ex}"</p>
                      </div>
                    )
                  })}
                </div>
                <button onClick={handleNext} className="w-full py-4 glass bg-indigo-500/20 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all">NEXT QUESTION <ChevronRight size={18} /></button>
              </motion.div>
            )}
          </motion.div>
        )}

        {view === 'result' && sessionResults.length > 0 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="glass p-10 flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (sessionResults.filter(r => r.isCorrect).length / activeQuestions.length))} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black">{Math.round((sessionResults.filter(r => r.isCorrect).length / activeQuestions.length) * 100)}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Session Accuracy</span>
                </div>
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <h2 className="text-3xl font-bold">Session Overview</h2>
                  {sessionResults.length > 0 && (
                    <div className="flex gap-2 justify-center">
                      <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-tighter shadow-lg ${calculateScaledScore(sessionResults) >= 450 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
                        {calculateScaledScore(sessionResults) >= 450 ? 'EXAM PASS' : 'BELOW TARGET'}
                      </div>
                      <div className="px-4 py-1.5 glass bg-white/5 border border-white/10 text-xs font-mono font-bold text-indigo-400">
                        SCALED: {calculateScaledScore(sessionResults)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 justify-center md:justify-start">
                  <div className="px-4 py-2 glass bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">{sessionResults.filter(r => r.isCorrect).length} Correct</div>
                  <div className="px-4 py-2 glass bg-rose-500/10 text-rose-400 text-xs font-bold uppercase">{sessionResults.filter(r => !r.isCorrect).length} Wrong</div>
                </div>
                <p className="text-[11px] text-slate-500 italic max-w-md">Calculated using official CISM domain weights (17/20/33/30) and scaled to 200-800. Target score is 450.</p>
                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start no-print">
                  <button onClick={() => setView('home')} className="px-8 py-3 glass bg-white/5 text-slate-300 font-bold text-sm hover:bg-indigo-500 hover:text-white border border-white/5">BACK TO DASHBOARD</button>
                  <button onClick={() => window.print()} className="px-8 py-3 glass bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 border border-indigo-400/20">PRINT RESULTS</button>
                </div>
              </div>
            </div>

            {sessionResults.length > 0 && Array.from(new Set(sessionResults.map(r => r.question.domain))).length > 1 && (
              <div className="glass p-8 space-y-6">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Domain Strength Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].filter(d => sessionResults.some(r => r.question.domain === d)).map(domainNum => {
                    const domainQs = sessionResults.filter(r => r.question.domain === domainNum);
                    const correct = domainQs.filter(r => r.isCorrect).length;
                    const total = domainQs.length;
                    const percent = Math.round((correct / total) * 100);

                    return (
                      <div key={domainNum} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-slate-300">Domain {domainNum}</span>
                          <span className={`text-xs font-mono font-bold ${percent >= 80 ? 'text-emerald-400' : percent >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{percent}% <span className="text-[10px] text-slate-500 font-normal">({correct}/{total})</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1, delay: 0.2 }} className={`h-full rounded-full ${percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question Review</h3>
                <div className="flex gap-2">
                  {(['all', 'correct', 'wrong'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[10px] font-bold glass uppercase transition-all ${filter === f ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-400'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4 pb-20">
                {sessionResults.filter(r => filter === 'all' ? true : (filter === 'correct' ? r.isCorrect : !r.isCorrect)).map((res, i) => (
                  <div key={i} className={`glass p-6 border-l-4 transition-all ${res.isCorrect ? 'border-l-emerald-500 shadow-emerald-500/5' : 'border-l-rose-500 shadow-rose-500/5'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">Number {res.question.number}</span>
                      {res.question.domain && (
                        <span className="text-[9px] font-bold text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-500/10">Domain {res.question.domain}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-4 italic text-slate-200">{res.question.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {Object.entries(res.question.options).map(([key, val]) => (
                        <div key={key} className={`p-3 rounded-xl border text-[11px] flex gap-3 items-center ${key === res.question.answer ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : (key === res.userAnswer ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/5 text-slate-500 opacity-60')}`}>
                          <span className="font-bold">{key}</span>
                          <span className="flex-1">{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={12} /> Detailed Rationale
                      </h4>
                      {Object.entries(res.question.justification).map(([key, ex]) => {
                        const isCorrectAnswer = key === res.question.answer;
                        return (
                          <div key={key} className="flex gap-3 items-start opacity-70">
                            <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold ${isCorrectAnswer ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'}`}>{key}</span>
                            <p className={`text-[11px] text-slate-400 leading-relaxed italic ${isCorrectAnswer ? 'font-bold' : ''}`}>"{ex}"</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex gap-4 items-center pt-4 border-t border-white/5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Selection: <span className={res.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>{res.userAnswer}</span></div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registry Answer: <span className="text-emerald-400">{res.question.answer}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quiz Bank Modal */}
      {bankOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass w-full max-w-2xl p-8 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold">Question Bank <span className="gradient-text">Progress</span></h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Coverage Analytics</p>
              </div>
              <button
                onClick={() => setBankOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
              >
                <ChevronRight className="rotate-90" size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {[1, 2, 3, 4].map(domainNum => {
                const domainQuestions = allQuestions.filter(q => q.domain === domainNum);
                const viewCounts = JSON.parse(localStorage.getItem('cism_question_counts') || '{}');
                const seenCount = domainQuestions.filter(q => viewCounts[q.number] > 0).length;
                const totalInDomain = domainQuestions.length;
                const coveragePercent = Math.round((seenCount / totalInDomain) * 100);

                // Average times through (Total views / Total questions)
                const totalViews = domainQuestions.reduce((acc, q) => acc + (viewCounts[q.number] || 0), 0);
                const avgViews = (totalViews / totalInDomain).toFixed(1);

                return (
                  <div key={domainNum} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 glass flex items-center justify-center border-amber-500/20 text-amber-500 font-bold text-xs">{domainNum}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Domain {domainNum}</div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{seenCount} / {totalInDomain} Questions Seen</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-indigo-400">{coveragePercent}%</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{avgViews}x Avg Depth</div>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${coveragePercent}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-6 border-t border-white/5 text-center">
              <p className="text-[11px] text-slate-500 italic max-w-sm mx-auto">
                "Coverage" indicates unique questions seen at least once. "Depth" tracks how many times you've cycled through the entire domain bank.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default App
