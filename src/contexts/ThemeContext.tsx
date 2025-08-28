import { createContext, useContext, createSignal, type ParentComponent, type Accessor } from 'solid-js';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Accessor<Theme>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>();

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = createSignal<Theme>('dark');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme utility functions
export const getThemeClasses = (theme: Theme) => ({
  // Backgrounds
  bg: {
    primary: theme === 'dark' ? 'bg-black' : 'bg-white',
    secondary: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100',
    elevated: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    input: theme === 'dark' ? 'bg-black' : 'bg-white',
  },
  
  // Text colors
  text: {
    primary: theme === 'dark' ? 'text-white' : 'text-black',
    secondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
    muted: theme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    inverse: theme === 'dark' ? 'text-black' : 'text-white',
    error: theme === 'dark' ? 'text-red-400' : 'text-red-600',
  },
  
  // Borders
  border: {
    primary: theme === 'dark' ? 'border-gray-500' : 'border-gray-300',
    secondary: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    focus: theme === 'dark' ? 'border-white' : 'border-black',
  },
  
  // Buttons
  button: {
    primary: theme === 'dark' ? 'bg-white hover:bg-gray-200 text-black' : 'bg-black hover:bg-gray-800 text-white',
    secondary: theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-black',
    disabled: theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400',
  },
  
  // Status indicators
  status: {
    connected: theme === 'dark' ? 'bg-white' : 'bg-black',
    connecting: theme === 'dark' ? 'bg-gray-400' : 'bg-gray-600',
    error: theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400',
    default: theme === 'dark' ? 'bg-gray-500' : 'bg-gray-500',
  }
});
