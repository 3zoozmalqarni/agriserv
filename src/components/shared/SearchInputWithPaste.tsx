import { Clipboard, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface SearchInputWithPasteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: 'search' | 'none';
}

export default function SearchInputWithPaste({
  value,
  onChange,
  placeholder = 'ابحث...',
  className = '',
  icon = 'search'
}: SearchInputWithPasteProps) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onChange(text.trim());
        toast.success('تم اللصق بنجاح');
      } else {
        toast.error('الحافظة فارغة');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('فشل اللصق من الحافظة. الرجاء استخدام Ctrl+V أو Command+V للصق', {
        duration: 4000
      });
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-transparent focus:outline-[#61bf69] ${
          icon === 'search' ? 'pr-20' : 'pr-12'
        } ${value ? 'pl-10' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
          title="مسح النص"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          type="button"
          onClick={handlePaste}
          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-gray-100 rounded transition-all duration-200"
          title="لصق من الحافظة"
        >
          <Clipboard className="w-5 h-5" />
        </button>
        {icon === 'search' && (
          <Search className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
}
