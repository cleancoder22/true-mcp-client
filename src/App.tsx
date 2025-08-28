import type { Component } from "solid-js";
import { ThemeProvider, useTheme, getThemeClasses } from './contexts/ThemeContext';
import { Header, ChatInput, ConnectionStatus, MessageList, ThemeToggle } from './components';
import { sendMessage, getMessages } from './services/mcpClient';

const AppContent: Component = () => {
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());

  const handleMessageSubmit = async (message: string) => {
    console.log("Message sent:", message);
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div class={`min-h-screen ${themeClasses().bg.primary} ${themeClasses().text.primary} flex flex-col`}>
      {/* Header with Connection Status */}
      <div class={`${themeClasses().bg.secondary} ${themeClasses().border.secondary} border-b px-6 py-4`}>
        <div class="flex items-center justify-between">
          <div>
            <h1 class={`text-lg font-semibold ${themeClasses().text.primary}`}>MCP Client Chat</h1>
            <p class={`text-sm ${themeClasses().text.muted}`}>Powered by Model Context Protocol</p>
          </div>
          <div class="flex items-center space-x-3">
            <ThemeToggle />
            <ConnectionStatus />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div class="flex-1 flex flex-col">
        {/* Messages */}
        <MessageList />
        
        {/* Chat Input - Centered when no messages, bottom when messages exist */}
        <div class={`${getMessages().length === 0 ? 'flex-1 flex items-center justify-center' : `border-t ${themeClasses().border.secondary} ${themeClasses().bg.secondary}`} p-4`}>
          <div class="max-w-4xl mx-auto w-full">
            <ChatInput 
              onSubmit={handleMessageSubmit}
              placeholder="Send a message to your MCP server..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: Component = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
