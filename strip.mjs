import fs from 'fs';
import path from 'path';
import decomment from 'decomment';

function walkDir(dir) {
    let files = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) {
            continue;
        }
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            files = files.concat(walkDir(fullPath));
        } else {
            if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

const allFiles = walkDir(process.cwd());
let changed = 0;

for (const file of allFiles) {
    try {
        const code = fs.readFileSync(file, 'utf8');
        // Check if there are any comments before processing to avoid unnecessary rewrites
        if (code.includes('//') || code.includes('/*')) {
            // we use space: true to keep line numbers identical, reducing git noise
            const decommented = decomment(code, { space: true });
            
            // Further pass to clean up empty comment lines leftover by 'space: true' if they are just blank spaces
            // Actually, let's just use default options to completely remove them
            const fullyDecommented = decomment(code);
            
            // Remove completely empty lines that might have been left
            const cleaned = fullyDecommented.replace(/^\s*[\r\n]/gm, '');

            if (code !== fullyDecommented) {
                fs.writeFileSync(file, fullyDecommented, 'utf8');
                changed++;
                console.log(`Decommented: ${file}`);
            }
        }
    } catch (err) {
        console.error(`Failed on ${file}: ${err.message}`);
    }
}

console.log(`Done! Removed comments from ${changed} files.`);
