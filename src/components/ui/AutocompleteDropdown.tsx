import type { Component } from 'solid-js';
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import type { AutocompleteItem } from '../../services/autocompleteService';

interface AutocompleteDropdownProps {
  items: AutocompleteItem[];
  isVisible: boolean;
  selectedIndex: number;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const AutocompleteDropdown: Component<AutocompleteDropdownProps> = (props) => {
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());
  
  let dropdownRef: HTMLDivElement | undefined;

  // Handle click outside to close dropdown
  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
        props.onClose();
      }
    };

    if (props.isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
    }
  });

  return (
    <Show when={props.isVisible && props.items.length > 0}>
      <div
        ref={dropdownRef}
        class={`absolute z-50 ${themeClasses().bg.elevated} border ${themeClasses().border.secondary} rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-64`}
        style={{
          top: `${props.position.top}px`,
          left: `${props.position.left}px`,
        }}
      >
        {/* Header */}
        <div class={`px-3 py-2 border-b ${themeClasses().border.secondary} ${themeClasses().bg.secondary}`}>
          <span class={`text-xs font-medium ${themeClasses().text.muted}`}>
            {props.items[0]?.type === 'file' ? '📁 Files' : '🔧 Tools'}
          </span>
        </div>

        {/* Items */}
        <div class="py-1">
          <For each={props.items}>
            {(item, index) => (
              <button
                class={`w-full px-3 py-2 text-left flex items-center space-x-3 transition-colors ${
                  item.type === 'error'
                    ? `${themeClasses().text.error} cursor-not-allowed opacity-75`
                    : `hover:${themeClasses().bg.secondary} ${
                        index() === props.selectedIndex 
                          ? `${themeClasses().bg.secondary} border-l-2 ${themeClasses().border.primary}` 
                          : ''
                      }`
                }`}
                onClick={() => item.type !== 'error' && props.onSelect(item)}
                disabled={item.type === 'error'}
                onMouseEnter={() => {
                  // Update selected index on hover
                  // Note: We'd need to expose this from parent, keeping simple for now
                }}
              >
                <span class="text-lg">
                  {item.type === 'error' ? '⚠️' : item.icon}
                </span>
                <div class="flex-1 min-w-0">
                  <div class={`flex items-center gap-2 text-sm font-medium ${
                    item.type === 'error' ? themeClasses().text.error : themeClasses().text.primary
                  }`}>
                    <span class="truncate">{item.label}</span>
                    <Show when={item.serverBadge}>
                      <span 
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white shrink-0"
                        style={{ 
                          'background-color': item.serverColor || '#6f42c1',
                          'font-size': '10px'
                        }}
                      >
                        {item.serverBadge}
                      </span>
                    </Show>
                  </div>
                  <Show when={item.description}>
                    <div class={`text-xs ${
                      item.type === 'error' ? themeClasses().text.error : themeClasses().text.muted
                    } truncate opacity-75`}>
                      {item.description}
                    </div>
                  </Show>
                </div>
                <Show when={item.type === 'file' && item.path}>
                  <div class={`text-xs ${themeClasses().text.muted} opacity-75`}>
                    {item.path}
                  </div>
                </Show>
              </button>
            )}
          </For>
        </div>

        {/* Footer */}
        <div class={`px-3 py-2 border-t ${themeClasses().border.secondary} ${themeClasses().bg.secondary}`}>
          <div class={`text-xs ${themeClasses().text.muted} flex items-center justify-between`}>
            <span>↑↓ navigate • ↵ select • esc close</span>
            <span>{props.items.length} items</span>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default AutocompleteDropdown;
