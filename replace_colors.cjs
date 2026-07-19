const fs = require('fs');
const path = require('path');

const directories = ['./', './components', './remotion/src'];
const extensions = ['.tsx', '.ts', '.html'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // specific text-white to text-black changes for buttons
    content = content.replace(/bg-\[#EA580C\] dark:bg-\[#D4FF00\] text-white dark:text-black/g, 'bg-[#D4FF00] text-black');
    content = content.replace(/bg-\[#EA580C\] dark:bg-\[#D4FF00\]/g, 'bg-[#D4FF00]');
    content = content.replace(/text-\[#EA580C\] dark:text-\[#D4FF00\]/g, 'text-[#D4FF00]');
    content = content.replace(/border-\[#EA580C\] dark:border-\[#D4FF00\]/g, 'border-[#D4FF00]');
    content = content.replace(/from-\[#EA580C\] dark:from-\[#D4FF00\]/g, 'from-[#D4FF00]');
    content = content.replace(/shadow-\[#EA580C\]\/(\d+) dark:shadow-\[#D4FF00\]\/\1/g, 'shadow-[#D4FF00]/$1');
    content = content.replace(/ring-\[#EA580C\]\/(\d+) dark:ring-\[#D4FF00\]\/\1/g, 'ring-[#D4FF00]/$1');
    content = content.replace(/bg-gradient-to-tr from-\[#EA580C\] to-\[#F59E0B\] dark:from-\[#D4FF00\] dark:to-\[#E2FF3B\] text-white dark:text-black/g, 'bg-gradient-to-tr from-[#D4FF00] to-[#E2FF3B] text-black');
    content = content.replace(/text-white dark:text-black/g, (match, offset, str) => {
        // Only replace if it's accompanied by #EA580C in the same class string
        const start = str.lastIndexOf('className="', offset);
        const end = str.indexOf('"', offset);
        if (start !== -1 && end !== -1) {
            const classStr = str.substring(start, end);
            if (classStr.includes('#EA580C') || classStr.includes('#D4FF00')) {
                return 'text-black';
            }
        }
        return match;
    });

    // global hex replacements for any remaining
    content = content.replace(/#EA580C/g, '#D4FF00');
    // Also change the orange hover colors to green hover colors
    content = content.replace(/#D94E06/g, '#E2FF3B'); // btn hover
    content = content.replace(/#F59E0B/g, '#E2FF3B'); // from/to gradient

    // Handle isDark ternaries like: isDark ? 'text-[#D4FF00]' : 'text-[#D4FF00]'
    content = content.replace(/isDark \? '([^']+)' : '\1'/g, "'$1'");
    content = content.replace(/isDark\s*\?\s*([^:]+)\s*:\s*\1/g, '$1');

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
