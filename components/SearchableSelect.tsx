
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onAddNew?: () => void;
  placeholder: string;
  label: string;
  addNewText: string;
  loading?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options, value, onChange, onAddNew, placeholder, label, addNewText, loading
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef} dir="rtl">
      <label className="block text-sm font-bold text-gray-600 mb-2">{label}</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 bg-gray-50 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${isOpen ? 'border-primary-500 ring-4 ring-primary-500/10' : 'hover:border-gray-300'}`}
      >
        <span className={selectedOption ? 'text-gray-800 font-bold' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b bg-gray-50/50 relative">
            <Search size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              autoFocus
              className="w-full pr-10 pl-3 py-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="ابحث هنا..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary-50 transition-colors ${value === opt.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
                >
                  <div>
                    <div className="font-bold">{opt.label}</div>
                    {opt.subLabel && <div className="text-[10px] opacity-60">{opt.subLabel}</div>}
                  </div>
                  {value === opt.id && <Check size={16} />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm mb-3">لم يتم العثور على نتائج</p>
                {onAddNew && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNew();
                      setIsOpen(false);
                    }}
                    className="w-full py-2 bg-primary-100 text-primary-700 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-200 transition-colors"
                  >
                    <Plus size={14} /> {addNewText}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
