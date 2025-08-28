import type { Component } from 'solid-js';
import { For } from 'solid-js';
import { getMessages } from '../../services/mcpClient';
import { parseMessageContext, hasContextItems } from '../../utils/messageParser';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import RichTextDisplay from '../ui/RichTextDisplay';

const MessageList: Component = () => {
  const messages = getMessages;
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'sent':
        return <div class="w-2 h-2 bg-vscode-accent-success rounded-full"></div>;
      case 'error':
        return <div class="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return null;
    }
  };

  return (
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <For each={messages()}>
        {(message) => {
          return (
            <div class={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user' 
                  ? `${themeClasses().bg.primary} text-white` 
                  : `${themeClasses().bg.elevated} border ${themeClasses().border.primary} ${themeClasses().text.primary}`
              }`}>
                <div class="flex items-start space-x-2">
                  {message.sender === 'server' && (
                    <div class={`w-6 h-6 ${themeClasses().bg.primary} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                      AI
                    </div>
                  )}
                  <div class="flex-1">
                    {/* Render message with inline context pills */}
                    <RichTextDisplay 
                      text={message.text} 
                      isUser={message.sender === 'user'}
                      class="text-sm leading-relaxed"
                    />
                    <div class="flex items-center justify-between mt-2">
                      <span class={`text-xs ${
                        message.sender === 'user' ? 'text-white/70' : themeClasses().text.muted
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </For>
      
      {messages().length === 0 && (
        <div class="text-center text-vscode-text-secondary py-8">
          <p>No messages yet. Start a conversation with your MCP server!</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;
