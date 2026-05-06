const { program } = require('commander');
const fs = require("fs-extra");
const path = require("path");
const inquirer = require('inquirer');
const core = require('./converter-core');

/**
 * Console Mode: Interactive
 */
async function interactiveMode() {
    const questions = [
        {
            type: 'list',
            name: 'mode',
            message: 'Co chcete udělat?',
            choices: [
                { name: 'Spustit Webový server', value: 'server' },
                { name: 'Konvertovat složku (Konzolový mód)', value: 'folder' }
            ]
        }
    ];

    const { mode } = await inquirer.prompt(questions);

    if (mode === 'server') {
        console.log('Spouštím server...');
        require('./server.js');
    } else {
        const folderQuestions = [
            {
                type: 'input',
                name: 'inputDir',
                message: 'Zadejte cestu ke složce se soubory:',
                default: './Files_docx'
            },
            {
                type: 'list',
                name: 'from',
                message: 'Zdrojový formát:',
                choices: ['docx', 'md', 'html', 'pdf']
            },
            {
                type: 'list',
                name: 'to',
                message: 'Cílový formát:',
                choices: (answers) => {
                    const formats = ['md', 'docx', 'html'];
                    return formats.filter(f => f !== answers.from);
                }
            },
            {
                type: 'input',
                name: 'outputDir',
                message: 'Výstupní složka:',
                default: './Output'
            }
        ];

        const answers = await inquirer.prompt(folderQuestions);
        await batchConvert(answers);
    }
}

/**
 * Batch conversion logic
 */
async function batchConvert(options) {
    const { from, to, inputDir, outputDir } = options;
    const resolvedInput = path.resolve(inputDir);
    const resolvedOutput = path.resolve(outputDir);

    if (!(await fs.pathExists(resolvedInput))) {
        console.error(`Složka neexistuje: ${resolvedInput}`);
        return;
    }

    const files = await fs.readdir(resolvedInput);
    const mode = `${from.toLowerCase()}2${to.toLowerCase()}`;

    console.log(`\nStarting batch conversion: ${from} -> ${to}`);
    console.log(`Input: ${resolvedInput}`);
    console.log(`Output: ${resolvedOutput}\n`);

    for (const file of files) {
        const filePath = path.join(resolvedInput, file);
        const ext = path.extname(file).toLowerCase();
        
        if (from === 'docx' && ext !== '.docx') continue;
        if (from === 'md' && ext !== '.md') continue;
        if (from === 'html' && ext !== '.html') continue;
        if (from === 'pdf' && ext !== '.pdf') continue;

        try {
            switch (mode) {
                case 'docx2md': await core.docxToMd(filePath, resolvedOutput); break;
                case 'md2docx': await core.mdToDocx(filePath, resolvedOutput); break;
                case 'md2html': await core.mdToHtml(filePath, resolvedOutput); break;
                case 'html2md': await core.htmlToMd(filePath, resolvedOutput); break;
                case 'docx2html': await core.docxToHtml(filePath, resolvedOutput); break;
                case 'pdf2md': await core.pdfToMd(filePath, resolvedOutput); break;
                default:
                    console.error(`Unsupported conversion: ${mode}`);
                    return;
            }
            console.log(`[OK] ${file}`);
        } catch (err) {
            console.error(`[ERROR] ${file}: ${err.message}`);
        }
    }
    console.log('\nBatch conversion completed!');
}

/**
 * Main Entry
 */
async function main() {
    program
        .version('2.1.0')
        .description('Universal Document Converter')
        .option('-f, --from <format>', 'Source format (docx, md, html, pdf)')
        .option('-t, --to <format>', 'Target format (docx, md, html)')
        .option('-i, --input <path>', 'Input file or directory')
        .option('-o, --output <path>', 'Output directory', './Output')
        .option('-s, --server', 'Start in web server mode')
        .action(async (options) => {
            if (options.server) {
                require('./server.js');
                return;
            }

            // If no arguments provided, start interactive mode
            if (!options.from && !options.to && !options.input) {
                await interactiveMode();
            } else {
                // Argument based mode
                await batchConvert({
                    from: options.from,
                    to: options.to,
                    inputDir: options.input,
                    outputDir: options.output
                });
            }
        });

    program.parse(process.argv);
}

main().catch(err => console.error(err));
