const fs = require('fs');
const path = require('path');

const directories = ['./', './components'];
const extensions = ['.tsx', '.ts'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. StatCounters.tsx - Make icons black inside a neon green box
    if (filePath.includes('StatCounters.tsx')) {
        content = content.replace(
            /<div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 \$\{isDark \? 'bg-\[#09090B\]' : 'bg-\[#FAFAFA\]'\}`}>/g,
            '<div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-[#D4FF00]`}>'
        );
        // And replace text-[#D4FF00] with text-black for the svgs in StatCounters
        content = content.replace(/className="([^"]*)text-\[#D4FF00\]([^"]*)" fill="none"/g, 'className="$1text-black$2" fill="none"');
    }

    // 2. Sidebar.tsx - Active tab visibility
    if (filePath.includes('Sidebar.tsx')) {
        content = content.replace(
            /'bg-\[#D4FF00\]\/10 text-\[#D4FF00\] shadow-sm'/g,
            "isDark ? 'bg-[#D4FF00]/10 text-[#D4FF00] shadow-sm' : 'bg-[#D4FF00] text-black shadow-md'"
        );
    }

    // 3. CountryCard.tsx - Selected text visibility
    if (filePath.includes('CountryCard.tsx')) {
        content = content.replace(
            /isSelected\s*\?\s*'text-\[#D4FF00\]'/g,
            "isSelected ? 'text-zinc-900 dark:text-[#D4FF00]'"
        );
    }

    // 4. Header.tsx - Language selector and Theme switcher
    if (filePath.includes('Header.tsx')) {
        content = content.replace(
            /language === 'fr' \? 'text-\[#D4FF00\]' : 'opacity-40'/g,
            "language === 'fr' ? (isDark ? 'text-[#D4FF00]' : 'text-zinc-900 font-black') : 'opacity-40'"
        );
        content = content.replace(
            /language === 'en' \? 'text-\[#D4FF00\]' : 'opacity-40'/g,
            "language === 'en' ? (isDark ? 'text-[#D4FF00]' : 'text-zinc-900 font-black') : 'opacity-40'"
        );
        content = content.replace(
            /'bg-white border-\[#E4E4E7\] text-\[#D4FF00\] hover:bg-\[#FFF7ED\] shadow-xs'/g,
            "'bg-white border-[#E4E4E7] text-zinc-900 hover:bg-zinc-50 shadow-xs'"
        );
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else {
            if (extensions.some(ext => file.endsWith(ext))) {
                processFile(filePath);
            }
        }
    }
}

directories.forEach(walk);
