// Require third part Dependencies
import { Browser } from "puppeteer";
import * as puppeteer from "puppeteer";
import * as fs from "fs";
const compile = require('zup');

/**
 * @author HALLAERT Nicolas
 * @returns {Promise<Browser>}
 */
export async function initBrowser(): Promise<Browser> {
  return await puppeteer.launch();
}

export interface pdfFile {
  content?: string,
  url?: string,
  options?: {}
}

export interface PDFOptions {
  path?: string,
  scale?: number,
  displayHeaderFooter?: boolean,
  headerTemplate?: string,
  footerTemplate?: string,
  printBackground?: boolean,
  landscape?: boolean,
  pageRanges?: string,
  format?: string,
  width?: string | number,
  height?: string | number,
  margin?: {
    top?: string | number,
    right?: string | number,
    bottom?: string | number,
    left?: string | number,
  },
  preferCSSPageSize?: boolean
}

export interface PDF {
  options?: string,
  buffer: Buffer
}

export interface genPDFPayload {
  pdf?: PDF,
  pdfs?: PDF[],
  stream?: fs.ReadStream
}

/**
 * @author HALLAERT Nicolas
 * @description Return a buffer of generated pdfs with the payload of options used
 *
 * @export
 * @param {Browser} browser
 * @param {pdfFile[]} files
 * @param {PDFOptions} [options]
 * @param {boolean} [toStream=false]
 * @returns {Promise<genPDFPayload>}
 */
export async function generatePDF(browser: Browser, files: pdfFile[], options?: PDFOptions, toStream: boolean = false): Promise<genPDFPayload> {
  const pdfs = [];
  let pdf;
  let res: genPDFPayload = {};

  if (toStream && files.length > 1) {
    throw new Error("Cannot handle stream for multiple files");
  }

  try {
    if(!browser) browser = await puppeteer.launch();

    const page = await browser.newPage();

    for (let file of files) {
      pdf = JSON.parse(JSON.stringify(file));
      pdf['options'] = options ?? undefined;

      if (file.content) {
        const template = compile(file.content);
        const html = template(file?.options ?? {});
        delete pdf['content'];

        await page.setContent(html, {
          waitUntil: 'networkidle0'
        });
      }
      else {
        delete pdf['url'];

        await page.goto(file.url!, {
            waitUntil: 'networkidle0'
        });
      }

      if (toStream) {
        const buffer = await page.pdf(pdf.options);
        await terminateBrowser(browser);

        const writableStream = fs.createWriteStream('generated.pdf');
        writableStream.write(buffer);

        const readableStream = fs.createReadStream('generated.pdf');

        readableStream.on('end', () => {
          fs.unlink('generated.pdf', (error) => {
            if (error) throw new Error(error.code);
          })
        })

        res['stream'] = readableStream as fs.ReadStream;

        return res;
      }

      pdf['buffer'] = await page.pdf(pdf.options);
      pdfs.push(pdf);
    }

    if (pdfs.length === 1) {
      res['pdf'] = pdf as PDF;
    }
    else {
      res['pdfs'] = pdfs as PDF[];
    }
  }
  catch (error) {
    console.error(error);
  }

  return res;
}

/**
 * @author HALLAERT Nicolas
 *
 * @param {Browser} browser
 * @returns {Promise<void>}
 */
export async function terminateBrowser(browser: Browser): Promise<void> {
  await browser.close();

  return;
}
