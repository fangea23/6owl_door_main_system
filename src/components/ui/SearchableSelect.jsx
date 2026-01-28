import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

/**
 * 可搜尋的下拉選單元件
 * @param {Object} props
 * @param {Array} props.options - 選項陣列 [{ value, label, subLabel? }]
 * @param {string} props.value - 當前選中的值
 * @param {function} props.onChange - 值改變時的回調函數 (value) => void
 * @param {string} props.placeholder - 預設顯示文字
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否載入中
 * @param {string} props.loadingText - 載入中的文字
 * @param {boolean} props.required - 是否必填
 * @param {string} props.emptyText - 無選項時的提示文字
 * @param {boolean} props.allowManualInput - 是否允許手動輸入（選擇「其他」後）
 * @param {string} props.manualInputPlaceholder - 手動輸入的placeholder
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '請選擇',
  disabled = false,
  loading = false,
  loadingText = '載入中...',
  required = false,
  emptyText = '無可選項目',
  allowManualInput = false,
  manualInputPlaceholder = '請手動輸入',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 篩選選項
  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    const labelMatch = option.label?.toLowerCase().includes(searchLower);
    const subLabelMatch = option.subLabel?.toLowerCase().includes(searchLower);
    const valueMatch = String(option.value)?.toLowerCase().includes(searchLower);
    return labelMatch || subLabelMatch || valueMatch;
  });

  // 取得顯示的標籤
  const getDisplayLabel = () => {
    if (isManualMode && manualValue) {
      return manualValue;
    }
    if (value) {
      const selectedOption = options.find(opt => String(opt.value) === String(value));
      if (selectedOption) {
        return selectedOption.subLabel
          ? `${selectedOption.subLabel} ${selectedOption.label}`
          : selectedOption.label;
      }
    }
    return '';
  };

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 開啟時聚焦搜尋框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 搜尋字變化時重置 highlighted index
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // 自動捲動到高亮項目
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedItem = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // 鍵盤導航處理
  const handleKeyDown = (e) => {
    if (!isOpen) {
      // 下拉選單關閉時，按任意鍵或向下鍵開啟
      if (e.key === 'ArrowDown' || e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const maxIndex = allowManualInput ? filteredOptions.length : filteredOptions.length - 1;
          return prev < maxIndex ? prev + 1 : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0) {
          if (highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex].value);
          } else if (allowManualInput && highlightedIndex === filteredOptions.length) {
            handleSelect('__manual__');
          }
        }
        break;
      case 'Tab':
        // Tab 選擇當前項目並移到下一個欄位
        if (filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (allowManualInput && highlightedIndex === filteredOptions.length) {
          handleSelect('__manual__');
        } else {
          setIsOpen(false);
          setSearchTerm('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // 處理選擇
  const handleSelect = (optionValue) => {
    if (optionValue === '__manual__') {
      setIsManualMode(true);
      setManualValue('');
      setIsOpen(false);
      setSearchTerm('');
      onChange('');
    } else {
      setIsManualMode(false);
      setManualValue('');
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // 處理手動輸入
  const handleManualInputChange = (e) => {
    const newValue = e.target.value;
    setManualValue(newValue);
    onChange(newValue);
  };

  // 清除選擇
  const handleClear = (e) => {
    e.stopPropagation();
    setIsManualMode(false);
    setManualValue('');
    onChange('');
    setSearchTerm('');
  };

  if (isManualMode) {
    return (
      <div className="relative">
        <input
          type="text"
          value={manualValue}
          onChange={handleManualInputChange}
          placeholder={manualInputPlaceholder}
          className={`w-full rounded-lg border-gray-300 p-3 border bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm ${className}`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setIsManualMode(false);
            setManualValue('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`
          w-full rounded-lg border p-3 bg-white text-left flex items-center justify-between
          ${disabled || loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-blue-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm
        `}
      >
        <span className={`truncate ${!getDisplayLabel() ? 'text-gray-400' : 'text-gray-900'}`}>
          {loading ? loadingText : (getDisplayLabel() || placeholder)}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 清除按鈕 */}
      {value && !disabled && !loading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={14} />
        </button>
      )}

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* 搜尋框 */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入關鍵字搜尋..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* 鍵盤操作提示 */}
            <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-gray-400">
              <span>↑↓ 選擇</span>
              <span>Enter 確認</span>
              <span>Tab 選擇並下一欄</span>
              <span>Esc 關閉</span>
            </div>
          </div>

          {/* 選項列表 */}
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? '找不到符合的項目' : emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = String(option.value) === String(value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    data-index={index}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full px-4 py-2.5 text-left flex items-center justify-between text-sm
                      ${isHighlighted ? 'bg-blue-100' : ''}
                      ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
                      transition-colors
                    `}
                  >
                    <div className="flex flex-col">
                      <span className={`${isSelected ? 'font-semibold' : ''}`}>
                        {option.subLabel && (
                          <span className="text-gray-500 mr-1">{option.subLabel}</span>
                        )}
                        {option.label}
                      </span>
                    </div>
                    {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}

            {/* 手動輸入選項 */}
            {allowManualInput && (
              <button
                type="button"
                data-index={filteredOptions.length}
                onClick={() => handleSelect('__manual__')}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`w-full px-4 py-2.5 text-left text-sm text-gray-600 border-t border-gray-100 flex items-center gap-2 ${highlightedIndex === filteredOptions.length ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
              >
                <span className="text-gray-400">其他 /</span>
                <span>手動輸入</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
