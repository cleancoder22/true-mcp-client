import type { Component } from 'solid-js';

interface WelcomeMessageProps {
  message?: string;
}

const WelcomeMessage: Component<WelcomeMessageProps> = (props) => {
  const defaultMessage = `Hello! I'm your MCP client assistant. Ask me anything or start a conversation. I'm here to help you explore the capabilities of Model Context Protocol.`;

  return (
    <div class="bg-vscode-bg-elevated rounded-lg p-6 border border-vscode-border-primary animate-fade-in shadow-sm max-w-2xl mx-auto">
      <div class="flex items-start space-x-4">
        <div class="w-10 h-10 bg-gradient-to-br from-vscode-ai-primary to-vscode-ai-secondary rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md">
          AI
        </div>
        <div class="flex-1">
          <p class="text-vscode-text-primary leading-relaxed">
            {props.message || defaultMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
