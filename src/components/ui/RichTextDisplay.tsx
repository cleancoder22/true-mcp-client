import type { Component } from 'solid-js';
import { createSignal, For } from 'solid-js';
import { parseMessageContext, type MessageSegment } from '../../utils/messageParser';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

interface RichTextDisplayProps {
  text: string;
  isUser?: boolean;
  class?: string;
}

/**
 * Component to display text with inline context pills
 * Used for showing #file: and #tool: references as VS Code-style pills
 */
const RichTextDisplay: Component<RichTextDisplayProps> = (props) => {
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());
  
  const segments = () => {
    const parsed = parseMessageContext(props.text);
    return parsed.segments;
  };

  return (
    <div class={`${props.class || 'text-sm leading-relaxed'} whitespace-pre-wrap break-words`}>
      <For each={segments()}>
        {(segment) => {
          if (segment.type === 'text') {
            return <span>{segment.content}</span>;
          } else if (segment.type === 'context' && segment.contextItem) {
            return (
              <span class={`inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md text-xs ${
                props.isUser
                  ? 'bg-white/20 text-white' 
                  : `${themeClasses().bg.primary} text-white shadow-sm`
              } font-medium cursor-default hover:scale-105 transition-transform whitespace-nowrap align-middle`}>
                <span class="text-xs leading-none">{segment.contextItem.icon}</span>
                <span class="font-semibold">{segment.contextItem.label}</span>
                {segment.contextItem.serverBadge && (
                  <span 
                    class="inline-flex items-center px-1 py-0.5 rounded text-xs font-bold text-white ml-0.5"
                    style={`background-color: ${segment.contextItem.serverColor}; font-size: 9px;`}
                  >
                    {segment.contextItem.serverBadge}
                  </span>
                )}
              </span>
            );
          }
          return null;
        }}
      </For>
    </div>
  );
};

export default RichTextDisplay;
