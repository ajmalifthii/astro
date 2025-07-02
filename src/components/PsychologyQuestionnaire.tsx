import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Type, ChevronRight, Brain } from 'lucide-react';
import { PsychologySession, type PsychAnswer } from '../services/psychologyService';

interface PsychologyQuestionnaireProps {
  session: PsychologySession;
  onAnswerSubmit: (answer: PsychAnswer) => Promise<void>;
  onComplete: () => void;
}

export function PsychologyQuestionnaire({ session, onAnswerSubmit, onComplete }: PsychologyQuestionnaireProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = session.getCurrentQuestion();
  const progress = session.getProgress();

  useEffect(() => {
    setStartTime(Date.now());
    setAnswer('');
  }, [currentQuestion]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) return;

    setIsSubmitting(true);
    const responseTime = Math.floor((Date.now() - startTime) / 1000);

    const answerData: PsychAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: answer.trim(),
      responseMethod: mode,
      responseTimeSeconds: responseTime
    };

    try {
      await onAnswerSubmit(answerData);
      
      if (session.isComplete()) {
        onComplete();
      } else {
        setAnswer('');
        setStartTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording
      setAnswer('Voice recording in progress...');
    } else {
      // Stop recording
      setAnswer('Voice recording completed. [This would contain transcribed text in a real implementation]');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && answer.trim()) {
        e.preventDefault();
        handleSubmitAnswer();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setMode(mode === 'text' ? 'voice' : 'text');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [answer, mode]);

  if (!currentQuestion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full w-full flex items-center justify-center text-white"
      >
        <div className="text-center">
          <Brain size={48} className="mx-auto mb-4 text-purple-400" />
          <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
          <p className="text-white/70">Processing your responses...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.7 }}
      className="h-full w-full flex items-center justify-center p-4"
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-8 flex flex-col">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Question {session.getResponses().length + 1}</span>
            <span>{progress}% Complete</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              className="bg-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <h2 className="text-xl font-light text-white mb-2 leading-relaxed">
              {currentQuestion.question}
            </h2>
            <div className="text-xs text-white/40">
              Category: {currentQuestion.category} • Difficulty: {currentQuestion.difficultyLevel}/5
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Input Mode Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={() => setMode('text')}
            className={`p-3 rounded-full transition-all ${
              mode === 'text' ? 'bg-purple-500/50 text-white' : 'bg-black/20 text-white/60'
            }`}
          >
            <Type size={20} />
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`p-3 rounded-full transition-all ${
              mode === 'voice' ? 'bg-purple-500/50 text-white' : 'bg-black/20 text-white/60'
            }`}
          >
            <Mic size={20} />
          </button>
        </div>

        {/* Input Area */}
        <div className="flex-grow flex items-center justify-center mb-6">
          {mode === 'text' ? (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Share your thoughts here..."
              className="w-full h-32 bg-black/20 border border-white/20 rounded-lg p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 resize-none"
              autoFocus
            />
          ) : (
            <div className="flex flex-col items-center">
              <motion.button
                onClick={handleVoiceToggle}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-red-500/80 animate-pulse' : 'bg-purple-500/80'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mic size={32} className="text-white" />
              </motion.button>
              <div className="text-white/70 mt-3 text-center">
                {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
              </div>
              {answer && (
                <div className="mt-4 p-3 bg-black/20 rounded-lg text-white/80 text-sm max-w-full">
                  {answer}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || isSubmitting}
            className={`px-8 py-3 bg-purple-500/80 text-white font-bold rounded-full transition-all duration-300 shadow-lg backdrop-blur-sm border border-purple-400/50 flex items-center gap-2 ${
              !answer.trim() || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            whileHover={answer.trim() && !isSubmitting ? { scale: 1.05 } : {}}
            whileTap={answer.trim() && !isSubmitting ? { scale: 0.95 } : {}}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                Continue <ChevronRight size={20} />
              </>
            )}
          </motion.button>
          <p className="text-xs text-white/40 mt-2">
            Press Enter to continue • Tab to switch mode
          </p>
        </div>
      </div>
    </motion.div>
  );
}