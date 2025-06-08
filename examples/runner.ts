/**
 * 
 * 
 * This file demonstrates how you can use SWD to download a bunch of comics from the same website in parallell (ish).
 * 
 * 
 */


import { downloadWebcomic } from "../src/downloader.ts";
import * as fs from 'node:fs';
import pdfkit from "npm:pdfkit"


const series = [
    "comic1",
    "comic2",
    "comic3",
    "comic4",
    "comic5",
]


async function downloadSeries() {
    const serie = series.pop()
    
    const firstPageURL = `https://webcomics/${serie}/1`
    const imageQuerySelector = "img"
    const nextLinkQuerySelector = "a"
    const outputFile = `webcomic-${serie}.pdf`
    
    const headers: Record<string, string> = { Authorization: "(authorization token here)" }
    
    const pdf = new pdfkit({autoFirstPage: false})
    pdf.pipe(fs.createWriteStream(outputFile))
    
    //the await below is very important! otherwise you close the stream to the pdf before you have actually written anything
    await downloadWebcomic(pdf, new URL(firstPageURL), imageQuerySelector, nextLinkQuerySelector, 10000, headers)
    
    pdf.end()
}


//keep downloading until there are no series left
async function thread() {
    while (series.length > 0) {
        await downloadSeries()
    }
}

//start a bunch of parallell downloads
for (let i = 0; i < 10; i++) {
    thread()
}