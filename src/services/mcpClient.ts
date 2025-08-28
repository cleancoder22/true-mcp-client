import { createSignal, type Accessor } from 'solid-js';

export interface MCPMessage {
  id: string;
  text: string;
  sender: 'user' | 'server';
  timestamp: Date;
}

// Reactive state
const [connectionStatus, setConnectionStatus] = createSignal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const [messages, setMessages] = createSignal<MCPMessage[]>([]);
const [currentServer, setCurrentServer] = createSignal<string>('');

// MCP Session Management - HTTP streamable transport
let sessionId = '';

// Export reactive accessors
export const getConnectionStatus: Accessor<'disconnected' | 'connecting' | 'connected' | 'error'> = connectionStatus;
export const getMessages: Accessor<MCPMessage[]> = messages;
export const getCurrentServer: Accessor<string> = currentServer;

function addMessage(message: MCPMessage): void {
  setMessages(prev => [...prev, message]);
}

export const initializeMcpSession = async (): Promise<void> => {
  try {
    console.log('🔗 Initializing MCP session...');
    
    const response = await fetch('/mcp-gateway/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'initialize',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            prompts: {},
            resources: {}
          },
          clientInfo: {
            name: 'SolidJS MCP Client',
            version: '1.0.0'
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Extract session ID from headers
    const mcpSessionId = response.headers.get('mcp-session-id');
    if (mcpSessionId) {
      sessionId = mcpSessionId;
      console.log('✅ MCP session initialized:', sessionId);
    }

    const data = await response.json();
    console.log('🔗 Server capabilities:', data.result);
  } catch (error) {
    console.error('❌ Error initializing MCP session:', error);
    throw error;
  }
};

export const listAvailableTools = async (): Promise<any> => {
  try {
    console.log('📋 Listing available tools...');
    
    // Initialize session if not already done
    if (!sessionId) {
      await initializeMcpSession();
    }
    
    const response = await fetch('/mcp-gateway/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'list-tools',
        method: 'tools/list',
        params: {}
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔧 Available tools:', data);
    return data;
  } catch (error) {
    console.error('❌ Error listing tools:', error);
    throw error;
  }
};

export const callMcpTool = async (toolName: string, params: any): Promise<any> => {
  try {
    console.log('🔧 Calling MCP tool:', toolName, 'with params:', params);
    
    // Initialize session if not already done
    if (!sessionId) {
      await initializeMcpSession();
    }
    
    const response = await fetch('/mcp-gateway/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `tool-${toolName}-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔧 Tool result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error calling tool:', error);
    throw error;
  }
};

export async function connectToServer(serverUrl: string): Promise<void> {
  try {
    console.log('🔌 Attempting to connect to:', serverUrl);
    setConnectionStatus('connecting');
    setCurrentServer(serverUrl);

    // Test connection by initializing MCP session
    await initializeMcpSession();
    
    // Test that tools listing works
    const toolsResult = await listAvailableTools();
    const toolCount = toolsResult.result?.tools?.length || 0;
    
    setConnectionStatus('connected');
    
    addMessage({
      id: crypto.randomUUID(),
      text: `✅ Connected to Docker MCP Gateway!

🔧 **Available Services:**
• **GitHub Official** - 90 tools for repository management
• **FileSystem** - 11 tools for directory and file operations

🚀 **Try these commands:**
• "list tools" - Show all available MCP tools
• "github help" - GitHub-specific operations  
• "file operations" - FileSystem capabilities
• "what can you do?" - General help

**Status:** Connected to real Docker MCP Gateway with ${toolCount} total tools!
**Session:** ${sessionId}`,
      sender: 'server',
      timestamp: new Date()
    });

  } catch (error) {
    setConnectionStatus('error');
    console.error('Failed to connect to MCP server:', error);
    
    addMessage({
      id: crypto.randomUUID(),
      text: `❌ Failed to connect to Docker MCP Gateway at ${serverUrl}

**Troubleshooting:**
• Make sure the Docker MCP Gateway is running
• Try: \`docker mcp gateway run --port 8081 --transport streaming\`
• Check that port 8081 is not blocked by firewall
• Verify the server URL is correct (e.g., localhost:8081)

**Debug Info:**
• Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sender: 'server',
      timestamp: new Date()
    });
  }
}

export async function disconnectFromServer(): Promise<void> {
  try {
    sessionId = '';
    setConnectionStatus('disconnected');
    setCurrentServer('');
    
    // Add disconnection message
    addMessage({
      id: crypto.randomUUID(),
      text: 'Disconnected from MCP server',
      sender: 'server',
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error disconnecting:', error);
  }
}

export async function sendMessage(text: string): Promise<void> {
  try {
    // Add user message
    addMessage({
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date()
    });

    console.log('📤 Sending message:', text);

    // Handle different types of messages
    if (text.toLowerCase().includes('list tools') || text.toLowerCase().includes('available tools')) {
      const toolsResult = await listAvailableTools();
      const tools = toolsResult.result?.tools || [];
      
      const toolsList = tools.slice(0, 10).map((tool: any, index: number) => 
        `${index + 1}. **${tool.name}** - ${tool.description}`
      ).join('\n');
      
      const remainingCount = tools.length - 10;
      const moreText = remainingCount > 0 ? `\n\n... and ${remainingCount} more tools!` : '';
      
      addMessage({
        id: crypto.randomUUID(),
        text: `🔧 **Available MCP Tools** (showing first 10 of ${tools.length}):

${toolsList}${moreText}

💡 **Popular tools include:**
• create_issue, list_issues, get_issue
• create_pull_request, list_pull_requests  
• search_code, search_repositories
• create_file, edit_file, read_file
• list_directory, directory_tree`,
        sender: 'server',
        timestamp: new Date()
      });
    } else {
      // For other messages, provide general help
      addMessage({
        id: crypto.randomUUID(),
        text: `🤖 **MCP Client Connected**

I'm connected to the Docker MCP Gateway with access to 101 tools!

**Available commands:**
• "list tools" - Show available MCP tools
• "help" - Show this help message

**Current capabilities:**
• ✅ GitHub repository management (90 tools)
• ✅ File system operations (11 tools)
• ✅ Real-time MCP communication

Try asking me to "list tools" to see what's available!`,
        sender: 'server',
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error('Error sending message:', error);
    addMessage({
      id: crypto.randomUUID(),
      text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sender: 'server',
      timestamp: new Date()
    });
  }
}

export async function clearMessages(): Promise<void> {
  setMessages([]);
}