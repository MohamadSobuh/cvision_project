const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    let modified = false;

    // Check if we need to add useTranslation
    let hasTranslationsImport = /import\s+translations\s+from\s+['"][^'"]+translations['"];?/.test(content);
    
    if (hasTranslationsImport) {
        content = content.replace(/import\s+translations\s+from\s+['"][^'"]+translations['"];?\n?/g, 'import { useTranslation } from "react-i18next";\n');
        content = content.replace(/const\s+t\s*=\s*translations\[\w+\];?\n?/g, 'const { t, i18n } = useTranslation();\n');
        modified = true;
    }

    // Replace t.property with t('property')
    const originalContent = content;
    content = content.replace(/\bt\.([a-zA-Z0-9_]+)/g, "t('$1')");
    if (content !== originalContent) {
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content);
    }
});
console.log('Refactoring done.');
