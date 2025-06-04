import yargs from 'https://deno.land/x/yargs@v17.7.2-deno/deno.ts'
import { downloadWebcomic } from "./downloader.ts";
import * as fs from 'node:fs';
import pdfkit from "npm:pdfkit"


interface IArgs {
	maxPages: number,
	headers?: string[]
	"_": [ firstPageUrl: string, imageQuerySelector: string, nextLinkQuerySelector: string, outputFile: string ]
}

//set up the command line interface
const args: IArgs = yargs(Deno.args)
	.wrap(null)

	.usage("Usage: $0 <firstPageURL> <imageQuerySelector> <nextLinkQuerySelector> <outputFile> [options]")
	.default("maxPages", 10000)
	.example("$0 https://comics.com/webcomic/page1 '#imagepanel' 'a.nextbuttonclass' comic.pdf", "standard usage")
	.example("$0 https://comics.com/1 #image #next out.pdf --headers 'authorization' '0qbb83g0ay23guawf9l' 'gdpr' 'consented'" , "using headers")
	.array("headers")
	.describe("headers", "Key value pairs that are sent along as headers with all http requests. Useful if a website requires authorization or other cookies.")
	.number("maxPages")
	.describe("maxPages", "Limits the amount of pages that can will be downloaded.")
	.demandCommand(4)
	
.parse() //turn what the user wrote in the terminal into something readable


console.log("===== running! =====")


//convenience references
const firstPageURL = args["_"][0]
const imageQuerySelector = args["_"][1]
const nextLinkQuerySelector = args["_"][2]
const outputFile = args["_"][3]

//create a record of headers from the headers gotten
const headers: Record<string, string> = {}

if (args.headers) {
	if (args.headers.length % 2 != 0) {
		throw new Error("Uneven number of header arguments. Header arguments must come in pairs of two (--headers 'key' 'value' 'key' 'value')")
	}
	
	for(let i = 0; i < args.headers.length; i += 2) {
		headers[args.headers[i]] = args.headers[i+1]
	}
}

//create pdf and pipe it to a file
const pdf = new pdfkit({autoFirstPage: false})
pdf.pipe(fs.createWriteStream(outputFile))

//do the actual downloading in to the pdf
await downloadWebcomic(pdf, new URL(firstPageURL), imageQuerySelector, nextLinkQuerySelector, args.maxPages, headers)


console.log("===== done! =====")


//aaand finalize the pdf
pdf.end()