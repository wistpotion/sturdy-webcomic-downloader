import yargs from 'https://deno.land/x/yargs@v17.7.2-deno/deno.ts'
import { downloadWebcomic, ITraversePageOptions } from "./downloader.ts";
import * as fs from 'node:fs';
import pdfkit from "npm:pdfkit"


//setup the cli stuff
interface IArgs {
	maxPages: number,
	headers?: string[]
	"_": [ firstPageUrl: string, imageQuerySelector: string, nextLinkQuerySelector: string, outputFile: string ]
}

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
	.demandCommand(3)
	
.parse()

console.log("===== running! =====")


const firstPageURL = args["_"][0]
const imageQuerySelector = args["_"][1]
const nextLinkQuerySelector = args["_"][2]
const outputFile = args["_"][3]

const headers: Record<string, string> = {}

if (args.headers) {
	if (args.headers.length % 2 != 0) {
		throw new Error("Uneven number of header arguments. Header arguments must come in pairs of two ('key' 'value' 'key' 'value')")
	}
	
	for(let i = 0; i < args.headers.length; i += 2) {
		headers[args.headers[i]] = args.headers[i+1]
	}
}

//pipe to an out file
const pdf = new pdfkit({autoFirstPage: false})
pdf.pipe(fs.createWriteStream(outputFile))


await downloadWebcomic(pdf, new URL(firstPageURL), imageQuerySelector, nextLinkQuerySelector, args.maxPages, headers)

console.log("===== done! =====")

pdf.end()