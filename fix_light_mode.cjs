const fs = require('fs');
const path = require('path');

const directories = ['./', './components', './remotion/src'];
const extensions = ['.tsx', '.ts', '.html'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace the warm white backgrounds with neutral cool white
    content = content.replace(/#FFFBF5/g, '#FAFAFA');
    
    // Replace warm orange borders with neutral zinc borders
    content = content.replace(/#FDE8CD/g, '#E4E4E7'); // zinc-200 hex
    
    // Replace old orange RGB shadows with neutral shadows
    content = content.replace(/rgba\(234,88,12/g, 'rgba(0,0,0');
    
    // Replace hover:bg-[#FFFBF5] with hover:bg-zinc-50
    content = content.replace(/hover:bg-\[#FFFBF5\]/g, 'hover:bg-zinc-50');

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
