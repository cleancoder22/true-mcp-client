import type { Component } from 'solid-js';
import { createSignal, createEffect, onMount, For } from 'solid-js';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import AutocompleteDropdown from '../ui/AutocompleteDropdown';
import RichTextDisplay from '../ui/RichTextDisplay';
import {
  getAvailableFiles,
  getAvailableTools,
  getAvailableTables,
  parseAutocompleteContext,
  filterItems,
  filterFiles,
  filterTables,
  getServerInfo,
  type AutocompleteItem
} from '../../services/autocompleteService';
import { parseMessageContext } from '../../utils/messageParser';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: Component<ChatInputProps> = (props) => {
  const [message, setMessage] = createSignal('');
  const [isTyping, setIsTyping] = createSignal(false);
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = createSignal(false);
  const [autocompleteItems, setAutocompleteItems] = createSignal<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [autocompletePosition, setAutocompletePosition] = createSignal({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = createSignal(0);
  const [autocompleteLoading, setAutocompleteLoading] = createSignal(false);
  
  // Cache for autocomplete items (VS Code-like behavior)
  const [filesCache, setFilesCache] = createSignal<AutocompleteItem[]>([]);
  const [toolsCache, setToolsCache] = createSignal<AutocompleteItem[]>([]);
  const [tablesCache, setTablesCache] = createSignal<AutocompleteItem[]>([]);
  const [filesCacheLoaded, setFilesCacheLoaded] = createSignal(false);
  const [toolsCacheLoaded, setToolsCacheLoaded] = createSignal(false);
  const [tablesCacheLoaded, setTablesCacheLoaded] = createSignal(false);
  
  // Selected items state (VS Code-like pills)
  const [selectedItems, setSelectedItems] = createSignal<Array<{
    id: string;
    label: string;
    type: 'file' | 'tool' | 'table';
    icon: string;
    serverBadge?: string;
    serverColor?: string;
  }>>([]);
  
  let textareaRef: HTMLTextAreaElement | undefined;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const trimmedMessage = message().trim();
    if (trimmedMessage && props.onSubmit) {
      // Send the message as-is since all context is already inline
      props.onSubmit(trimmedMessage);
      setMessage('');
      setIsTyping(false);
      setShowAutocomplete(false);
    }
  };

  const updateAutocomplete = async (text: string, cursor: number) => {
    const context = parseAutocompleteContext(text, cursor);
    
    if (context.trigger) {
      try {
        setAutocompleteLoading(true);
        
        let allItems: AutocompleteItem[] = [];
        
        if (context.trigger === 'file') {
          // VS Code-like behavior: Load all files once, then filter locally
          if (!filesCacheLoaded()) {
            console.log('🔄 Loading all files (first time)...');
            const files = await getAvailableFiles();
            setFilesCache(files);
            setFilesCacheLoaded(true);
            allItems = files;
          } else {
            console.log('⚡ Using cached files, filtering locally...');
            allItems = filesCache();
          }
          
          // Filter locally for better performance
          const filteredItems = filterFiles(allItems, context.query);
          setAutocompleteItems(filteredItems);
          
        } else if (context.trigger === 'tool') {
          // Tools - also use caching
          if (!toolsCacheLoaded()) {
            console.log('🔄 Loading all tools (first time)...');
            const tools = await getAvailableTools();
            setToolsCache(tools);
            setToolsCacheLoaded(true);
            allItems = tools;
          } else {
            console.log('⚡ Using cached tools, filtering locally...');
            allItems = toolsCache();
          }
          
          // Filter locally
          const filteredItems = filterItems(allItems, context.query);
          setAutocompleteItems(filteredItems);
          
        } else if (context.trigger === 'db') {
          // Database tables - also use caching
          if (!tablesCacheLoaded()) {
            console.log('🔄 Loading all tables (first time)...');
            const tables = await getAvailableTables();
            setTablesCache(tables);
            setTablesCacheLoaded(true);
            allItems = tables;
          } else {
            console.log('⚡ Using cached tables, filtering locally...');
            allItems = tablesCache();
          }
          
          // Filter locally
          const filteredItems = filterTables(allItems, context.query);
          setAutocompleteItems(filteredItems);
        }
        
        const filteredItems = autocompleteItems();
        if (filteredItems.length > 0) {
          setSelectedIndex(0);
          setShowAutocomplete(true);
          
          // Calculate position for dropdown
          if (textareaRef) {
            const rect = textareaRef.getBoundingClientRect();
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 256;
            
            setAutocompletePosition({
              top: spaceAbove > dropdownHeight ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
              left: rect.left
            });
          }
        } else {
          setShowAutocomplete(false);
        }
      } catch (error) {
        console.error('Failed to fetch autocomplete items:', error);
        setShowAutocomplete(false);
      } finally {
        setAutocompleteLoading(false);
      }
    } else {
      setShowAutocomplete(false);
      setAutocompleteLoading(false);
    }
  };

  // Function to refresh cache when needed
  const refreshFileCache = async () => {
    console.log('🔄 Refreshing file cache...');
    setFilesCacheLoaded(false);
    const files = await getAvailableFiles(true); // Force refresh
    setFilesCache(files);
    setFilesCacheLoaded(true);
  };

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement;
    setMessage(target.value);
    setCursorPosition(target.selectionStart || 0);
    setIsTyping(target.value.length > 0);
    
    // Use async function for autocomplete
    updateAutocomplete(target.value, target.selectionStart || 0);
  };

  const handleSelectionChange = () => {
    if (textareaRef) {
      setCursorPosition(textareaRef.selectionStart || 0);
      // Use async function for autocomplete
      updateAutocomplete(message(), textareaRef.selectionStart || 0);
    }
  };

  const insertAutocompleteItem = (item: AutocompleteItem) => {
    const text = message();
    const cursor = cursorPosition();
    const context = parseAutocompleteContext(text, cursor);
    
    if (context.trigger && context.startPos >= 0) {
      // Always insert as inline context with colon syntax
      const replacement = `#${context.trigger}:${item.label}`;
      
      // Replace the trigger text with the full context reference
      const before = text.substring(0, context.startPos);
      const after = text.substring(cursor);
      const newText = before + replacement + after;
      
      setMessage(newText);
      
      // Update cursor position to end of inserted text
      const newCursorPos = context.startPos + replacement.length;
      setTimeout(() => {
        if (textareaRef) {
          textareaRef.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.focus();
        }
      }, 0);
    }
    
    setShowAutocomplete(false);
  };

  const removeSelectedItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showAutocomplete()) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < autocompleteItems().length - 1 ? prev + 1 : 0
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : autocompleteItems().length - 1
          );
          return;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const selectedItem = autocompleteItems()[selectedIndex()];
          if (selectedItem) {
            insertAutocompleteItem(selectedItem);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setShowAutocomplete(false);
          return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div class="w-full max-w-4xl mx-auto">
      {/* Context Box - Shows all inline context items */}
      {(() => {
        const parsed = parseMessageContext(message());
        return parsed.contextItems.length > 0 && (
          <div class={`mb-4 p-4 ${themeClasses().bg.elevated} border ${themeClasses().border.secondary} rounded-lg shadow-sm`}>
            <div class={`flex items-center gap-2 mb-3 text-sm font-medium ${themeClasses().text.muted}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="opacity-70">
                <path d="M4.75 2.5a.75.75 0 0 0-.75.75v9.5c0 .414.336.75.75.75h6.5a.75.75 0 0 0 .75-.75v-7.378a.25.25 0 0 0-.073-.177L9.427 2.8a.25.25 0 0 0-.177-.073H4.75zM3 3.25C3 2.56 3.56 2 4.25 2h5.086c.464 0 .909.184 1.237.513l2.414 2.414c.329.328.513.773.513 1.237v6.586A1.25 1.25 0 0 1 12.25 14h-8A1.25 1.25 0 0 1 3 12.75V3.25z"/>
              </svg>
              <span>Context • {parsed.contextItems.length} {parsed.contextItems.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <For each={parsed.contextItems}>
                {(item) => (
                  <div 
                    class={`inline-flex items-center gap-2 px-3 py-2 ${themeClasses().bg.secondary} border ${themeClasses().border.secondary} rounded-md text-sm ${themeClasses().text.primary} shadow-sm hover:shadow-md transition-all group cursor-pointer`}
                    title={`${item.type}: ${item.label}`}
                  >
                    <span class="text-base leading-none">{item.icon}</span>
                    <span class="font-medium truncate max-w-[200px]">{item.label}</span>
                    {item.serverBadge && (
                      <span 
                        class={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white ml-1`}
                        style={`background-color: ${item.serverColor}; opacity: 0.9;`}
                      >
                        {item.serverBadge}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        // Remove this specific context item from the message
                        const currentText = message();
                        const itemPattern = new RegExp(`#${item.type}:${item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
                        const newText = currentText.replace(itemPattern, '');
                        setMessage(newText);
                      }}
                      class={`ml-1 p-1 rounded-full ${themeClasses().text.muted} hover:${themeClasses().text.primary} hover:bg-red-500 hover:text-white opacity-60 group-hover:opacity-100 transition-all`}
                      title="Remove from context"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                      </svg>
                    </button>
                  </div>
                )}
              </For>
            </div>
            <div class={`mt-3 pt-3 border-t ${themeClasses().border.secondary} text-xs ${themeClasses().text.muted} flex items-center justify-between`}>
              <span>These items are included in your message</span>
              <button
                type="button"
                onClick={() => {
                  // Remove all context items from the message
                  const currentText = message();
                  const cleanText = currentText.replace(/#(file|tool):[^\s]+\s*/g, '');
                  setMessage(cleanText);
                }}
                class={`text-xs ${themeClasses().text.muted} hover:${themeClasses().text.primary} transition-colors`}
              >
                Clear all
              </button>
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} class="relative">
        <div class={`relative ${themeClasses().bg.secondary} border ${themeClasses().border.secondary} rounded-lg focus-within:${themeClasses().border.primary} transition-colors shadow-lg`}>
          {/* Rich Text Preview Overlay (shows when typing context) */}
          {message() && /#(file|tool):[^\s]+/.test(message()) && (
            <div class={`absolute inset-0 pointer-events-none p-4 pr-12 z-10 ${themeClasses().bg.secondary} rounded-lg overflow-hidden animate-fade-in`}>
              <div class="relative h-full">
                <RichTextDisplay 
                  text={message()} 
                  isUser={false}
                  class="min-h-[60px] max-h-[200px] overflow-y-auto leading-relaxed text-sm whitespace-pre-wrap break-words font-sans"
                />
                {/* Subtle overlay to indicate this is a preview */}
                <div class={`absolute top-2 right-2 text-xs ${themeClasses().text.muted} bg-opacity-90 ${themeClasses().bg.elevated} px-2 py-1 rounded-md shadow-sm border ${themeClasses().border.secondary} animate-pulse-dot`}>
                  <span class="flex items-center gap-1">
                    <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Live Preview
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            value={message()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            placeholder={props.placeholder || "Send a message to your MCP server..."}
            disabled={props.disabled}
            class={`w-full bg-transparent ${themeClasses().text.primary} ${theme() === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} p-4 pr-12 resize-none focus:outline-none min-h-[60px] max-h-[200px] font-sans disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200 ${/#(file|tool):[^\s]+/.test(message()) ? 'opacity-20 text-transparent caret-white' : ''}`}
            rows="1"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message().trim() || props.disabled}
            class={`absolute bottom-3 right-3 w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              message().trim() && !props.disabled
                ? `${themeClasses().bg.primary} hover:${themeClasses().bg.secondary} ${themeClasses().text.primary} shadow-md hover:shadow-lg`
                : `${themeClasses().bg.elevated} ${themeClasses().text.muted} cursor-not-allowed`
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="transform transition-transform hover:scale-105"
            >
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 3.178 4.995a.75.75 0 0 0 1.329-.124L15.964.686z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      <AutocompleteDropdown
        items={autocompleteItems()}
        isVisible={showAutocomplete()}
        selectedIndex={selectedIndex()}
        onSelect={insertAutocompleteItem}
        onClose={() => setShowAutocomplete(false)}
        position={autocompletePosition()}
      />

      {/* Footer Info */}
      <div class={`flex items-center justify-between mt-3 text-xs ${themeClasses().text.muted}`}>
        <span>Type # to reference files/tools • @ for mentions • Enter to send</span>
        <div class="flex items-center gap-2">
          <span class="font-mono">⌘↵</span>
          <div class={`w-2 h-2 ${themeClasses().bg.primary} rounded-full animate-pulse-dot`}></div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
