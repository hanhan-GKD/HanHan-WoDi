const readline = require('readline');
const readSyncByRl = tips => {
    tips = tips || '> ';
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log(tips)
        rl.question("", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
exports.readSyncByRl = readSyncByRl