import React, { useState, useEffect } from 'react';
import { EnglishLevel, EnglishProgress, EnglishLesson, EnglishEvaluation, PlacementTest } from '../../types/english';
import { englishService } from '../../services/englishService';
import { Child, GradeLevel, Subject } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface EnglishModuleProps {
  child: Child;
  userId: string;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const EnglishModule: React.FC<EnglishModuleProps> = ({ child, userId, onActivityLog }) => {
  const [progress, setProgress] = useState<EnglishProgress | null>(null);
  const [lesson, setLesson] = useState<EnglishLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'intro' | 'test' | 'lesson' | 'summary'>('intro');
  const [evaluation, setEvaluation] = useState<EnglishEvaluation | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [placementQuestions, setPlacementQuestions] = useState<{ question: string; options: string[]; correctIndex: number; level: EnglishLevel }[]>([]);
  const [placementAnswers, setPlacementAnswers] = useState<number[]>([]);
  const [officialTest, setOfficialTest] = useState<PlacementTest | null>(null);
  const [currentTestSectionIdx, setCurrentTestSectionIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testWriting, setTestWriting] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writingText, setWritingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const startTimeRef = React.useRef<number | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [child.id]);

  useEffect(() => {
    if (view === 'lesson') {
      startTimeRef.current = Date.now();
    }
  }, [view]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`api_english.php?action=get_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: child.id })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setProgress(data.data);
      } else {
        setProgress({
          userId,
          childId: child.id,
          currentLevel: 'Pre-A1 Starters',
          points: 0,
          completedLessons: [],
          lastActive: Date.now(),
          streak: 0
        });
      }
    } catch (err) {
      console.error("Error fetching progress", err);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (newProgress: EnglishProgress) => {
    try {
      await fetch(`api_english.php?action=save_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgress)
      });
      setProgress(newProgress);
    } catch (err) {
      console.error("Error saving progress", err);
    }
  };

  const startPlacementTest = async () => {
    setLoading(true);
    try {
      const test = await englishService.generateOfficialPlacementTest(child.grade);
      setOfficialTest(test);
      setCurrentTestSectionIdx(0);
      setTestAnswers({});
      setTestWriting('');
      setView('test');
    } catch (err) {
      console.error("Error in placement test", err);
    } finally {
      setLoading(false);
    }
  };

  const submitPlacementTest = async () => {
    if (!officialTest) return;
    
    setIsSubmitting(true);
    try {
      let totalQuestions = 0;
      let correctCount = 0;
      let levelPoints: Record<string, number> = {
        'Pre-A1 Starters': 0,
        'A1 Movers': 0,
        'A2 Flyers': 0,
        'A2 Key': 0,
        'B1 Preliminary': 0,
        'B2 First': 0
      };

      officialTest.sections.forEach(section => {
        section.questions.forEach(q => {
          totalQuestions++;
          if (testAnswers[`${section.id}_${q.id}`] === q.correctIndex) {
            correctCount++;
            levelPoints[q.level] = (levelPoints[q.level] || 0) + 1;
          }
        });
      });

      const score = (correctCount / totalQuestions) * 100;
      
      // Determine level based on the highest level where they got most questions right
      let finalLevel: EnglishLevel = 'Pre-A1 Starters';
      const levels: EnglishLevel[] = ['Pre-A1 Starters', 'A1 Movers', 'A2 Flyers', 'A2 Key', 'B1 Preliminary', 'B2 First'];
      
      for (const lvl of levels) {
        if (levelPoints[lvl] > 0) finalLevel = lvl;
      }

      // Final adjustment based on total score
      if (score > 90) finalLevel = 'B2 First';
      else if (score > 75) finalLevel = 'B1 Preliminary';
      else if (score > 60) finalLevel = 'A2 Key';
      else if (score > 45) finalLevel = 'A2 Flyers';
      else if (score > 30) finalLevel = 'A1 Movers';

      if (progress) {
        const updated = { ...progress, currentLevel: finalLevel };
        await saveProgress(updated);
        setView('intro');
      }
    } catch (err) {
      console.error("Error submitting placement test", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAnswer = (sectionId: string, questionId: string, optionIdx: number) => {
    setTestAnswers(prev => ({
      ...prev,
      [`${sectionId}_${questionId}`]: optionIdx
    }));
  };

  const handleAnswerSelection = (section: string, questionIdx: number, optionIdx: number) => {
    setAnswers(prev => ({
      ...prev,
      [`${section}_${questionIdx}`]: optionIdx
    }));
  };

  const handlePlacementAnswer = (questionIdx: number, optionIdx: number) => {
    const newAnswers = [...placementAnswers];
    newAnswers[questionIdx] = optionIdx;
    setPlacementAnswers(newAnswers);
  };

  const submitWriting = async () => {
    if (!writingText.trim() || !lesson) return;
    setLoading(true);
    try {
      const evalResult = await englishService.evaluateWriting(writingText, lesson.skills.writing.prompt, lesson.level);
      setEvaluation(evalResult);
      // Award points based on score
      if (progress) {
        const pointsEarned = Math.floor(evalResult.score / 10);
        const updated = { ...progress, points: progress.points + pointsEarned };
        await saveProgress(updated);
      }
    } catch (err) {
      console.error("Error evaluating writing", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      const start = Date.now();
      // Simulate recording start
      setTimeout(() => {
        setIsRecording(false);
        const duration = Math.floor((Date.now() - start) / 1000);
        if (onActivityLog) {
          onActivityLog(`Práctica Oral Inglés: ${lesson?.skills.speaking.topic}`, "Inglés", {
            text: `Práctica oral sobre ${lesson?.skills.speaking.topic}`,
            type: 'english_speaking',
            duration,
            transcription: "Simulated transcription of English practice"
          });
        }
        alert("Speaking practice recorded and analyzed! (Simulation)");
      }, 3000);
    }
  };

  const loadDailyLesson = async () => {
    if (!progress) return;
    setLoading(true);
    try {
      const newLesson = await englishService.generateDailyLesson(progress.currentLevel, child.name, child.grade);
      setLesson(newLesson);
      setView('lesson');
    } catch (err) {
      console.error("Error generating lesson", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Preparing your English mission...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            🇬🇧 English Academy
          </h2>
          <p className="text-slate-500">Cambridge Method • Level: <span className="font-bold text-blue-600">{progress?.currentLevel}</span></p>
        </div>
        <div className="flex gap-4">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            ⭐ {progress?.points} pts
          </div>
          <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            🔥 {progress?.streak} days
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-8 rounded-3xl text-center"
          >
            <div className="text-6xl mb-6">🎓</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Welcome to your English Journey!</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Ready to improve your English with the Cambridge method? Every day you'll have a new mission to practice your Listening, Reading, Writing, and Speaking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={loadDailyLesson}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all"
              >
                🚀 Start Daily Lesson
              </button>
              <button 
                onClick={startPlacementTest}
                className="bg-white border-2 border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-2xl font-bold transition-all"
              >
                ⚖️ Level Test
              </button>
            </div>
          </motion.div>
        )}

        {view === 'test' && officialTest && (
          <motion.div 
            key="test"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-slate-800">Official Placement Test</h3>
                <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold">
                  Section {currentTestSectionIdx + 1} of {officialTest.sections.length + 1}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  style={{ width: `${((currentTestSectionIdx + 1) / (officialTest.sections.length + 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {currentTestSectionIdx < officialTest.sections.length ? (
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-2">{officialTest.sections[currentTestSectionIdx].title}</h4>
                  <p className="text-sm text-blue-600 italic mb-4">{officialTest.sections[currentTestSectionIdx].instructions}</p>
                  {(officialTest.sections[currentTestSectionIdx] as any).text && (
                    <div className="bg-white p-6 rounded-xl border border-blue-100 text-slate-700 leading-relaxed mb-6">
                      {(officialTest.sections[currentTestSectionIdx] as any).text}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {officialTest.sections[currentTestSectionIdx].questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <p className="font-bold text-slate-800 mb-4">{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleTestAnswer(officialTest.sections[currentTestSectionIdx].id, q.id, oIdx)}
                            className={`p-4 text-left rounded-xl transition-all border ${
                              testAnswers[`${officialTest.sections[currentTestSectionIdx].id}_${q.id}`] === oIdx
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentTestSectionIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentTestSectionIdx === 0}
                    className="bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentTestSectionIdx(prev => prev + 1)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700"
                  >
                    Next Section
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                  <h4 className="font-bold text-purple-800 mb-2">Final Section: Writing</h4>
                  <p className="text-sm text-purple-600 italic mb-4">Write a short composition based on the prompt below.</p>
                  <div className="bg-white p-6 rounded-xl border border-purple-100 text-slate-700 leading-relaxed mb-6">
                    <strong>Prompt:</strong> {officialTest.writingPrompt.prompt}
                    <br />
                    <small className="text-slate-400">(Min. {officialTest.writingPrompt.minWords} words)</small>
                  </div>
                  <textarea
                    className="w-full p-6 rounded-2xl border border-purple-200 min-h-[250px] outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                    placeholder="Start writing here..."
                    value={testWriting}
                    onChange={(e) => setTestWriting(e.target.value)}
                  ></textarea>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentTestSectionIdx(prev => prev - 1)}
                    className="bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50"
                  >
                    Back to Questions
                  </button>
                  <button
                    onClick={submitPlacementTest}
                    disabled={isSubmitting || testWriting.split(' ').filter(w => w.length > 0).length < officialTest.writingPrompt.minWords}
                    className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Evaluating...' : 'Finish & Submit Test'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === 'lesson' && lesson && (
          <motion.div 
            key="lesson"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-2">{lesson.title}</h3>
              <p className="text-slate-500">{lesson.description}</p>
            </div>

            {/* Listening Section */}
            <section className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">🎧 Listening Practice</h4>
              <div className="bg-white p-4 rounded-2xl mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600 italic">"Listen to the teacher and answer the questions below."</p>
                <button className="bg-blue-600 text-white p-3 rounded-full hover:scale-110 transition-transform">🔊</button>
              </div>
              <div className="space-y-4">
                {lesson.skills.listening.questions.map((q, idx) => (
                  <div key={idx} className="bg-white/50 p-4 rounded-xl">
                    <p className="font-medium text-slate-800 mb-2">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <button 
                          key={oIdx} 
                          onClick={() => handleAnswerSelection('listening', idx, oIdx)}
                          className={`p-2 text-sm rounded-lg transition-all border ${
                            answers[`listening_${idx}`] === oIdx 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reading Section */}
            <section className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">📖 Reading Time</h4>
              <div className="bg-white p-6 rounded-2xl mb-4 text-slate-700 leading-relaxed">
                {lesson.skills.reading.text}
              </div>
              <div className="space-y-4">
                {lesson.skills.reading.questions.map((q, idx) => (
                  <div key={idx} className="bg-white/50 p-4 rounded-xl">
                    <p className="font-medium text-slate-800 mb-2">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <button 
                          key={oIdx} 
                          onClick={() => handleAnswerSelection('reading', idx, oIdx)}
                          className={`p-2 text-sm rounded-lg transition-all border ${
                            answers[`reading_${idx}`] === oIdx 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                            : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Writing Section */}
            <section className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
              <h4 className="font-bold text-purple-800 mb-4 flex items-center gap-2">✍️ Writing Mission</h4>
              <p className="text-slate-700 mb-4">{lesson.skills.writing.prompt}</p>
              <textarea 
                className="w-full p-4 rounded-2xl border border-purple-200 min-h-[150px] outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                placeholder="Write your answer here..."
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={submitWriting}
                  className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 transition-all"
                >
                  Submit Writing
                </button>
              </div>
              {evaluation && (
                <div className="mt-6 bg-white p-6 rounded-2xl border border-purple-200 shadow-sm animate-in slide-in-from-top">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-purple-900">Evaluation Result</h5>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">{evaluation.score}/100</span>
                  </div>
                  <p className="text-slate-600 mb-4 italic">"{evaluation.feedback}"</p>
                  <div className="space-y-3">
                    {evaluation.corrections.map((c, i) => (
                      <div key={i} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-red-500 line-through mb-1">{c.original}</p>
                        <p className="text-emerald-600 font-bold mb-1">{c.correction}</p>
                        <p className="text-slate-500 text-xs">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                    <strong>Next steps:</strong> {evaluation.nextSteps}
                  </div>
                </div>
              )}
            </section>

            {/* Speaking Section */}
            <section className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
              <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">🗣️ Speaking Practice</h4>
              <p className="text-slate-700 mb-4">Topic: <span className="font-bold">{lesson.skills.speaking.topic}</span></p>
              <div className="flex flex-wrap gap-2 mb-6">
                {lesson.skills.speaking.suggestedPhrases.map((phrase, idx) => (
                  <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs text-orange-600 border border-orange-200">
                    "{phrase}"
                  </span>
                ))}
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all active:scale-95 ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-orange-500 hover:scale-110'
                  }`}
                >
                  {isRecording ? '⏹️' : '🎙️'}
                </button>
              </div>
            </section>

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => {
                  const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
                  if (onActivityLog) {
                    onActivityLog(`Lección de Inglés: ${lesson?.title}`, "Inglés", {
                      text: `Completada lección de nivel ${progress?.currentLevel}`,
                      type: 'english_lesson',
                      duration
                    });
                  }
                  setView('intro');
                }}
                className="bg-slate-800 text-white px-12 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-900 transition-all"
              >
                🏁 Finish Lesson
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnglishModule;
