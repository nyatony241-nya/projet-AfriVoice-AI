const fs = require('fs');
const path = require('path');

const directories = ['./', './components', './remotion/src'];
const extensions = ['.tsx', '.ts', '.html'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/bg-\[#D4FF00\] text-white/g, 'bg-[#D4FF00] text-black');
    content = content.replace(/from-\[#D4FF00\] to-\[#E2FF3B\] text-white/g, 'from-[#D4FF00] to-[#E2FF3B] text-black');
    content = content.replace(/from-\[#D4FF00\] via-\[#E2FF3B\] to-\[#DC2626\] text-white/g, 'from-[#D4FF00] via-[#E2FF3B] to-[#DC2626] text-black');
    
    // clean up redundant isDark ternaries again if any got created
    content = content.replace(/isDark \? 'bg-\[#D4FF00\] text-black' : 'bg-\[#D4FF00\] text-black'/g, "'bg-[#D4FF00] text-black'");
    content = content.replace(/isDark \? 'text-black' : 'text-black'/g, "'text-black'");

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
