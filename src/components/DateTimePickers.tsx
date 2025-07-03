import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronUp, ChevronDown, X } from 'lucide-react';

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

// Date Picker with Wheel-style Selection
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
    return { day: 1, month: 1, year: 2000 };
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleDateChange = (type: 'day' | 'month' | 'year', value: number) => {
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

  const WheelSelector = ({ 
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
    const [displayItems, setDisplayItems] = useState<(string | number)[]>([]);

    useEffect(() => {
      const selectedIndex = items.findIndex(item => 
        type === 'month' ? item === months[selectedValue - 1] : item === selectedValue
      );
      
      // Create a circular array with 5 visible items
      const visibleItems = [];
      for (let i = -2; i <= 2; i++) {
        let index = selectedIndex + i;
        if (index < 0) index = items.length + index;
        if (index >= items.length) index = index - items.length;
        visibleItems.push(items[index]);
      }
      setDisplayItems(visibleItems);
    }, [items, selectedValue, type]);

    const handleScroll = (direction: 'up' | 'down') => {
      let newValue = selectedValue;
      
      if (type === 'day') {
        newValue = direction === 'up' 
          ? (selectedValue === 1 ? 31 : selectedValue - 1)
          : (selectedValue === 31 ? 1 : selectedValue + 1);
      } else if (type === 'month') {
        newValue = direction === 'up'
          ? (selectedValue === 1 ? 12 : selectedValue - 1)
          : (selectedValue === 12 ? 1 : selectedValue + 1);
      } else if (type === 'year') {
        const currentIndex = years.indexOf(selectedValue);
        const newIndex = direction === 'up'
          ? Math.max(0, currentIndex - 1)
          : Math.min(years.length - 1, currentIndex + 1);
        newValue = years[newIndex];
      }
      
      onSelect(newValue);
    };

    return (
      <div className="flex flex-col items-center">
        <button
          onClick={() => handleScroll('up')}
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronUp size={20} />
        </button>
        
        <div className="h-32 flex flex-col justify-center items-center relative overflow-hidden">
          {displayItems.map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              className={`h-8 flex items-center justify-center text-center min-w-[80px] ${
                index === 2 
                  ? 'text-white font-bold text-lg scale-110' 
                  : 'text-white/40 text-sm'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {type === 'month' && typeof item === 'string' ? item.slice(0, 3) : item}
            </motion.div>
          ))}
        </div>
        
        <button
          onClick={() => handleScroll('down')}
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronDown size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-black/20 border border-white/20 rounded-lg py-3 px-4 pl-12 text-left text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm sm:text-base"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Select Date</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-between items-center space-x-4">
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2">Month</div>
                  <WheelSelector
                    items={months}
                    selectedValue={selectedDate.month}
                    onSelect={(value) => handleDateChange('month', value)}
                    type="month"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2">Day</div>
                  <WheelSelector
                    items={days}
                    selectedValue={selectedDate.day}
                    onSelect={(value) => handleDateChange('day', value)}
                    type="day"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs text-center mb-2">Year</div>
                  <WheelSelector
                    items={years}
                    selectedValue={selectedDate.year}
                    onSelect={(value) => handleDateChange('year', value)}
                    type="year"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-purple-500/80 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-purple-500"
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

// Time Picker with Calculator-style Interface
export function ThemedTimePicker({ value, onChange, placeholder = "Select Time" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [is24Hour, setIs24Hour] = useState(false);

  useEffect(() => {
    if (value) {
      setTimeInput(value);
    }
  }, [value]);

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

  const handleNumberClick = (num: string) => {
    if (timeInput.length < 4) {
      const newInput = timeInput + num;
      setTimeInput(newInput);
      
      if (newInput.length === 4) {
        const hours = newInput.slice(0, 2);
        const minutes = newInput.slice(2, 4);
        
        // Validate time
        const h = parseInt(hours);
        const m = parseInt(minutes);
        
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          const formattedTime = `${hours}:${minutes}`;
          onChange(formattedTime);
        }
      }
    }
  };

  const handleClear = () => {
    setTimeInput('');
  };

  const handleBackspace = () => {
    setTimeInput(prev => prev.slice(0, -1));
  };

  const formatTimeDisplay = (input: string) => {
    if (input.length === 0) return '--:--';
    if (input.length === 1) return `0${input}:--`;
    if (input.length === 2) return `${input}:--`;
    if (input.length === 3) return `${input.slice(0, 2)}:0${input.slice(2)}`;
    return `${input.slice(0, 2)}:${input.slice(2, 4)}`;
  };

  const NumberButton = ({ number, onClick }: { number: string, onClick: () => void }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="aspect-square bg-white/10 border border-white/20 rounded-xl text-white font-bold text-xl hover:bg-white/20 transition-all duration-200 flex items-center justify-center"
    >
      {number}
    </motion.button>
  );

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-black/20 border border-white/20 rounded-lg py-3 px-4 pl-12 text-left text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm sm:text-base"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Enter Time</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIs24Hour(!is24Hour)}
                    className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/80 hover:bg-white/20 transition-colors"
                  >
                    {is24Hour ? '24H' : '12H'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Time Display */}
              <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
                <div className="text-3xl font-mono text-white font-bold">
                  {formatTimeDisplay(timeInput)}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  {is24Hour ? '24-hour format' : '12-hour format'}
                </div>
              </div>

              {/* Calculator-style Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <NumberButton
                    key={num}
                    number={num}
                    onClick={() => handleNumberClick(num)}
                  />
                ))}
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClear}
                  className="aspect-square bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 font-bold text-sm hover:bg-red-500/30 transition-all duration-200 flex items-center justify-center"
                >
                  Clear
                </motion.button>
                
                <NumberButton
                  number="0"
                  onClick={() => handleNumberClick('0')}
                />
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackspace}
                  className="aspect-square bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 font-bold text-sm hover:bg-orange-500/30 transition-all duration-200 flex items-center justify-center"
                >
                  ⌫
                </motion.button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTimeInput('');
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={timeInput.length !== 4}
                  className="flex-1 bg-purple-500/80 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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