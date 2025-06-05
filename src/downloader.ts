/**
 * 
 * 
 * This is the downloader! It's the code that does the downloading. You can import downloadWebcomic in your own project and use that to automate downloads. See examples/runner.ts or main.ts for examples.
 * 
 * 
 */


import * as denoDom from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'
import * as canvasKit from "https://deno.land/x/canvas/mod.ts"
import { imageSize } from "npm:image-size"


// deno-lint-ignore no-unused-vars
import pdfkit from "npm:pdfkit" //required for types
import { missingBase64 } from "./missing.png.ts";



/**
 * Helpful messages to send the user when things go, eh, less well.
 */
export const messages = {
    "warnImageElementNotFound": "WARNING: image was not found in the scraping process, adding empty page and moving on",
    "warnMalformedImage": "WARNING: image is malformed / corrupt, adding empty page instead",
    "warnCannotGetImage": "WARNING: cannot get the requested image, adding empty page instead",
    
    "errorFetchAuthlike": " - Error fetching url. Check if you need an authorization header, or a required cookie.",
    "errorFetchServerIssues": " - Error fetching url, it might be because the webcomic server is down. Try again later.",
    "errorFetch404": " - Error fetching url. Check if you have entered a correct url.",
    "errorUnknown": " - There was an unknown error fetching the page. Either the webpage is doing something VERY funny, or you should contact the developer of this software.",

    "errorGetNextPage": " - Unknown error with fetching the next page."
}


/**
 * Find the URL to the image in an html document.
 * @param document The html document to search.
 * @param imageQuerySelector A css style selector for the image <img> element.
 * @param base The base of the url (example: https://comics.com).
 * @returns A URL if a link was found, otherwise null.
 */
export function findImageURL(document: denoDom.HTMLDocument, imageQuerySelector: string, base: URL | string): URL | null {
    const element = document.querySelector(imageQuerySelector)

    if (element == null) { return null }

    const link = element.getAttribute("src")

    if (link == null) { return null }

    //we use base so that relative links also work (example: "/2" instead of "https://comic.com/2")
    return new URL(link, base)
}


/**
 * Construct an http error message to be displayed to the user
 * @param status The http status number.
 * @param helperText A text that helps explain to the user what went wrong, and how to fix it.
 * @returns Constructed error message.
 */
export function constructHttpErrorMsg(status: number, helperText: string) {
    return "http " + status + ":" + helperText
}


/**
 * A fetch that will give helpful error messages when things go wrong. See fetch for documentation.
 * @param url 
 * @param requestInit 
 * @returns
*/
export async function helpfullyFailingFetch(url: URL, requestInit?: RequestInit): Promise<Response> {
    //this function is tested by the tests for getImage and getNextPage
    
    const response = await fetch(url, requestInit)
    
    if (response.ok) {
        return response

    } else {
        //handle possible http errors, and try to be a bit helpful in how to solve them

        switch (response.status) {
            case 403:
            case 401:
            case 302:
            case 303:
            case 307:
                throw new Error(constructHttpErrorMsg(response.status, messages.errorFetchAuthlike))

            case 503:
            case 500:
                throw new Error(constructHttpErrorMsg(response.status, messages.errorFetchServerIssues))

            case 404: 
                throw new Error(constructHttpErrorMsg(response.status, messages.errorFetch404))

            default: 
                throw new Error(constructHttpErrorMsg(response.status, messages.errorUnknown))
        }
    }
}


/**
 * Get an image from a url.
 * @param url The url to download from.
 * @returns The image found. Throws if no image is found
 */
export async function getImage(url: URL, requestInit?: RequestInit): Promise<ArrayBuffer> {
    const response = await helpfullyFailingFetch(url, requestInit)

    const image = response.arrayBuffer()

    return image
}


/**
 * Find the URL to the next page from the html document.
 * @param document The html document.
 * @param nextQuerySelector a css style selector for an anchor <a> element that takes you to the next page.
 * @param base The base of the url (example: https://comics.com).
 * @returns The url for the next page, or null if none was found.
 */
export function findNextPageURL(document: denoDom.HTMLDocument, nextQuerySelector: string, base: URL | string): URL | null {
    
    const element = document.querySelector(nextQuerySelector)

    if (element == null) { return null }

    const link = element.getAttribute("href")

    if (link == null) { return null }

    //we use base so that relative links also work (example: "/2" instead of "https://comic.com/2")
    return new URL(link, base)
}



/**
 * Get the next page as an html document.
 * @param url The url to fetch.
 * @param requestInit A requestInit to send along with the fetch. Useful for sending headers.
 * @returns Html document. Or it throws.
 */
export async function getNextPage(url: URL, requestInit?: RequestInit): Promise<denoDom.HTMLDocument> {
    const response = await helpfullyFailingFetch(url, requestInit)

    //we got a document! now we convert it to something that we can use for query selection, and return
    const bodyText = await response.text()
    
    const doc = new denoDom.DOMParser().parseFromString(bodyText, "text/html")

    return doc
}



interface IImageMetadata {
    width: number;
    height: number;
    orientation?: number;
    type?: string;
}

interface IImage {
    buffer: ArrayBuffer,
    metadata: IImageMetadata
}


/**
 * Create an IImage from a buffer
 * @param imageBuffer 
 * @returns 
 */
export function withMetadata(imageBuffer: ArrayBuffer): IImage {
    try {
        const metadata = imageSize(new Uint8Array(imageBuffer))
        return {
            buffer: imageBuffer,
            metadata
        }
    } catch (e) {
        //nice to be explicit about it
        const err = e as Error
        throw err
    }
}


/**
 * Insert an image into a pdf.
 * @param pdf The pdf document to insert into.
 * @param image The image to insert into the pdf.
 */
export function insertImage(pdf: PDFKit.PDFDocument, image: IImage) {
    const metadata = image.metadata

    // //add a page to the pdf in the same size as the image we got
    pdf.addPage({size: [metadata.width, metadata.height]})

    // //check if the current image format is supported by the pdf
    if ( metadata.type == "png" || metadata.type == "jpg") {
        pdf.image(image.buffer, 0, 0)

    } else {
        //if no: convert the image to png
        const canvas = canvasKit.createCanvas(metadata.width, metadata.height)
        const ctx = canvas.getContext("2d")

        const decoded = canvas.decodeImage(image.buffer)
        ctx.drawImage(decoded, 0, 0)

        const imageData = canvas.toBuffer("image/png")
        const buffer = imageData.buffer as ArrayBuffer
        
        pdf.image(buffer, 0, 0)

        canvas.dispose()
    }
}


/**
 * Insert an "image missing" page.
 * @param pdf The document to insert the empty page into.
 */
export function insertPageForMissingImage(pdf: PDFKit.PDFDocument) {
    pdf.addPage({size: [200, 200]})
    pdf.text("image missing")
}

export interface IDownloadWebcomicOptions {
    headers?: Record<string, string>,
    /**
     * If defined, the program will save images to specified directory
     */
    imageOutputDir?: string
}


function base64ToArrayBuffer(base64: string) {
    //https://stackoverflow.com/questions/21797299/how-can-i-convert-a-base64-string-to-arraybuffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Download a webcomic and insert it into a pdf.
 * @param pdf The pdf to add pages into. The user is required to open and close the pdf.
 * @param firstPageURL The url to the first page of the webcomic.
 * @param imageQuerySelector A css style query selector for an <img> element. The src attribute is used for downloading the image.
 * @param nextLinkQuerySelector A css style query selector for an <a> element. The href attribute is used for downloading the next page of the webcomic.
 * @param maxPages The maximum amount of pages to download.
 * @param options Object with options. 
 * @returns 
 */
export async function downloadWebcomic(
        pdf: PDFKit.PDFDocument,
        firstPageURL: URL,
        imageQuerySelector: string,
        nextLinkQuerySelector: string, 
        maxPages: number,
        options?: IDownloadWebcomicOptions){

    console.log("Starting download of: " + firstPageURL.href)
    
    let headers: Record<string, string> | undefined
    let imagesOutputDirectory
    const imageMissingImage = withMetadata(base64ToArrayBuffer(missingBase64))

    if (options) {
        headers = options.headers

        if (options.imageOutputDir) {
            imagesOutputDirectory = options.imageOutputDir

        }
    }

    if (imagesOutputDirectory) {
        await Deno.mkdir(imagesOutputDirectory, { recursive: true })
    }

    const requestInit: RequestInit = { headers }
    const base = firstPageURL.origin

    
    let queuedURL = firstPageURL
    

    //loop until max pages is reached OR no next page is found
    for (let i = 0; i < (maxPages) ; i++) {

        //explain to the user that YES things are happening
        if (i % 15 == 0 && i != 0) {
            console.log("Has downloaded " + i + " pages.")
        }


        //attempt to get the next page
        const maxAttempts = 10
        let page
        let err: Error | undefined
        for (let attempt = 0; attempt < maxAttempts; attempt++ ) {
            try {
                page = await getNextPage(queuedURL, requestInit)
                break;
            } catch (e) {
                err = e as Error
            }
        }
        
        //log the error if it really was impossible to get the next page, but don't throw. 
        //this means that the user can gracefully close the stream to the pdf and thereby have something that isn't corrupt.
        //good for debugging and getting to read part of what you have attempted to download.
        if (page == undefined) {
            if (err == undefined) { throw new Error("Page is somehow undefined without an error being thrown") }
            
            console.error(err.message)
            break;
        }

    
        //find the url of the image on this page
        const imageURL = findImageURL(page, imageQuerySelector, base)

        if (imageURL != null) {
            //we did find a url: attempt to download the image from the url

            const maxAttempts = 10
            let imageBuffer
            let err: Error | undefined
            for (let attempt = 0; attempt < maxAttempts; attempt++ ) {
                try {
                    imageBuffer = await getImage(imageURL, requestInit)
                    break;
                } catch (e) {
                    err = e as Error
                }
            }


            if (imageBuffer != undefined) {
                //we managed to download the url: insert the image into the document
                let image
                try {
                    image = withMetadata(imageBuffer)
                } catch {
                    //
                }

                if (image) {
                    insertImage(pdf, image)

                    if(imagesOutputDirectory) {
                        await Deno.writeFile(imagesOutputDirectory + "/" + i + "." + image.metadata.type, new Uint8Array(image.buffer))
                    }
                    
                } else {
                    console.warn(messages.warnMalformedImage)
                    insertPageForMissingImage(pdf)
                    
                    if(imagesOutputDirectory) {
                        await Deno.writeFile(imagesOutputDirectory + "/" + i + "." + imageMissingImage.metadata.type, new Uint8Array(imageMissingImage.buffer))
                    }
                }


            } else {
                //we didn't manage to download the url: insert a blank page, warn and move on
                if (err == undefined) { throw new Error("Page is somehow undefined without an error being thrown") }

                console.warn(messages.warnCannotGetImage)
                console.warn("reason: " + err.message)

                insertPageForMissingImage(pdf)

                if(imagesOutputDirectory) {
                    await Deno.writeFile(imagesOutputDirectory + "/" + i + "." + imageMissingImage.metadata.type, new Uint8Array(imageMissingImage.buffer))
                }
            }

        } else {
            //we didn't find a url to an image in the page: insert a blank page, warn and move on

            insertPageForMissingImage(pdf)

            if(imagesOutputDirectory) {
                await Deno.writeFile(imagesOutputDirectory + "/" + i + "." + imageMissingImage.metadata.type, new Uint8Array(imageMissingImage.buffer))
            }

            console.warn(messages.warnCannotGetImage)
        }
    

        //search for the url to the next page
        const nextURL = findNextPageURL(page, nextLinkQuerySelector, base)
        
        if (nextURL != null) {
            //we did find a url: queue it and continue with the loop
            queuedURL = nextURL

        } else {
            //we didn't find a url: this probably means that this is the last page, call it a day and return
            return
        }
    }
}