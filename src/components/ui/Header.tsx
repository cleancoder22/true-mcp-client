import type { Component } from 'solid-js';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="bg-vscode-bg-elevated border-b border-vscode-border-primary px-6 py-4 shadow-sm">
      <h1 class="text-lg font-semibold text-vscode-text-primary">
        {props.title || "MCP Client Chat"}
      </h1>
      <p class="text-sm text-vscode-text-secondary">
        {props.subtitle || "Powered by Model Context Protocol"}
      </p>
    </div>
  );
};

export default Header;
