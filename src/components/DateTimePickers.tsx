import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Calendar, Clock, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

// Sound effects utility
const playSound = (frequency: number, duration: number = 50) => {
  if (typeof window !== 'undefined' && 'AudioContext' in window) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      // Silently fail if audio context is not available
    }
  }
};

// Enhanced Date Picker with Fluid Wheel Selection
export function ThemedDatePicker({ value, onChange, placeholder = "Select Date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (value) {
      const date = new Date(value);
      return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      };
    }
    const today = new Date();
    return { 
      day: today.getDate(), 
      month: today.getMonth() + 1, 
      year: today.getFullYear() 
    };
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleDateChange = (type: 'day' | 'month' | 'year', value: number) => {
    playSound(800, 30); // Soft click sound
    const newDate = { ...selectedDate, [type]: value };
    setSelectedDate(newDate);
    
    // Format as YYYY-MM-DD
    const formattedDate = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`;
    onChange(formattedDate);
  };

  const formatDisplayDate = () => {
    if (!value) return placeholder;
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const FluidWheelSelector = ({ 
    items, 
    selectedValue, 
    onSelect, 
    type 
  }: { 
    items: (string | number)[], 
    selectedValue: number, 
    onSelect: (value: number) => void,
    type: 'day' | 'month' | 'year'
  }) => {
    const [dragY, setDragY] = useState(0);
    const [velocity, setVelocity] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();

    const selectedIndex = items.findIndex(item => 
      type === 'month' ? item === months[selectedValue - 1] : item === selectedValue
    );

    const itemHeight = 40;
    const visibleItems = 5;
    const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

    const getItemsToRender = useCallback(() => {
      const totalOffset = dragY - (selectedIndex * itemHeight) + centerOffset;
      const startIndex = Math.floor(-totalOffset / itemHeight) - 2;
      const renderedItems = [];

      for (let i = 0; i < visibleItems + 4; i++) {
        let index = startIndex + i;
        while (index < 0) index += items.length;
        while (index >= items.length) index -= items.length;
        
        const y = totalOffset + (startIndex + i) * itemHeight;
        const distanceFromCenter = Math.abs(y - centerOffset);
        const opacity = Math.max(0.2, 1 - distanceFromCenter / (itemHeight * 2));
        const scale = Math.max(0.7, 1 - distanceFromCenter / (itemHeight * 3));

        renderedItems.push({
          item: items[index],
          y,
          opacity,
          scale,
          index: index,
          isCenter: Math.abs(y - centerOffset) < itemHeight / 2
        });
      }

      return renderedItems;
    }, [dragY, selectedIndex, items, centerOffset]);

    const handleDragEnd = useCallback((info: PanInfo) => {
      const finalY = dragY + velocity * 0.1;
      const targetIndex = Math.round((centerOffset - finalY) / itemHeight);
      let newIndex = (selectedIndex + targetIndex) % items.length;
      if (newIndex < 0) newIndex += items.length;

      const newValue = type === 'month' 
        ? months.indexOf(items[newIndex] as string) + 1
        : items[newIndex] as number;
      
      onSelect(newValue);
      setDragY(0);
      setVelocity(0);
    }, [dragY, velocity, selectedIndex, items, centerOffset, type, onSelect]);

    const handlePan = useCallback((event: any, info: PanInfo) => {
      setDragY(info.offset.y);
      setVelocity(info.velocity.y);
      
      // Play scroll sound
      if (Math.abs(info.velocity.y) > 100) {
        playSound(600 + Math.abs(info.velocity.y) * 0.5, 20);
      }
    }, []);

    const renderedItems = getItemsToRender();

    return (
      <div className="relative h-48 overflow-hidden touch-pan-y">
        <motion.div
          ref={containerRef}
          className="relative h-full cursor-grab active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onPan={handlePan}
          onDragEnd={handleDragEnd}
          dragElastic={0.1}
          dragMomentum={true}
        >
          {renderedItems.map((item, index) => (
            <motion.div
              key={`${item.item}-${item.index}-${index}`}
              className="absolute left-0 right-0 flex items-center justify-center text-center select-none"
              style={{
                height: itemHeight,
                top: item.y,
                opacity: item.opacity,
                transform: `scale(${item.scale})`,
                color: item.isCenter ? '#ffffff' : '#ffffff80',
                fontWeight: item.isCenter ? 'bold' : 'normal',
                fontSize: item.isCenter ? '18px' : '14px',
                textShadow: item.isCenter ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none'
              }}
              animate={{
                scale: item.scale,
                opacity: item.opacity
              }}
              transition={{ duration: 0.1 }}
            >
              {type === 'month' && typeof item.item === 'string' 
                ? item.item.slice(0, 3) 
                : item.item}
            </motion.div>
          ))}
        </motion.div>
        
        {/* Center indicator */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 border-y border-purple-400/30 bg-purple-500/10 pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => {
          playSound(1000, 100);
          setIsOpen(true);
        }}
        className="w-full bg-black/20 border border-white/20 rounded-lg py-3 px-4 pl-12 text-left text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm sm:text-base hover:bg-black/30"
      >
        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        {formatDisplayDate()}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-sm mx-auto shadow-2xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Select Date</h3>
                <button
                  onClick={() => {
                    playSound(800, 50);
                    setIsOpen(false);
                  }}
                  className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-between items-center space-x-4">
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2 font-medium">Month</div>
                  <FluidWheelSelector
                    items={months}
                    selectedValue={selectedDate.month}
                    onSelect={(value) => handleDateChange('month', value)}
                    type="month"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2 font-medium">Day</div>
                  <FluidWheelSelector
                    items={days}
                    selectedValue={selectedDate.day}
                    onSelect={(value) => handleDateChange('day', value)}
                    type="day"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2 font-medium">Year</div>
                  <FluidWheelSelector
                    items={years}
                    selectedValue={selectedDate.year}
                    onSelect={(value) => handleDateChange('year', value)}
                    type="year"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    playSound(600, 50);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-white/20 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    playSound(1200, 100);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-purple-500/80 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-purple-500 active:scale-95 shadow-lg"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Time Picker with Wheel-style Selection
export function ThemedTimePicker({ value, onChange, placeholder = "Select Time" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      return {
        hours: parseInt(hours),
        minutes: parseInt(minutes)
      };
    }
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes()
    };
  });
  const [is24Hour, setIs24Hour] = useState(true);

  const hours24 = Array.from({ length: 24 }, (_, i) => i);
  const hours12 = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleTimeChange = (type: 'hours' | 'minutes', value: number) => {
    playSound(800, 30);
    const newTime = { ...selectedTime, [type]: value };
    setSelectedTime(newTime);
    
    const formattedTime = `${String(newTime.hours).padStart(2, '0')}:${String(newTime.minutes).padStart(2, '0')}`;
    onChange(formattedTime);
  };

  const formatDisplayTime = () => {
    if (!value) return placeholder;
    
    const [hours, minutes] = value.split(':');
    const hour24 = parseInt(hours);
    
    if (is24Hour) {
      return `${hours}:${minutes}`;
    } else {
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    }
  };

  const FluidTimeWheelSelector = ({ 
    items, 
    selectedValue, 
    onSelect, 
    type 
  }: { 
    items: number[], 
    selectedValue: number, 
    onSelect: (value: number) => void,
    type: 'hours' | 'minutes'
  }) => {
    const [dragY, setDragY] = useState(0);
    const [velocity, setVelocity] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedIndex = items.indexOf(selectedValue);
    const itemHeight = 40;
    const visibleItems = 5;
    const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

    const getItemsToRender = useCallback(() => {
      const totalOffset = dragY - (selectedIndex * itemHeight) + centerOffset;
      const startIndex = Math.floor(-totalOffset / itemHeight) - 2;
      const renderedItems = [];

      for (let i = 0; i < visibleItems + 4; i++) {
        let index = startIndex + i;
        while (index < 0) index += items.length;
        while (index >= items.length) index -= items.length;
        
        const y = totalOffset + (startIndex + i) * itemHeight;
        const distanceFromCenter = Math.abs(y - centerOffset);
        const opacity = Math.max(0.2, 1 - distanceFromCenter / (itemHeight * 2));
        const scale = Math.max(0.7, 1 - distanceFromCenter / (itemHeight * 3));

        renderedItems.push({
          item: items[index],
          y,
          opacity,
          scale,
          index: index,
          isCenter: Math.abs(y - centerOffset) < itemHeight / 2
        });
      }

      return renderedItems;
    }, [dragY, selectedIndex, items, centerOffset]);

    const handleDragEnd = useCallback((info: PanInfo) => {
      const finalY = dragY + velocity * 0.1;
      const targetIndex = Math.round((centerOffset - finalY) / itemHeight);
      let newIndex = (selectedIndex + targetIndex) % items.length;
      if (newIndex < 0) newIndex += items.length;

      onSelect(items[newIndex]);
      setDragY(0);
      setVelocity(0);
    }, [dragY, velocity, selectedIndex, items, centerOffset, onSelect]);

    const handlePan = useCallback((event: any, info: PanInfo) => {
      setDragY(info.offset.y);
      setVelocity(info.velocity.y);
      
      if (Math.abs(info.velocity.y) > 100) {
        playSound(700 + Math.abs(info.velocity.y) * 0.3, 15);
      }
    }, []);

    const renderedItems = getItemsToRender();

    return (
      <div className="relative h-48 overflow-hidden touch-pan-y">
        <motion.div
          ref={containerRef}
          className="relative h-full cursor-grab active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onPan={handlePan}
          onDragEnd={handleDragEnd}
          dragElastic={0.1}
          dragMomentum={true}
        >
          {renderedItems.map((item, index) => (
            <motion.div
              key={`${item.item}-${item.index}-${index}`}
              className="absolute left-0 right-0 flex items-center justify-center text-center select-none font-mono"
              style={{
                height: itemHeight,
                top: item.y,
                opacity: item.opacity,
                transform: `scale(${item.scale})`,
                color: item.isCenter ? '#ffffff' : '#ffffff80',
                fontWeight: item.isCenter ? 'bold' : 'normal',
                fontSize: item.isCenter ? '20px' : '16px',
                textShadow: item.isCenter ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none'
              }}
              animate={{
                scale: item.scale,
                opacity: item.opacity
              }}
              transition={{ duration: 0.1 }}
            >
              {String(item.item).padStart(2, '0')}
            </motion.div>
          ))}
        </motion.div>
        
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 border-y border-purple-400/30 bg-purple-500/10 pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => {
          playSound(1000, 100);
          setIsOpen(true);
        }}
        className="w-full bg-black/20 border border-white/20 rounded-lg py-3 px-4 pl-12 text-left text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm sm:text-base hover:bg-black/30"
      >
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        {formatDisplayTime()}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-sm mx-auto shadow-2xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Select Time</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playSound(900, 50);
                      setIs24Hour(!is24Hour);
                    }}
                    className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/80 hover:bg-white/20 transition-colors border border-white/20"
                  >
                    {is24Hour ? '24H' : '12H'}
                  </button>
                  <button
                    onClick={() => {
                      playSound(800, 50);
                      setIsOpen(false);
                    }}
                    className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex justify-center items-center space-x-8">
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2 font-medium">Hours</div>
                  <FluidTimeWheelSelector
                    items={is24Hour ? hours24 : hours12}
                    selectedValue={is24Hour ? selectedTime.hours : (selectedTime.hours === 0 ? 12 : selectedTime.hours > 12 ? selectedTime.hours - 12 : selectedTime.hours)}
                    onSelect={(value) => {
                      const hours24Value = is24Hour ? value : (value === 12 ? 0 : value);
                      handleTimeChange('hours', hours24Value);
                    }}
                    type="hours"
                  />
                </div>
                
                <div className="text-white text-2xl font-bold self-center mt-8">:</div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2 font-medium">Minutes</div>
                  <FluidTimeWheelSelector
                    items={minutes}
                    selectedValue={selectedTime.minutes}
                    onSelect={(value) => handleTimeChange('minutes', value)}
                    type="minutes"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    playSound(600, 50);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-white/20 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    playSound(1200, 100);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-purple-500/80 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-purple-500 active:scale-95 shadow-lg"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}