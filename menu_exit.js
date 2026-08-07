function showMenu() {
    console.log("\n=== Menu Utama ===");
    console.log("1. Pilihan 1");
    console.log("2. Pilihan 2");
    console.log("3. Pilihan 3");
    console.log("0. /exit");
    console.log("==================");
}

function main() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function askChoice() {
        rl.question('Pilih opsi: ', (answer) => {
            if (answer === "0" || answer === "/exit") {
                console.log("\nKode exit:", "/exit");
                rl.close();
            } else if (answer === "1") {
                console.log("\nAnda memilih Pilihan 1");
            } else if (answer === "2") {
                console.log("\nAnda memilih Pilihan 2");
            } else if (answer === "3") {
                console.log("\nAnda memilih Pilihan 3");
            } else {
                console.log("\nOpsi tidak valid!");
            }
            askChoice();
        });
    }

    askChoice();
}

main();
