import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2, Brain, Sparkles } from 'lucide-react';
import { conversationalAI, type ConversationState } from '../services/conversationalAI';

interface ConversationalQuestionnaireProps {
  userId: string;
  onComplete: (extractedData: Record<string, any>) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

export function ConversationalQuestionnaire({ userId, onComplete }: ConversationalQuestionnaireProps) {
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation
  useEffect(() => {
    initializeConversation();
  }, [userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !isTyping) {
      inputRef.current?.focus();
    }
  }, [isLoading, isTyping]);

  const initializeConversation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const state = await conversationalAI.startConversation(userId);
      setConversationState(state);
      
      // Convert to display format
      const initialMessages: Message[] = state.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));
      
      setMessages(initialMessages);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !conversationState || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setIsTyping(true);

    const responseTime = Math.floor((Date.now() - startTime) / 1000);

    try {
      const { state: newState, aiResponse } = await conversationalAI.continueConversation(
        conversationState,
        userMessage.content,
        responseTime
      );

      setConversationState(newState);

      // Simulate typing delay
      setTimeout(() => {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: aiResponse.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        setStartTime(Date.now());

        // Check if conversation is complete
        if (newState.isComplete) {
          setTimeout(() => {
            handleConversationComplete(newState.extractedData);
          }, 1000);
        }
      }, 1000 + Math.random() * 1000); // 1-2 second typing simulation

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationComplete = async (extractedData: Record<string, any>) => {
    try {
      if (conversationState) {
        await conversationalAI.saveExtractedData(
          userId, 
          conversationState.sessionId, 
          extractedData
        );
      }
      onComplete(extractedData);
    } catch (error) {
      console.error('Failed to save conversation data:', error);
      setError('Failed to save conversation. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real implementation, you would integrate with Web Speech API
    if (!isRecording) {
      setCurrentMessage('Voice recording in progress...');
    } else {
      setCurrentMessage('Voice recording completed. [This would contain transcribed text]');
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full w-full flex items-center justify-center text-white p-4"
      >
        <div className="text-center">
          <Brain size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={initializeConversation}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full w-full flex flex-col max-w-2xl mx-auto p-4"
    >
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-t-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
          <Brain size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold">AI Psychology Assistant</h2>
          <p className="text-white/60 text-sm">
            {conversationState?.isComplete 
              ? 'Assessment Complete' 
              : `Phase: ${conversationState?.currentPhase || 'Initializing'}`
            }
          </p>
        </div>
        {conversationState && (
          <div className="ml-auto">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white/5 backdrop-blur-xl border-x border-white/10 p-4 overflow-y-auto min-h-0">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-500/80 text-white ml-4'
                      : 'bg-white/10 text-white mr-4'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 text-white mr-4 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs text-white/60">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Completion indicator */}
          {conversationState?.isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center py-4"
            >
              <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 text-center">
                <Sparkles className="mx-auto mb-2 text-green-400" size={24} />
                <p className="text-green-400 font-semibold">Assessment Complete!</p>
                <p className="text-white/70 text-sm">Generating your cosmic blueprint...</p>
              </div>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!conversationState?.isComplete && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-b-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading || isTyping}
                className="w-full bg-black/20 border border-white/20 rounded-xl py-3 px-4 pr-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 disabled:opacity-50"
              />
              <button
                onClick={toggleRecording}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                  isRecording ? 'text-red-400 bg-red-500/20' : 'text-white/60 hover:text-white'
                }`}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading || isTyping}
              className="p-3 bg-purple-500/80 text-white rounded-xl hover:bg-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Press Enter to send • Click mic for voice input
          </p>
        </div>
      )}
    </motion.div>
  );
}