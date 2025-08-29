import type { Component } from 'solid-js';
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import type { AutocompleteItem } from '../../services/autocompleteService';

interface AutocompleteDropdownProps {
  items: AutocompleteItem[];
  isVisible: boolean;
  selectedIndex: number;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  onSelectedIndexChange?: (index: number) => void;
  position: { top: number; left: number };
}

const AutocompleteDropdown: Component<AutocompleteDropdownProps> = (props) => {
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());
  
  let dropdownRef: HTMLDivElement | undefined;
  let itemsContainerRef: HTMLDivElement | undefined;

  // Scroll selected item into view when selectedIndex changes
  createEffect(() => {
    if (itemsContainerRef && props.isVisible) {
      const selectedButton = itemsContainerRef.children[props.selectedIndex] as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  });

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

  // Calculate dynamic height based on number of items
  const getDropdownHeight = () => {
    const headerHeight = 30; // Header height (reduced further)
    const footerHeight = 30; // Footer height (reduced further)
    const itemHeight = 40; // Approximate height per item (reduced further)
    const maxItems = 5; // Maximum items to show without scrolling
    
    const visibleItems = Math.min(props.items.length, maxItems);
    return headerHeight + (visibleItems * itemHeight) + footerHeight + 4; // Minimal padding
  };

  return (
    <Show when={props.isVisible && props.items.length > 0}>
      <Portal>
        <div
          ref={dropdownRef}
          class={`fixed z-50 ${themeClasses().bg.elevated} border ${themeClasses().border.secondary} rounded-lg shadow-lg overflow-hidden min-w-48 max-w-96`}
          style={{
            top: `${props.position.top - getDropdownHeight() - 4}px`, // Small 4px gap above textarea
            left: `${props.position.left}px`,
            'max-height': props.items.length > 5 ? '260px' : 'auto' // Reduced max height further
          }}
        >
        {/* Header */}
        <div class={`px-3 py-1.5 border-b ${themeClasses().border.secondary} ${themeClasses().bg.secondary}`}>
          <span class={`text-xs font-medium ${themeClasses().text.muted}`}>
            {props.items[0]?.type === 'file' ? '📁 Files' : 
             props.items[0]?.type === 'table' ? '🗃️ Tables' : '🔧 Tools'}
          </span>
        </div>

        {/* Items */}
        <div 
          ref={itemsContainerRef}
          class={`py-1 ${props.items.length > 5 ? 'overflow-y-auto' : ''}`}
          style={props.items.length > 5 ? { 'max-height': '180px' } : {}}
        >
          <For each={props.items}>
            {(item, index) => (
              <button
                class={`w-full px-3 py-1 text-left flex items-center space-x-3 transition-colors ${
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
                  if (item.type !== 'error' && props.onSelectedIndexChange) {
                    props.onSelectedIndexChange(index());
                  }
                }}
              >
                <span class="text-lg shrink-0">
                  {item.type === 'error' ? '⚠️' : item.icon}
                </span>
                <div class="flex-1 min-w-0 flex items-center justify-between">
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
                    <div class={`text-xs ${themeClasses().text.muted} opacity-75 ml-2 shrink-0 max-w-[200px] truncate`}>
                      {item.path}
                    </div>
                  </Show>
                </div>
              </button>
            )}
          </For>
        </div>

        {/* Footer */}
        <div class={`px-3 py-1.5 border-t ${themeClasses().border.secondary} ${themeClasses().bg.secondary}`}>
          <div class={`text-xs ${themeClasses().text.muted} flex items-center justify-between`}>
            <span>↑↓ navigate • ↵ select • esc close</span>
            <span>{props.items.length} items</span>
          </div>
        </div>
        </div>
      </Portal>
    </Show>
  );
};

export default AutocompleteDropdown;
