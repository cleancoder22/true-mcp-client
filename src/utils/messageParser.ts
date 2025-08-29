import { getServerInfo } from '../services/autocompleteService';

export interface ContextItem {
  id: string;
  label: string;
  type: 'file' | 'tool' | 'table';
  icon: string;
  serverBadge?: string;
  serverColor?: string;
}

export interface MessageSegment {
  type: 'text' | 'context';
  content: string;
  contextItem?: ContextItem;
}

export interface ParsedMessage {
  contextItems: ContextItem[];
  messageText: string;
  segments: MessageSegment[]; // For inline rendering
}

/**
 * Parse a message to extract context items and create renderable segments
 * Handles patterns like: "Please use #tool:create_file for #file:package.json and #db:users table"
 */
export function parseMessageContext(message: string): ParsedMessage {
  const contextItems: ContextItem[] = [];
  const segments: MessageSegment[] = [];
  
  // Regex to match #file:filename, #tool:toolname, or #db:tablename patterns
  const contextRegex = /#(file|tool|db):([^\s]+)/g;
  
  let lastIndex = 0;
  let match;
  const foundItems = new Set<string>(); // Prevent duplicates
  
  while ((match = contextRegex.exec(message)) !== null) {
    const [fullMatch, type, label] = match;
    const itemId = `${type}:${label}`;
    
    // Add text before this match
    if (match.index > lastIndex) {
      const textContent = message.substring(lastIndex, match.index);
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // Create context item if not already found
    let contextItem: ContextItem;
    if (!foundItems.has(itemId)) {
      foundItems.add(itemId);
      
      let serverInfo;
      let icon: string;
      
      if (type === 'db') {
        // Database table
        serverInfo = { badge: 'sqlite', color: '#003B57' };
        icon = '🗃️';
      } else {
        // File or tool
        serverInfo = getServerInfo(label);
        icon = type === 'file' ? '📄' : '🔧';
      }
      
      contextItem = {
        id: itemId,
        label,
        type: type as 'file' | 'tool' | 'table',
        icon,
        serverBadge: serverInfo.badge,
        serverColor: serverInfo.color
      };
      
      contextItems.push(contextItem);
    } else {
      // Find existing context item
      contextItem = contextItems.find(item => item.id === itemId)!;
    }
    
    // Add context segment
    segments.push({
      type: 'context',
      content: fullMatch,
      contextItem
    });
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text after last match
  if (lastIndex < message.length) {
    const remainingText = message.substring(lastIndex);
    if (remainingText) {
      segments.push({
        type: 'text',
        content: remainingText
      });
    }
  }
  
  // If no context items found, treat entire message as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: message
    });
  }
  
  // Remove all context items from the message text for backward compatibility
  const messageText = message.replace(contextRegex, '').trim();
  
  return {
    contextItems,
    messageText,
    segments
  };
}

/**
 * Check if a message contains any context items
 */
export function hasContextItems(message: string): boolean {
  const contextRegex = /#(file|tool):[^\s]+/;
  return contextRegex.test(message);
}
