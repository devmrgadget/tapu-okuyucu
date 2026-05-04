const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /text-\[var\(--text-muted\)]/g, replace: 'text-muted-foreground' },
  { search: /text-\[var\(--text-primary\)]/g, replace: 'text-foreground' },
  { search: /text-\[var\(--text-secondary\)]/g, replace: 'text-muted-foreground' },
  { search: /bg-\[var\(--bg-card\)]/g, replace: 'bg-card' },
  { search: /bg-\[var\(--bg-surface\)]/g, replace: 'bg-background' },
  { search: /bg-\[var\(--bg-secondary\)]/g, replace: 'bg-secondary' },
  { search: /border-\[var\(--border-color\)]/g, replace: 'border-border' },
  { search: /border-\[var\(--border-subtle\)]/g, replace: 'border-border/50' },
  { search: /var\(--border-color\)/g, replace: 'hsl(var(--border))' },
  { search: /var\(--text-muted\)/g, replace: 'hsl(var(--muted-foreground))' },
  { search: /var\(--border-subtle\)/g, replace: 'hsl(var(--border))' },
  { search: /var\(--bg-surface\)/g, replace: 'hsl(var(--background))' },
  // Classes
  { search: /animate-fade-in/g, replace: 'animate-in fade-in duration-300' },
  { search: /animate-slide-up/g, replace: 'animate-in slide-in-from-bottom-4 fade-in duration-300' },
  { search: /input-field/g, replace: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const rule of replacements) {
        content = content.replace(rule.search, rule.replace);
      }
      
      if (content !== original) {
        console.log(`Updated ${fullPath}`);
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDirectory(path.join(__dirname, 'app'));
