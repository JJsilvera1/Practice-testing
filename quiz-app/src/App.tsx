import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, BookOpen, Clock } from 'lucide-react'

interface Question {
  number: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  justification: Record<string, string>;
}

interface QuizResult {
  id: string;
  date: string;
  score: number;
  total: number;
  timeSpent: number;
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
  const [quizConfig, setQuizConfig] = useState({ count: 10, useTimer: false })
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [sessionResults, setSessionResults] = useState<QuizResult['questions']>([])
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all')
  const [startTime, setStartTime] = useState<number>(0)

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('cism_history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/questions.json.checkpoint')
        const data = await response.json()
        if (data.questions) setAllQuestions(data.questions)
      } catch (e) { console.error(e) }
    }
    fetchQuestions()
  }, [])

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
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, quizConfig.count)
    setActiveQuestions(shuffled)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setSessionResults([])
    setView('quiz')
    setStartTime(Date.now())
    if (quizConfig.useTimer) setTimeLeft(quizConfig.count * 60) // 1 min per question
    else setTimeLeft(null)
  }

  const handleSelect = (key: string) => {
    if (selectedAnswer) return
    setSelectedAnswer(key)
    const current = activeQuestions[currentIndex]
    setSessionResults(prev => [...prev, {
      question: current,
      userAnswer: key,
      isCorrect: key === current.answer
    }])
  }

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(i => i + 1)
      setSelectedAnswer(null)
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    const score = sessionResults.filter(r => r.isCorrect).length
    const newResult: QuizResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      score,
      total: activeQuestions.length,
      timeSpent,
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
      </header>

      <main className="w-full max-w-4xl px-4">
        {view === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass p-10 text-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Ready for Certification?</h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto italic text-sm">Configure your session and dive into {allQuestions.length} AI-refined professional questions.</p>

                <div className="flex flex-wrap justify-center gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Question Count</label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[5, 10, 20, 50].map(n => (
                        <button key={n} onClick={() => setQuizConfig(c => ({ ...c, count: n }))} className={`px-4 py-2 text-xs font-bold glass ${quizConfig.count === n ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}>{n}</button>
                      ))}
                      <div className="flex items-center glass px-2 bg-white/5 border-dashed border-white/10">
                        <input
                          type="number"
                          min="1"
                          max={allQuestions.length}
                          value={quizConfig.count}
                          onChange={(e) => setQuizConfig(c => ({ ...c, count: Math.min(allQuestions.length, Math.max(1, parseInt(e.target.value) || 0)) }))}
                          className="w-16 bg-transparent text-center text-xs font-bold focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase pr-1">Qty</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mode</label>
                    <button onClick={() => setQuizConfig(c => ({ ...c, useTimer: !c.useTimer }))} className={`w-full px-6 py-2 text-xs font-bold glass flex items-center gap-2 ${quizConfig.useTimer ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400'}`}>
                      <Clock size={14} /> {quizConfig.useTimer ? 'Timed Challenge' : 'Untimed Study'}
                    </button>
                  </div>
                </div>

                <button onClick={startQuiz} className="px-12 py-4 glass bg-indigo-500 text-white font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/20 transition-all active:scale-95">START SESSION</button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Recent Session History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.slice(0, 4).map(res => (
                    <div key={res.id} className="glass p-5 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
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
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 glass bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Q {currentIndex + 1}</span>
              <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden ml-2">
                <motion.div animate={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }} className="h-full bg-indigo-500" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-10 text-slate-100 italic">{activeQuestions[currentIndex].question}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {Object.entries(activeQuestions[currentIndex].options).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={`option-button !mb-0 min-h-[60px] !p-4 !text-sm ${selectedAnswer === key ? 'selected' : ''} ${selectedAnswer && key === activeQuestions[currentIndex].answer ? 'correct' : ''} ${selectedAnswer === key && key !== activeQuestions[currentIndex].answer ? 'incorrect' : ''}`}
                >
                  <span className="flex-shrink-0 w-6 h-6 glass flex items-center justify-center font-bold text-[10px]">{key}</span>
                  <span className="flex-1">{val}</span>
                </button>
              ))}
            </div>

            {selectedAnswer && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><BookOpen size={14} /> Comprehensive Rationale</h3>
                <div className="space-y-3 mb-6">
                  {Object.entries(activeQuestions[currentIndex].justification).map(([key, ex]) => (
                    <div key={key} className="flex gap-3 items-start opacity-80">
                      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${key === activeQuestions[currentIndex].answer ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'}`}>{key}</span>
                      <p className="text-xs text-slate-400 leading-relaxed italic">{ex}</p>
                    </div>
                  ))}
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
                <h2 className="text-3xl font-bold">Session Overview</h2>
                <div className="flex gap-4 justify-center md:justify-start">
                  <div className="px-4 py-2 glass bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">{sessionResults.filter(r => r.isCorrect).length} Correct</div>
                  <div className="px-4 py-2 glass bg-rose-500/10 text-rose-400 text-xs font-bold uppercase">{sessionResults.filter(r => !r.isCorrect).length} Wrong</div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start no-print">
                  <button onClick={() => setView('home')} className="px-8 py-3 glass bg-white/5 text-slate-300 font-bold text-sm hover:bg-indigo-500 hover:text-white border border-white/5">BACK TO DASHBOARD</button>
                  <button onClick={() => window.print()} className="px-8 py-3 glass bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 border border-indigo-400/20">PRINT RESULTS</button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question Review</h3>
                <div className="flex gap-2">
                  {(['all', 'correct', 'wrong'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[10px] font-bold glass uppercase ${filter === f ? 'bg-white/10 text-white' : 'text-slate-500'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4 pb-20">
                {sessionResults.filter(r => filter === 'all' ? true : (filter === 'correct' ? r.isCorrect : !r.isCorrect)).map((res, i) => (
                  <div key={i} className={`glass p-6 border-l-4 ${res.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                    <p className="text-sm font-medium mb-4 italic text-slate-200">{res.question.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {Object.entries(res.question.options).map(([key, val]) => (
                        <div key={key} className={`p-3 rounded-xl border text-[11px] flex gap-3 items-center ${key === res.question.answer ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : (key === res.userAnswer ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/5 text-slate-500')}`}>
                          <span className="font-bold">{key}</span>
                          <span className="flex-1 opacity-80">{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={12} /> Detailed Rationale
                      </h4>
                      {Object.entries(res.question.justification).map(([key, ex]) => (
                        <div key={key} className="flex gap-3 items-start opacity-70">
                          <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold ${key === res.question.answer ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'}`}>{key}</span>
                          <p className="text-[11px] text-slate-400 leading-relaxed italic">{ex}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-4 items-center pt-4 border-t border-white/5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Your Selection: <span className={res.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>{res.userAnswer}</span></div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Registry Answer: <span className="text-emerald-400">{res.question.answer}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
