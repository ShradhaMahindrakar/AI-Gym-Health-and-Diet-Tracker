import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Plan, Session, QuizQuestion, ContentTab, Goal, FitnessLevel, DietaryPref } from './types';
import {
  generatePlan,
  streamSessionContent,
  getPlans,
  deletePlan as deletePlanApi,
  updateQuizScore,
} from './services/api';
import {
  Dumbbell,
  Flame,
  Activity,
  Apple,
  BrainCircuit,
  CheckCircle,
  Trash2,
  Plus,
  LayoutGrid,
  Home,
  Sun,
  Moon,
  ArrowLeft,
  Loader2,
  Sparkles,
  Target,
  Calendar,
  Trophy,
  Salad,
  Zap,
  Heart,
  BarChart3,
} from './components/icons';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIET_SEP = '---DIET_START---';
const QUIZ_SEP = '---QUIZ_START---';

const GOALS: Goal[] = ['Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility', 'General Fitness'];
const FITNESS_LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const DIETARY_PREFS: DietaryPref[] = ['No Preference', 'Vegetarian', 'Vegan', 'Keto', 'Paleo'];

const GOAL_ICONS: Record<Goal, React.ReactNode> = {
  'Weight Loss': <Flame className="w-5 h-5" />,
  'Muscle Gain': <Dumbbell className="w-5 h-5" />,
  'Endurance': <Activity className="w-5 h-5" />,
  'Flexibility': <Heart className="w-5 h-5" />,
  'General Fitness': <Zap className="w-5 h-5" />,
};

const GOAL_COLORS: Record<Goal, string> = {
  'Weight Loss': 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'Muscle Gain': 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'Endurance': 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  'Flexibility': 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  'General Fitness': 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

const ThemeToggle: React.FC<{ isDark: boolean; toggle: () => void }> = ({ isDark, toggle }) => (
  <button
    id="theme-toggle"
    onClick={toggle}
    className="p-2 rounded-full bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors backdrop-blur-sm"
    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
  >
    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
  <div className="markdown-body leading-relaxed">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'AI is generating...' }) => (
  <div className="flex items-center justify-center p-6 animate-pulse text-emerald-600 dark:text-emerald-400 gap-2">
    <Loader2 className="w-6 h-6 animate-spin" />
    <span>{label}</span>
  </div>
);

// ─── Quiz Component ────────────────────────────────────────────────────────────

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (qIdx: number, oIdx: number) => {
    if (submitted) return;
    const next = [...answers];
    next[qIdx] = oIdx;
    setAnswers(next);
  };

  const handleSubmit = () => {
    if (answers.includes(-1)) {
      alert('Please answer all questions before submitting.');
      return;
    }
    let correct = 0;
    answers.forEach((ans, idx) => { if (ans === questions[idx].correctAnswer) correct++; });
    setScore(correct);
    setSubmitted(true);
    onComplete((correct / questions.length) * 100);
  };

  const handleRetry = () => {
    setAnswers(new Array(questions.length).fill(-1));
    setSubmitted(false);
    setScore(0);
  };

  return (
    <div className="mt-4 space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <BrainCircuit className="w-6 h-6 text-emerald-500" />
        Fitness Knowledge Check
      </h3>

      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-base font-semibold text-slate-800 dark:text-white mb-4">
              {qIdx + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                const isSelected = answers[qIdx] === oIdx;
                const isCorrect = q.correctAnswer === oIdx;
                let cls =
                  'w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between text-sm ';
                if (submitted) {
                  if (isCorrect) cls += 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-200';
                  else if (isSelected) cls += 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200 opacity-70';
                  else cls += 'bg-slate-50 dark:bg-slate-800 border-transparent opacity-40';
                } else {
                  if (isSelected) cls += 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-100';
                  else cls += 'bg-slate-50 dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300';
                }
                return (
                  <button key={oIdx} onClick={() => handleSelect(qIdx, oIdx)} className={cls} disabled={submitted}>
                    <span>{opt}</span>
                    {submitted && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg text-sm text-emerald-700 dark:text-emerald-400 italic border-l-2 border-emerald-400">
                💡 {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {submitted ? (
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              Score:{' '}
              <span className={score === questions.length ? 'text-emerald-500' : 'text-amber-500'}>
                {score}/{questions.length}
              </span>
            </div>
            <button onClick={handleRetry} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white underline">
              Try Again
            </button>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">Answer all questions to submit</div>
        )}
        {!submitted && (
          <button
            onClick={handleSubmit}
            id="submit-quiz-btn"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Plan Creation Form ────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: (plan: Plan) => void;
  onBack: () => void;
  showBack: boolean;
}

const CreateForm: React.FC<CreateFormProps> = ({ onCreated, onBack, showBack }) => {
  const [goal, setGoal] = useState<Goal>('General Fitness');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [dietaryPref, setDietaryPref] = useState<DietaryPref>('No Preference');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const plan = await generatePlan({ goal, fitnessLevel, daysPerWeek, dietaryPref });
      onCreated(plan);
    } catch (err) {
      console.error(err);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[36rem] h-[36rem] bg-emerald-400/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[36rem] h-[36rem] bg-lime-400/10 dark:bg-lime-500/15 rounded-full blur-3xl pointer-events-none" />

      {showBack && (
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors z-20 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      )}

      <div className="max-w-xl w-full z-10 space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white dark:bg-slate-800/60 rounded-2xl mb-2 ring-1 ring-slate-200 dark:ring-slate-700 shadow-xl backdrop-blur-sm">
            <Dumbbell className="w-11 h-11 text-emerald-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 pb-2">
            AI Gym Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Tell us your goals — we'll build your perfect plan.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900/70 rounded-2xl p-6 md:p-8 ring-1 ring-slate-200 dark:ring-slate-800 shadow-2xl backdrop-blur-sm space-y-6">

          {/* Goal */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Your Goal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  id={`goal-${g.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setGoal(g)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    goal === g
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {GOAL_ICONS[g]}
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Fitness Level */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" /> Fitness Level
            </label>
            <div className="flex gap-2">
              {FITNESS_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  id={`level-${lvl.toLowerCase()}`}
                  onClick={() => setFitnessLevel(lvl)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fitnessLevel === lvl
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Days Per Week */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" /> Days Per Week
              <span className="ml-auto text-2xl font-bold text-emerald-500">{daysPerWeek}</span>
            </label>
            <input
              id="days-per-week-slider"
              type="range"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 day</span>
              <span>7 days</span>
            </div>
          </div>

          {/* Dietary Preference */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Apple className="w-4 h-4 text-emerald-500" /> Dietary Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIETARY_PREFS.map((pref) => (
                <button
                  key={pref}
                  id={`diet-${pref.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setDietaryPref(pref)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    dietaryPref === pref
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            id="generate-plan-btn"
            onClick={handleCreate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-emerald-900/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Building Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate My Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────

interface DashboardProps {
  plans: Plan[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ plans, onSelect, onNew, onDelete, isDark, toggleTheme }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
    <div className="absolute top-6 right-6 z-10">
      <ThemeToggle isDark={isDark} toggle={toggleTheme} />
    </div>

    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-emerald-500" />
            My Fitness Plans
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pick up where you left off. Every rep counts. 💪
          </p>
        </div>
        <button
          id="new-plan-btn"
          onClick={onNew}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white px-5 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-5 h-5" /> New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const done = plan.sessions.filter((s) => s.isCompleted).length;
          const total = plan.sessions.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={plan.id}
              id={`plan-card-${plan.id}`}
              onClick={() => onSelect(plan.id)}
              className="group relative bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-400/40 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden"
            >
              {/* Delete button */}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  id={`delete-plan-${plan.id}`}
                  onClick={(e) => onDelete(e, plan.id)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Decorative gradient corner */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full" />

              <div className="flex flex-col h-full space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                    <Dumbbell className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${GOAL_COLORS[plan.goal as Goal]}`}>
                    {GOAL_ICONS[plan.goal as Goal]}
                    {plan.goal}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">{plan.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{plan.description}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{plan.daysPerWeek}×/week</span>
                  <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{plan.fitnessLevel}</span>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{done}/{total} sessions done</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ─── Plan View ─────────────────────────────────────────────────────────────────

interface PlanViewProps {
  plan: Plan;
  onHome: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onPlanUpdate: (plan: Plan) => void;
}

const PlanView: React.FC<PlanViewProps> = ({ plan, onHome, isDark, toggleTheme, onPlanUpdate }) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>('workout');
  const [isStreaming, setIsStreaming] = useState(false);
  const [workoutText, setWorkoutText] = useState('');
  const [dietText, setDietText] = useState('');
  const [quizJSON, setQuizJSON] = useState('');
  const contentEndRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef('');

  const activeSession = useMemo(
    () => plan.sessions.find((s) => s.id === activeSessionId),
    [plan.sessions, activeSessionId]
  );

  // Reset tab when session changes
  useEffect(() => { if (activeSessionId) setActiveTab('workout'); }, [activeSessionId]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentEndRef.current && (activeTab === 'workout' || activeTab === 'diet')) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [workoutText, dietText, isStreaming, activeTab]);

  const handleSelectSession = async (session: Session) => {
    if (isStreaming) return;
    setActiveSessionId(session.id);

    // Already has content — just display it
    if (session.workoutContent) {
      setWorkoutText(session.workoutContent);
      setDietText(session.dietContent || '');
      setQuizJSON('');
      return;
    }

    // Start streaming
    setWorkoutText('');
    setDietText('');
    setQuizJSON('');
    bufferRef.current = '';
    setIsStreaming(true);

    try {
      const stream = streamSessionContent({
        planId: plan.id,
        sessionId: session.id,
        planName: plan.name,
        goal: plan.goal,
        fitnessLevel: plan.fitnessLevel,
        dietaryPref: plan.dietaryPref,
        sessionTitle: session.title,
        sessionDescription: session.description,
      });

      for await (const chunk of stream) {
        bufferRef.current += chunk;
        const buf = bufferRef.current;

        const dietIdx = buf.indexOf(DIET_SEP);
        const quizIdx = buf.indexOf(QUIZ_SEP);

        if (dietIdx === -1) {
          setWorkoutText(buf);
        } else if (quizIdx === -1) {
          setWorkoutText(buf.slice(0, dietIdx));
          setDietText(buf.slice(dietIdx + DIET_SEP.length));
        } else {
          setWorkoutText(buf.slice(0, dietIdx));
          setDietText(buf.slice(dietIdx + DIET_SEP.length, quizIdx));
          setQuizJSON(buf.slice(quizIdx + QUIZ_SEP.length));
        }
      }

      // Parse final quiz
      const finalBuf = bufferRef.current;
      const dietIdx = finalBuf.indexOf(DIET_SEP);
      const quizIdx = finalBuf.indexOf(QUIZ_SEP);
      const finalWorkout = dietIdx !== -1 ? finalBuf.slice(0, dietIdx) : finalBuf;
      const finalDiet = dietIdx !== -1 && quizIdx !== -1 ? finalBuf.slice(dietIdx + DIET_SEP.length, quizIdx) : dietIdx !== -1 ? finalBuf.slice(dietIdx + DIET_SEP.length) : '';
      let parsedQuiz: QuizQuestion[] = [];
      if (quizIdx !== -1) {
        try {
          const jsonStr = finalBuf.slice(quizIdx + QUIZ_SEP.length).replace(/```json/g, '').replace(/```/g, '').trim();
          parsedQuiz = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Quiz parse error:', e);
        }
      }

      // Update plan in parent state
      const updatedPlan: Plan = {
        ...plan,
        sessions: plan.sessions.map((s) =>
          s.id === session.id
            ? { ...s, workoutContent: finalWorkout, dietContent: finalDiet, quiz: parsedQuiz }
            : s
        ),
      };
      onPlanUpdate(updatedPlan);
    } catch (err) {
      console.error('Streaming error:', err);
      setWorkoutText((prev) => prev + '\n\n**Error loading content. Please try again.**');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!activeSessionId) return;
    const isCompleted = score >= 60;
    try {
      await updateQuizScore(activeSessionId, score, isCompleted);
    } catch (e) {
      console.error(e);
    }
    const updatedPlan: Plan = {
      ...plan,
      sessions: plan.sessions.map((s) =>
        s.id === activeSessionId ? { ...s, isCompleted, quizScore: score } : s
      ),
    };
    onPlanUpdate(updatedPlan);
  };

  // What to show in main content
  const displayWorkout = activeSession?.workoutContent || workoutText;
  const displayDiet = activeSession?.dietContent || dietText;
  const displayQuiz = activeSession?.quiz || [];
  const completedCount = plan.sessions.filter((s) => s.isCompleted).length;
  const progressPct = plan.sessions.length > 0 ? Math.round((completedCount / plan.sessions.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 transition-colors duration-500">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`w-full md:w-80 bg-white dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 h-screen sticky top-0 z-20 transition-all ${activeSessionId ? 'hidden md:flex' : 'flex'}`}>

        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <button
              id="back-to-dashboard"
              onClick={onHome}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <ThemeToggle isDark={isDark} toggle={toggleTheme} />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-1">{plan.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${GOAL_COLORS[plan.goal as Goal]}`}>
                {plan.goal}
              </span>
              <span className="text-xs text-slate-400">{plan.fitnessLevel}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Overall Progress</span>
              <span className="font-bold text-emerald-500">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {plan.sessions.map((session, idx) => {
            const isActive = activeSessionId === session.id;
            return (
              <div
                key={session.id}
                id={`session-item-${session.id}`}
                onClick={() => handleSelectSession(session)}
                className={`group p-3.5 rounded-xl cursor-pointer transition-all border shadow-sm ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-600/50'
                    : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
                    session.isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {session.isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {session.title}
                    </p>
                    {session.quizScore !== undefined && (
                      <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">
                        Score: {Math.round(session.quizScore)}%
                      </p>
                    )}
                  </div>
                  {isActive && isStreaming && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 flex-shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden ${!activeSessionId ? 'hidden md:flex' : 'flex'}`}>

        {activeSessionId && (
          <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur flex items-center gap-4 px-5 sticky top-0 z-10 flex-shrink-0">
            <button
              onClick={() => setActiveSessionId(null)}
              className="md:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {activeSession?.title}
            </span>
          </header>
        )}

        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-8 opacity-40">
              <Dumbbell className="w-24 h-24 text-slate-300 dark:text-slate-700" />
              <p className="text-xl text-slate-500 dark:text-slate-600">Select a session from the sidebar to begin.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 md:px-8 pb-24 animate-in fade-in duration-500 pt-6">
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">{activeSession?.title}</h1>
                <p className="text-slate-500 dark:text-slate-400">{activeSession?.description}</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 pt-2 -mx-4 md:-mx-8 px-4 md:px-8">
                {([
                  { id: 'workout' as ContentTab, label: 'Workout', icon: <Dumbbell className="w-4 h-4" /> },
                  { id: 'diet' as ContentTab, label: 'Diet Plan', icon: <Salad className="w-4 h-4" /> },
                  { id: 'quiz' as ContentTab, label: 'Quiz', icon: <BrainCircuit className="w-4 h-4" /> },
                ] as const).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    onClick={() => setActiveTab(id)}
                    className={`px-5 py-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-all ${
                      activeTab === id
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                  >
                    {icon}
                    {label}
                    {id === 'quiz' && activeSession?.isCompleted && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Workout Tab */}
              {activeTab === 'workout' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
                  {displayWorkout ? (
                    <>
                      <MarkdownRenderer content={displayWorkout} />
                      {isStreaming && !dietText && (
                        <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Writing workout...
                        </div>
                      )}
                      {!isStreaming && (
                        <div className="mt-10 p-7 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                          <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
                            <Salad className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Fuel your workout right!</h3>
                          <p className="text-slate-500 dark:text-slate-400 mb-5 max-w-md mx-auto text-sm">
                            Check your personalised meal plan to maximise your results.
                          </p>
                          <button
                            onClick={() => setActiveTab('diet')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
                          >
                            View Diet Plan
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <LoadingSpinner label="Generating your workout..." />
                  )}
                </div>
              )}

              {/* Diet Tab */}
              {activeTab === 'diet' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
                  {displayDiet ? (
                    <>
                      <MarkdownRenderer content={displayDiet} />
                      {isStreaming && dietText && !quizJSON && (
                        <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Writing meal plan...
                        </div>
                      )}
                      {!isStreaming && (
                        <div className="mt-10 p-7 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                          <div className="inline-flex p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-4">
                            <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Test your knowledge</h3>
                          <p className="text-slate-500 dark:text-slate-400 mb-5 max-w-md mx-auto text-sm">
                            Complete the quiz to track your progress and mark this session as done.
                          </p>
                          <button
                            onClick={() => setActiveTab('quiz')}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-7 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95"
                          >
                            Take the Quiz
                          </button>
                        </div>
                      )}
                    </>
                  ) : isStreaming ? (
                    <LoadingSpinner label="Generating your meal plan..." />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl gap-3">
                      <Salad className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500">Start this session to get your meal plan.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Tab */}
              {activeTab === 'quiz' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 min-h-[300px]">
                  {displayQuiz && displayQuiz.length > 0 ? (
                    <Quiz questions={displayQuiz} onComplete={handleQuizComplete} />
                  ) : isStreaming ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Generating Quiz...</h3>
                      <p className="text-slate-500 text-sm text-center max-w-xs">
                        AI is crafting fitness questions based on your session.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                      <BrainCircuit className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Quiz Yet</h3>
                      <p className="text-slate-500 text-sm">Start this session to generate the quiz.</p>
                    </div>
                  )}
                </div>
              )}

              <div ref={contentEndRef} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ─── Root App ──────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-gym-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setIsLoadingPlans(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('ai-gym-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((d) => !d);

  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) || null, [plans, activePlanId]);

  const handlePlanCreated = (plan: Plan) => {
    setPlans((prev) => [...prev, plan]);
    setActivePlanId(plan.id);
    setIsCreating(false);
  };

  const handleDeletePlan = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await deletePlanApi(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (activePlanId === id) setActivePlanId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanUpdate = (updated: Plan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (activePlanId === updated.id) {
      // force re-render - plan reference update handled by setPlans above
    }
  };

  // Loading
  if (isLoadingPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-emerald-500 animate-bounce" />
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  // No plans or creating new
  if (plans.length === 0 || isCreating) {
    return (
      <>
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle isDark={isDarkMode} toggle={toggleTheme} />
        </div>
        <CreateForm
          onCreated={handlePlanCreated}
          onBack={() => setIsCreating(false)}
          showBack={plans.length > 0 && isCreating}
        />
      </>
    );
  }

  // Active plan view
  if (activePlanId && activePlan) {
    return (
      <PlanView
        plan={activePlan}
        onHome={() => setActivePlanId(null)}
        isDark={isDarkMode}
        toggleTheme={toggleTheme}
        onPlanUpdate={handlePlanUpdate}
      />
    );
  }

  // Dashboard
  return (
    <Dashboard
      plans={plans}
      onSelect={(id) => setActivePlanId(id)}
      onNew={() => setIsCreating(true)}
      onDelete={handleDeletePlan}
      isDark={isDarkMode}
      toggleTheme={toggleTheme}
    />
  );
};

export default App;
