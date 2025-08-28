import { Component, createSignal, onMount } from 'solid-js';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

const ConnectionStatus: Component = () => {
  const { theme } = useTheme();
  const themeClasses = () => getThemeClasses(theme());
  
  const [mcpStatus, setMcpStatus] = createSignal<'connected' | 'disconnected' | 'checking'>('checking');

  const checkMcpConnection = async () => {
    try {
      // Test connection by making a simple HTTP request to the MCP gateway
      const response = await fetch('/mcp-gateway/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'health-check',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              prompts: {},
              resources: {}
            },
            clientInfo: {
              name: 'SolidJS MCP Health Check',
              version: '1.0.0'
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ MCP Gateway health check successful:', data);
        setMcpStatus('connected');
      } else {
        console.warn('⚠️ MCP Gateway responded with error:', response.status);
        setMcpStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ MCP Gateway health check failed:', error);
      setMcpStatus('disconnected');
    }
  };  onMount(() => {
    checkMcpConnection();
    // Check connection every 10 seconds
    const interval = setInterval(checkMcpConnection, 10000);
    return () => clearInterval(interval);
  });

  const getStatusColor = () => {
    switch (mcpStatus()) {
      case 'connected': return themeClasses().status.connected;
      case 'checking': return themeClasses().status.connecting;
      case 'disconnected': return themeClasses().status.error;
      default: return themeClasses().status.default;
    }
  };

  const getStatusText = () => {
    switch (mcpStatus()) {
      case 'connected': return 'MCP Server Connected';
      case 'checking': return 'Checking MCP Server...';
      case 'disconnected': return 'MCP Server Disconnected';
      default: return 'Unknown Status';
    }
  };

  return (
    <div class={`flex items-center space-x-3 px-4 py-2 rounded-lg ${themeClasses().bg.elevated} border ${themeClasses().border.secondary}`}>
      <div class="flex items-center space-x-2">
        <div class={`w-3 h-3 rounded-full ${getStatusColor()} ${mcpStatus() === 'checking' ? 'animate-pulse' : ''}`}></div>
        <span class={`text-sm font-medium ${themeClasses().text.primary}`}>
          {getStatusText()}
        </span>
      </div>
      
      {mcpStatus() === 'disconnected' && (
        <button
          class={`px-3 py-1 text-xs rounded ${themeClasses().button.secondary} transition-colors`}
          onClick={checkMcpConnection}
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
