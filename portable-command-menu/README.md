# Input Box Component

A complete, portable input box component with rich text editing, command menu, suggestions, and pill attachments. Built with Lit, TipTap, and Web Components.

## Features

- 📝 **Rich Text Editor**: Powered by TipTap with full text editing capabilities
- 🎯 **Command Menu**: Type `@` to access tabs, history, and bookmarks
- 🔍 **Smart Suggestions**: Auto-complete URLs and search suggestions as you type
- 💊 **Pill Attachments**: Attach tabs, history items, and bookmarks as visual pills
- ⌨️ **Keyboard Shortcuts**: Full keyboard navigation and shortcuts
- 🎨 **Customizable**: Provide your own data sources and callbacks
- 📦 **Self-Contained**: All components included in one package
- 🔌 **Easy Integration**: Drop-in web component

## Installation

### 1. Install Dependencies

```bash
npm install lit @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link
```

### 2. Copy Files

Copy all files from this directory to your project:
- `input-box.ts` - Main input box component
- `command-menu.ts` - Command menu component
- `pills-container.ts` - Pills container component  
- `suggestions-dropdown.ts` - Suggestions dropdown component
- `types.ts` - TypeScript interfaces
- `mock-data.ts` - Sample data providers (optional)

### 3. Build Setup

If using TypeScript, compile the files:

```bash
npx tsc input-box.ts --target es2020 --module es2020 --experimentalDecorators
```

Or use your existing build pipeline (Vite, Webpack, Rollup, etc.)

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import './input-box.js';
    import { mockDataProvider } from './mock-data.js';
    
    const inputBox = document.querySelector('input-box');
    
    // Configure the input box
    inputBox.config = {
      placeholder: "Type @ for commands, or search...",
      dataProvider: mockDataProvider,
      onSubmit: (text, pills) => {
        console.log('Submitted:', text, pills);
      }
    };
  </script>
</head>
<body>
  <input-box></input-box>
</body>
</html>
```

## Usage

### Basic Configuration

```javascript
const inputBox = document.querySelector('input-box');

inputBox.config = {
  // Custom placeholder text
  placeholder: "Type your message...",
  
  // Data provider for tabs, history, bookmarks, and suggestions
  dataProvider: {
    getTabs: () => [...],
    getHistory: () => [...],
    getBookmarks: () => [...],
    getSuggestions: (query) => [...]
  },
  
  // Callback when user submits
  onSubmit: (text, pills) => {
    // text: The input text or selected URL
    // pills: Array of attached items (tabs, history, bookmarks)
  }
};
```

### Custom Data Provider

```javascript
const myDataProvider = {
  // Provide open tabs
  getTabs: () => [
    { 
      id: 'tab-1', 
      title: 'GitHub', 
      url: 'https://github.com',
      faviconUrl: 'https://github.com/favicon.ico'
    }
  ],
  
  // Provide history items
  getHistory: () => [
    {
      title: 'Stack Overflow',
      url: 'https://stackoverflow.com',
      type: 'history',
      visits: 42,
      lastVisitTime: '2024-01-20T10:30:00Z'
    }
  ],
  
  // Provide bookmarks
  getBookmarks: () => [
    {
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      type: 'bookmark'
    }
  ],
  
  // Provide search suggestions
  getSuggestions: (query) => {
    // Return suggestions based on query
    return [
      {
        title: `Search for "${query}"`,
        url: `https://google.com/search?q=${query}`,
        type: 'search',
        icon: '🔍'
      }
    ];
  }
};

inputBox.config = {
  dataProvider: myDataProvider,
  onSubmit: (text, pills) => {
    // Handle submission
  }
};
```

### Dev Mode

Enable dev mode to show character count:

```javascript
inputBox.devMode = true;
```

## Keyboard Shortcuts

### Command Menu
- `@` - Open command menu
- `@tabs` - Quick access to tabs
- `@history` - Quick access to history
- `@bookmarks` - Quick access to bookmarks

### Navigation
- `↑↓` - Navigate suggestions or command menu
- `Tab` - Autocomplete selected suggestion
- `Shift+Tab` - Navigate backwards
- `Space` - Toggle checkbox in multi-select mode

### Actions
- `Enter` - Send message
- `Shift+Enter` - New line
- `Escape` - Close menus
- `Backspace` - Go back in command menu

## Components

### InputBox
The main component that orchestrates everything:
- Rich text editor (TipTap)
- Command menu integration
- Suggestions dropdown
- Pills container
- Toolbar buttons

### CommandMenu
Handles `@` commands:
- Tab selection with checkboxes
- History browsing
- Bookmark management
- Multi-select support

### PillsContainer
Displays attached items as pills:
- Visual representation of attachments
- Remove functionality
- Animated appearance

### SuggestionsDropdown
Shows suggestions as you type:
- URL suggestions
- Search suggestions
- Navigation hints
- Smart filtering

## API Reference

### InputBox Properties

#### `config: InputBoxConfig`
Configuration object containing:
- `placeholder?: string` - Editor placeholder text
- `dataProvider?: DataProvider` - Data source for tabs, history, etc.
- `onSubmit?: (text, pills) => void` - Submit callback

#### `devMode: boolean`
Toggle development mode (shows character count)

### Data Types

```typescript
interface TabItem {
  id: string;
  title: string;
  url: string;
  faviconUrl?: string;
}

interface SuggestionItem {
  title: string;
  url: string | null;
  type: "history" | "bookmark" | "search" | "command" | "navigate" | "tab";
  icon?: string;
  faviconUrl?: string;
  visits?: number;
  lastVisitTime?: string;
}
```

## Styling

The components use Shadow DOM for encapsulation. Each component has its own styles that can be customized by:

1. Extending the component classes
2. Using CSS custom properties (where implemented)
3. Modifying the source styles

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires support for:
- Web Components
- ES Modules
- Shadow DOM
- TipTap/ProseMirror

## Development

### Running the Demo

```bash
npm install
npm run dev
```

Then open `demo.html` in your browser.

### Building for Production

```bash
npm run build
```

## License

MIT - Feel free to use in your projects