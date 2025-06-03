import yargs from 'https://deno.land/x/yargs@v17.7.2-deno/deno.ts'
import { downloadWebcomic, ITraversePageOptions } from "./downloader.ts";
import * as fs from 'node:fs';
import pdfkit from "npm:pdfkit"


//setup the cli stuff
interface IArgs {
	maxPages: number,
	headers?: Record<string, string>
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

const pdf = new pdfkit()

const firstPageURL = args["_"][0]
const imageQuerySelector = args["_"][1]
const nextLinkQuerySelector = args["_"][2]
const outputFile = args["_"][3]

//pipe to an out file
pdf.pipe(fs.createWriteStream(outputFile))

downloadWebcomic(pdf, new URL(firstPageURL), imageQuerySelector, nextLinkQuerySelector, args.maxPages, args.headers)

pdf.end()