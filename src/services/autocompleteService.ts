import { listAvailableTools, callMcpTool } from './mcpClient';

export interface AutocompleteItem {
  id: string;
  label: string;
  description?: string;
  type: 'file' | 'tool' | 'command' | 'error' | 'table';
  path?: string;
  icon?: string;
  serverBadge?: string;
  serverColor?: string;
}

// Cache for file listings to avoid repeated API calls
let filesCache: AutocompleteItem[] | null = null;
let filesCacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Cache for database tables
let tablesCache: AutocompleteItem[] | null = null;
let tablesCacheTimestamp: number = 0;

// Determine MCP server type based on tool name
export function getServerInfo(toolName: string): { badge: string; color: string } {
  // Notion tools (API- prefix)
  const notionTools = [
    'API-create-a-comment', 'API-create-a-database', 'API-delete-a-block', 'API-get-block-children',
    'API-get-self', 'API-get-user', 'API-get-users', 'API-patch-block-children', 'API-patch-page',
    'API-post-database-query', 'API-post-page', 'API-post-search', 'API-retrieve-a-block',
    'API-retrieve-a-comment', 'API-retrieve-a-database', 'API-retrieve-a-page',
    'API-retrieve-a-page-property', 'API-update-a-block', 'API-update-a-database'
  ];

  // SQLite tools
  const sqliteTools = [
    'append_insight', 'create_table', 'describe_table', 'list_tables', 'read_query', 'write_query'
  ];

  // GitHub tools
  const githubTools = [
    'add_comment_to_pending_review', 'add_issue_comment', 'add_sub_issue', 'assign_copilot_to_issue',
    'cancel_workflow_run', 'create_and_submit_pull_request_review', 'create_branch', 'create_gist',
    'create_issue', 'create_or_update_file', 'create_pending_pull_request_review', 'create_pull_request',
    'create_repository', 'delete_file', 'delete_pending_pull_request_review', 'delete_workflow_run_logs',
    'dismiss_notification', 'download_workflow_run_artifact', 'fork_repository', 'get_code_scanning_alert',
    'get_commit', 'get_dependabot_alert', 'get_discussion', 'get_discussion_comments', 'get_file_contents',
    'get_issue', 'get_issue_comments', 'get_job_logs', 'get_latest_release', 'get_me',
    'get_notification_details', 'get_pull_request', 'get_pull_request_comments', 'get_pull_request_diff',
    'get_pull_request_files', 'get_pull_request_reviews', 'get_pull_request_status', 'get_release_by_tag',
    'get_secret_scanning_alert', 'get_tag', 'get_team_members', 'get_teams', 'get_workflow_run', 'get_workflow_run_logs',
    'get_workflow_run_usage', 'list_branches', 'list_code_scanning_alerts', 'list_commits',
    'list_dependabot_alerts', 'list_discussion_categories', 'list_discussions', 'list_gists',
    'list_issue_types', 'list_issues', 'list_notifications', 'list_pull_requests', 'list_releases',
    'list_secret_scanning_alerts', 'list_sub_issues', 'list_tags', 'list_workflow_jobs',
    'list_workflow_run_artifacts', 'list_workflow_runs', 'list_workflows', 'manage_notification_subscription',
    'manage_repository_notification_subscription', 'mark_all_notifications_read', 'merge_pull_request',
    'push_files', 'remove_sub_issue', 'reprioritize_sub_issue', 'request_copilot_review',
    'rerun_failed_jobs', 'rerun_workflow_run', 'run_workflow', 'search_code', 'search_issues',
    'search_orgs', 'search_pull_requests', 'search_repositories', 'search_users',
    'submit_pending_pull_request_review', 'update_gist', 'update_issue', 'update_pull_request',
    'update_pull_request_branch'
  ];

  // Filesystem tools
  const filesystemTools = [
    'create_directory', 'directory_tree', 'edit_file', 'get_file_info', 'list_allowed_directories',
    'list_directory', 'move_file', 'read_file', 'read_multiple_files', 'search_files', 'write_file'
  ];

  // Check tool patterns in order of specificity
  if (notionTools.includes(toolName)) {
    return { badge: 'notion', color: '#000000' };
  } else if (sqliteTools.includes(toolName)) {
    return { badge: 'sqlite', color: '#003B57' };
  } else if (githubTools.includes(toolName)) {
    return { badge: 'github', color: '#24292e' };
  } else if (filesystemTools.includes(toolName)) {
    return { badge: 'filesystem', color: '#0366d6' };
  } else {
    return { badge: 'mcp', color: '#6f42c1' };
  }
}

// Recursively get all files from a directory
async function getAllFilesRecursively(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<AutocompleteItem[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const files: AutocompleteItem[] = [];
  
  try {
    const dirResult = await callMcpTool('list_directory', { path: dirPath });
    if (dirResult?.result?.content?.[0]?.text) {
      const dirContentsText = dirResult.result.content[0].text;
      const contentLines = dirContentsText.split('\n').filter((line: string) => line.trim());
      
      for (const line of contentLines) {
        const match = line.match(/^\[(FILE|DIR)\]\s+(.+)$/);
        if (match) {
          const [, type, name] = match;
          const isDirectory = type === 'DIR';
          const fullPath = `${dirPath}/${name}`;
          
          // Skip hidden files and common build/cache directories
          if (name.startsWith('.') && !name.match(/\.(env|gitignore|vscode)$/)) {
            continue;
          }
          if (['node_modules', 'dist', 'build', '.git', '.vscode'].includes(name)) {
            continue;
          }
          
          files.push({
            id: `file-${fullPath}`,
            label: isDirectory ? `${name}/` : name,
            description: `${isDirectory ? 'Directory' : 'File'}: ${fullPath}`,
            type: 'file',
            path: fullPath,
            icon: isDirectory ? '📁' : getFileIcon(name),
            // No serverBadge for files to reduce clutter
          });
          
          // Recursively get subdirectory contents
          if (isDirectory) {
            const subFiles = await getAllFilesRecursively(fullPath, maxDepth, currentDepth + 1);
            files.push(...subFiles);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Error listing directory ${dirPath}:`, error);
  }
  
  return files;
}

// Get available files from MCP filesystem server (with caching)
export async function getAvailableFiles(forceRefresh: boolean = false): Promise<AutocompleteItem[]> {
  // Return cached results if available and not expired
  const now = Date.now();
  if (!forceRefresh && filesCache && (now - filesCacheTimestamp) < CACHE_DURATION) {
    console.log('📂 Returning cached files');
    return filesCache;
  }

  try {
    console.log('📂 Fetching all files from MCP filesystem...');
    
    // First, let's get the list of allowed directories
    const allowedDirsResult = await callMcpTool('list_allowed_directories', {});
    
    if (allowedDirsResult?.result?.content?.[0]?.text) {
      const allowedDirsText = allowedDirsResult.result.content[0].text;
      console.log('Allowed directories text:', allowedDirsText);
      
      // Extract directory paths from the text
      const lines = allowedDirsText.split('\n');
      const allowedDirs = lines.slice(1).filter((line: string) => line.trim() && !line.startsWith('Allowed directories:'));
      
      const allFiles: AutocompleteItem[] = [];
      
      // For each allowed directory, get ALL files recursively
      for (const dir of allowedDirs) {
        console.log(`📂 Scanning directory: ${dir.trim()}`);
        const files = await getAllFilesRecursively(dir.trim());
        allFiles.push(...files);
      }
      
      // Cache the results
      filesCache = allFiles.length > 0 ? allFiles : [{
        id: 'no-files',
        label: 'No files found',
        type: 'error' as const,
        description: 'No accessible files found in allowed directories'
      }];
      filesCacheTimestamp = now;
      
      console.log(`📂 Cached ${allFiles.length} files and directories`);
      return filesCache;
    }
    
    const errorResult: AutocompleteItem[] = [{
      id: 'no-dirs',
      label: 'No directories accessible',
      type: 'error' as const,
      description: 'No allowed directories found'
    }];
    
    filesCache = errorResult;
    filesCacheTimestamp = now;
    return errorResult;
    
  } catch (error) {
    console.error('Error getting files:', error);
    const errorResult: AutocompleteItem[] = [{
      id: 'not-connected',
      label: 'Not connected to MCP server',
      type: 'error' as const,
      description: 'Please check your MCP server connection'
    }];
    
    filesCache = errorResult;
    filesCacheTimestamp = now;
    return errorResult;
  }
}

// Get available database tables from SQLite MCP server (with caching)
export async function getAvailableTables(forceRefresh: boolean = false): Promise<AutocompleteItem[]> {
  // Return cached results if available and not expired
  const now = Date.now();
  if (!forceRefresh && tablesCache && (now - tablesCacheTimestamp) < CACHE_DURATION) {
    console.log('🗃️ Returning cached tables');
    return tablesCache;
  }

  try {
    console.log('🗃️ Fetching tables from SQLite database...');
    
    const tablesResult = await callMcpTool('list_tables', {});
    
    if (tablesResult?.result?.content?.[0]?.text) {
      const tablesText = tablesResult.result.content[0].text;
      console.log('Tables result:', tablesText);
      
      // Parse the table names from the result
      const lines = tablesText.split('\n').filter((line: string) => line.trim());
      const tables: AutocompleteItem[] = [];
      
      for (const line of lines) {
        // Skip headers and empty lines
        if (line.includes('Table Name') || line.includes('---') || !line.trim()) {
          continue;
        }
        
        const tableName = line.trim();
        if (tableName) {
          tables.push({
            id: `table-${tableName}`,
            label: tableName,
            description: `Database table: ${tableName}`,
            type: 'table',
            icon: '🗃️',
            serverBadge: 'sqlite',
            serverColor: '#003B57'
          });
        }
      }
      
      // Cache the results
      tablesCache = tables;
      tablesCacheTimestamp = now;
      
      console.log(`🗃️ Found ${tables.length} tables`);
      return tables;
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [{
      id: 'db-error',
      label: 'Error fetching tables',
      description: 'Could not connect to SQLite database',
      type: 'error',
      icon: '⚠️',
      serverBadge: 'sqlite',
      serverColor: '#dc3545'
    }];
  }
  
  return [];
}

// Filter files based on search query (for local filtering)
export function filterFiles(files: AutocompleteItem[], query: string): AutocompleteItem[] {
  if (!query || query === '#files') {
    return files;
  }
  
  // Remove '#files' prefix and any spaces
  const searchTerm = query.replace(/^#files\s*/, '').toLowerCase();
  
  if (!searchTerm) {
    return files;
  }
  
  return files.filter(file => {
    const label = file.label.toLowerCase();
    const path = file.path?.toLowerCase() || '';
    const description = file.description?.toLowerCase() || '';
    const serverBadge = file.serverBadge?.toLowerCase() || '';
    
    return label.includes(searchTerm) || 
           path.includes(searchTerm) || 
           description.includes(searchTerm) ||
           serverBadge.includes(searchTerm) ||
           // Support filtering by file type
           (searchTerm === 'files' && file.type === 'file') ||
           (searchTerm === 'directories' && label.endsWith('/')) ||
           (searchTerm === 'folders' && label.endsWith('/'));
  });
}

// Filter tables based on query
export const filterTables = (tables: AutocompleteItem[], query: string): AutocompleteItem[] => {
  if (!query || query === '#db') {
    return tables;
  }
  
  // Remove '#db' prefix and any spaces
  const searchTerm = query.replace(/^#db\s*/, '').toLowerCase();
  
  if (!searchTerm) {
    return tables;
  }
  
  return tables.filter(table => {
    const label = table.label.toLowerCase();
    const description = table.description?.toLowerCase() || '';
    
    return label.includes(searchTerm) || 
           description.includes(searchTerm);
  });
};

// Get available tools from MCP server
export const getAvailableTools = async (): Promise<AutocompleteItem[]> => {
  try {
    const result = await listAvailableTools();
    const tools = result.result?.tools || [];
    
    // If no tools returned, MCP server is not connected
    if (tools.length === 0) {
      return [{
        id: 'not-connected',
        label: 'Not connected to MCP server',
        type: 'error',
        description: 'Please check your MCP server connection'
      }];
    }

    return tools.map((tool: any, index: number) => {
      const serverInfo = getServerInfo(tool.name);
      return {
        id: `tool-${index}`,
        label: tool.name,
        description: tool.description,
        type: 'tool' as const,
        icon: '🔧',
        serverBadge: serverInfo.badge,
        serverColor: serverInfo.color
      };
    });
  } catch (error) {
    console.error('Error getting tools:', error);
    return [{
      id: 'error',
      label: 'Error loading tools',
      type: 'error',
      description: 'Failed to fetch tools from MCP server'
    }];
  }
};

// Helper function to get file icon based on extension
const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return '📘';
    case 'js':
    case 'jsx':
      return '📄';
    case 'json':
      return '📦';
    case 'md':
      return '📖';
    case 'css':
      return '🎨';
    case 'html':
      return '🌐';
    default:
      if (fileName.includes('config')) return '⚙️';
      return '📄';
  }
};

// Parse autocomplete trigger from text
export const parseAutocompleteContext = (text: string, cursorPosition: number): {
  trigger: 'file' | 'tool' | 'db' | null;
  query: string;
  startPos: number;
} => {
  const beforeCursor = text.substring(0, cursorPosition);
  
  // Find the last occurrence of # before cursor
  const lastHashIndex = beforeCursor.lastIndexOf('#');
  
  if (lastHashIndex === -1) {
    return { trigger: null, query: '', startPos: -1 };
  }
  
  // Get text after the #
  const afterHash = beforeCursor.substring(lastHashIndex + 1);
  
  // Check if we're in the middle of a word or at a boundary
  const charBeforeHash = lastHashIndex > 0 ? beforeCursor[lastHashIndex - 1] : ' ';
  const isValidTrigger = charBeforeHash === ' ' || charBeforeHash === '\n' || lastHashIndex === 0;
  
  if (!isValidTrigger) {
    return { trigger: null, query: '', startPos: -1 };
  }
  
  // Check if it's a valid trigger (support both singular/plural and colon syntax)
  if (afterHash.startsWith('files:')) {
    const query = afterHash.substring(6); // Get query after 'files:'
    return { trigger: 'file', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('file:')) {
    const query = afterHash.substring(5); // Get query after 'file:'
    return { trigger: 'file', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('tools:')) {
    const query = afterHash.substring(6); // Get query after 'tools:'
    return { trigger: 'tool', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('tool:')) {
    const query = afterHash.substring(5); // Get query after 'tool:'
    return { trigger: 'tool', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('db:')) {
    const query = afterHash.substring(3); // Get query after 'db:'
    return { trigger: 'db', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('files')) {
    const query = `#files${afterHash.substring(5)}`; // Include the full trigger + query
    return { trigger: 'file', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('file')) {
    const query = `#file${afterHash.substring(4)}`; // Include the full trigger + query
    return { trigger: 'file', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('tools')) {
    const query = `#tools${afterHash.substring(5)}`; // Include the full trigger + query
    return { trigger: 'tool', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('tool')) {
    const query = `#tool${afterHash.substring(4)}`; // Include the full trigger + query
    return { trigger: 'tool', query, startPos: lastHashIndex };
  } else if (afterHash.startsWith('db')) {
    const query = `#db${afterHash.substring(2)}`; // Include the full trigger + query
    return { trigger: 'db', query, startPos: lastHashIndex };
  }
  
  // Check if we're still typing the trigger
  if ('files'.startsWith(afterHash) || 'file'.startsWith(afterHash) || 
      'tools'.startsWith(afterHash) || 'tool'.startsWith(afterHash) ||
      'db'.startsWith(afterHash)) {
    return { 
      trigger: afterHash.length > 0 ? 
        (afterHash.startsWith('f') ? 'file' : 
         afterHash.startsWith('t') ? 'tool' :
         afterHash.startsWith('d') ? 'db' : null) : null, 
      query: `#${afterHash}`, 
      startPos: lastHashIndex 
    };
  }
  
  return { trigger: null, query: '', startPos: -1 };
};

// Filter items based on query
export const filterItems = (items: AutocompleteItem[], query: string): AutocompleteItem[] => {
  if (!query.trim()) return items;
  
  const lowerQuery = query.toLowerCase();
  
  // Remove trigger prefix for tools
  let searchTerm = query.replace(/^#tools?\s*:?\s*/, '').toLowerCase();
  
  // Check for server-specific filtering (e.g., "github:", "notion:", "sqlite:")
  let serverFilter = '';
  let toolFilter = '';
  
  if (searchTerm.includes(':')) {
    const parts = searchTerm.split(':');
    if (parts.length >= 2) {
      serverFilter = parts[0].trim();
      toolFilter = parts.slice(1).join(':').trim();
    }
  } else {
    toolFilter = searchTerm;
  }
  
  return items.filter(item => {
    const label = item.label.toLowerCase();
    const description = item.description?.toLowerCase() || '';
    const serverBadge = item.serverBadge?.toLowerCase() || '';
    
    // If server filter is specified, only show tools from that server
    if (serverFilter) {
      const serverMatches = serverBadge === serverFilter ||
                           (serverFilter === 'github' && serverBadge === 'github') ||
                           (serverFilter === 'notion' && serverBadge === 'notion') ||
                           (serverFilter === 'sqlite' && serverBadge === 'sqlite') ||
                           (serverFilter === 'filesystem' && serverBadge === 'filesystem') ||
                           (serverFilter === 'mcp' && serverBadge === 'mcp');
      
      if (!serverMatches) {
        return false;
      }
      
      // If no tool filter after server filter, show all tools from that server
      if (!toolFilter) {
        return true;
      }
    }
    
    // Filter by tool name or description
    if (toolFilter) {
      return label.includes(toolFilter) ||
             description.includes(toolFilter);
    }
    
    // Fallback: general search across all fields
    return label.includes(searchTerm) ||
           description.includes(searchTerm) ||
           serverBadge.includes(searchTerm);
  });
};
