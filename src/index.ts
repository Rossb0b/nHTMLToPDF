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
  try {
    return await puppeteer.launch();
  }
  catch (error) {
    throw new Error(error);
  }
}

export interface HTML {
  content?: string,
  url?: string,
  file?: string,
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
 * @param {HTML[]} htmls
 * @param {PDFOptions} [options]
 * @param {boolean} [toStream=false]
 * @returns {Promise<genPDFPayload>}
 */
export async function generatePDF(browser: Browser, htmls: HTML[], options?: PDFOptions, toStream: boolean = false): Promise<genPDFPayload> {
  const pdfs = [];
  let pdf;
  let res: genPDFPayload = {};

  if (toStream && htmls.length > 1) {
    throw new Error("Cannot handle stream for multiple files");
  }

  try {
    const page = await browser.newPage();

    for (let html of htmls) {
      pdf = JSON.parse(JSON.stringify(html));
      pdf['options'] = options ?? undefined;

      if (html.content) {
        const template = compile(html.content);
        const tpHtml = template(html?.options ?? {});
        delete pdf['content'];

        await page.setContent(tpHtml, {
          waitUntil: 'networkidle0'
        });
      }
      else if (html.url) {
        delete pdf['url'];

        await page.goto(html.url!, {
            waitUntil: 'networkidle0'
        });
      }
      else if (html.file) {

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

      return res;
    }
    else {
      res['pdfs'] = pdfs as PDF[];

      return res;
    }
  }
  catch (error) {
    throw new Error(error);
  }
}

/**
 * @author HALLAERT Nicolas
 *
 * @param {Browser} browser
 * @returns {Promise<void>}
 */
export async function terminateBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
  }
  catch (error) {
    throw new Error(error);
  }

  return;
}
