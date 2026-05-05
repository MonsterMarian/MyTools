const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const core = require('./converter-core');

const app = express();
const port = 3000;

// Setup storage
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const { from, to } = req.body;
        const inputPath = req.file.path;
        const outputDir = path.join(__dirname, 'converted_web');
        await fs.ensureDir(outputDir);

        const mode = `${from}2${to}`;
        let result;

        switch (mode) {
            case 'docx2md': result = await core.docxToMd(inputPath, outputDir); break;
            case 'md2docx': result = await core.mdToDocx(inputPath, outputDir); break;
            case 'md2html': result = await core.mdToHtml(inputPath, outputDir); break;
            case 'html2md': result = await core.htmlToMd(inputPath, outputDir); break;
            case 'docx2html': result = await core.docxToHtml(inputPath, outputDir); break;
            default:
                throw new Error('Unsupported conversion');
        }

        // Send file back
        if (result.success) {
            res.download(result.path, path.basename(result.path), () => {
                // Cleanup
                fs.remove(inputPath);
                // Note: We might want to keep the output for a while or clean it up after download
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`Web converter running at http://localhost:${port}`);
});
