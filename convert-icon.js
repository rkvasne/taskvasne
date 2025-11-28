const fs = require('fs');
const pngToIco = require('png-to-ico');

console.log('Type of pngToIco:', typeof pngToIco);
console.log('pngToIco:', pngToIco);

if (typeof pngToIco === 'function') {
    pngToIco('icon.png')
        .then(buf => {
            fs.writeFileSync('icon.ico', buf);
            console.log('Created icon.ico');
        })
        .catch(console.error);
} else if (typeof pngToIco.default === 'function') {
    pngToIco.default('icon.png')
        .then(buf => {
            fs.writeFileSync('icon.ico', buf);
            console.log('Created icon.ico');
        })
        .catch(console.error);
}
