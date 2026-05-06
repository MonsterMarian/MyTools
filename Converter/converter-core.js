const mammoth = require("mammoth");
const fs = require("fs-extra");
const path = require("path");
const MarkdownIt = require('markdown-it');
const TurndownService = require('turndown');
const HTMLToDocx = require('html-to-docx');
const { PDFParse } = require('pdf-parse');


const md = new MarkdownIt();
const turndown = new TurndownService();

/**
 * DOCX to Markdown
 */
async function docxToMd(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const fileOutputDir = path.join(outputDir, baseName);
    const imagesDir = path.join(fileOutputDir, "images");

    await fs.ensureDir(imagesDir);

    let imageCounter = 0;
    const options = {
        convertImage: mammoth.images.inline((element) => {
            return element.read().then(async (imageBuffer) => {
                imageCounter++;
                const extension = element.contentType.split("/")[1] || "png";
                const imageName = `image${imageCounter}.${extension}`;
                const imagePath = path.join(imagesDir, imageName);
                await fs.writeFile(imagePath, imageBuffer);
                return { src: `images/${imageName}` };
            });
        })
    };

    const result = await mammoth.convertToMarkdown({ path: inputPath }, options);
    const mdPath = path.join(fileOutputDir, `${baseName}.md`);
    await fs.writeFile(mdPath, result.value);
    return { success: true, path: mdPath, images: imagesDir };
}

/**
 * Markdown to DOCX
 */
async function mdToDocx(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const markdown = await fs.readFile(inputPath, 'utf8');
    const html = md.render(markdown);
    
    const docxBuffer = await HTMLToDocx(html, null, {
        title: baseName,
        orientation: 'portrait',
        margins: { top: 720 }
    });

    await fs.ensureDir(outputDir);
    const docxPath = path.join(outputDir, `${baseName}.docx`);
    await fs.writeFile(docxPath, docxBuffer);
    return { success: true, path: docxPath };
}

/**
 * Markdown to HTML
 */
async function mdToHtml(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const markdown = await fs.readFile(inputPath, 'utf8');
    const html = md.render(markdown);
    
    await fs.ensureDir(outputDir);
    const htmlPath = path.join(outputDir, `${baseName}.html`);
    await fs.writeFile(htmlPath, html);
    return { success: true, path: htmlPath };
}

/**
 * HTML to Markdown
 */
async function htmlToMd(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const html = await fs.readFile(inputPath, 'utf8');
    const markdown = turndown.turndown(html);
    
    await fs.ensureDir(outputDir);
    const mdPath = path.join(outputDir, `${baseName}.md`);
    await fs.writeFile(mdPath, markdown);
    return { success: true, path: mdPath };
}

/**
 * DOCX to HTML
 */
async function docxToHtml(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const result = await mammoth.convertToHtml({ path: inputPath });
    
    await fs.ensureDir(outputDir);
    const htmlPath = path.join(outputDir, `${baseName}.html`);
    await fs.writeFile(htmlPath, result.value);
    return { success: true, path: htmlPath };
}

/**
 * PDF to Markdown
 */
async function pdfToMd(inputPath, outputDir) {
    const baseName = path.parse(inputPath).name;
    const fileOutputDir = path.join(outputDir, baseName);
    await fs.ensureDir(fileOutputDir);

    const dataBuffer = await fs.readFile(inputPath);
    
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    
    const mdPath = path.join(fileOutputDir, `${baseName}.md`);
    await fs.writeFile(mdPath, result.text);
    
    return { success: true, path: mdPath };
}


module.exports = {
    docxToMd,
    mdToDocx,
    mdToHtml,
    htmlToMd,
    docxToHtml,
    pdfToMd
};

