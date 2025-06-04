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
 * Get an image from a url.
 * @param url The url to download from.
 * @returns The image found. Throws if no image is found
 */
export async function getImage(url: URL, requestInit?: RequestInit): Promise<ArrayBuffer> {

    //this try catch handles all the odd error where fetch just throws. it usually does good just to try again once or twice.
    let response
    try {
        response = await fetch(url, requestInit)
    } catch {
        throw new Error("fetch failed unexpectedly")
    }
    
    if (response.ok) {
        //we got a buffer! return it
        const image = response.arrayBuffer()
    
        return image

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
 * Construct an http error message to be displayed to the user
 * @param status The http status number.
 * @param helperText A text that helps explain to the user what went wrong, and how to fix it.
 * @returns Constructed error message.
 */
export function constructHttpErrorMsg(status: number, helperText: string) {
    return "http " + status + ":" + helperText
}


/**
 * Get the next page as an html document.
 * @param url The url to fetch.
 * @param requestInit A requestInit to send along with the fetch. Useful for sending headers.
 * @returns Html document. Or it throws.
 */
export async function getNextPage(url: URL, requestInit?: RequestInit): Promise<denoDom.HTMLDocument> {

    //this try catch handles all the odd error where fetch just throws. it usually does good just to try again once or twice.
    let response
    try {
        response = await fetch(url, requestInit)
    } catch {
        throw new Error("fetch failed unexpectedly")
    }

    if (response.ok) {
        //we got a document! now we convert it to something that we can use for query selection, and return
        const bodyText = await response.text()
        
        const doc = new denoDom.DOMParser().parseFromString(bodyText, "text/html")
    
        return doc
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
 * Insert an image into a pdf.
 * @param pdf The pdf document to insert into.
 * @param image The image to insert into the pdf.
 */
export function insertImage(pdf: PDFKit.PDFDocument, image: ArrayBuffer) {

    let metadata
    
    //attempt getting some data from the supposed image. if we can't, the buffer is probably not an image, or otherwise corrupt.
    try {
        metadata = imageSize(new Uint8Array(image))
    } catch {
        console.warn(messages.warnMalformedImage)
        insertPageForMissingImage(pdf)
        return
    }


    // //add a page to the pdf in the same size as the image we got
    pdf.addPage({size: [metadata.width, metadata.height]})

    // //check if the current image format is supported by the pdf
    if ( metadata.type == "png" || metadata.type == "jpg") {
        pdf.image(image, 0, 0)

    } else {
        //if no: convert the image to png
        const canvas = canvasKit.createCanvas(metadata.width, metadata.height)
        const ctx = canvas.getContext("2d")

        const decoded = canvas.decodeImage(image)
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


/**
 * Download a webcomic and insert it into a pdf.
 * @param pdf The pdf to add pages into. The user is required to open and close the pdf.
 * @param firstPageURL The url to the first page of the webcomic.
 * @param imageQuerySelector A css style query selector for an <img> element. The src attribute is used for downloading the image.
 * @param nextLinkQuerySelector A css style query selector for an <a> element. The href attribute is used for downloading the next page of the webcomic.
 * @param maxPages The maximum amount of pages to download.
 * @param headers Headers to send along with every request. See documentation for more information.
 * @returns 
 */
export async function downloadWebcomic(
        pdf: PDFKit.PDFDocument,
        firstPageURL: URL,
        imageQuerySelector: string,
        nextLinkQuerySelector: string, 
        maxPages: number,
        headers?: Record<string, string>){

    console.log("Starting download of: " + firstPageURL.href)
    
    
    const requestInit: RequestInit = { headers }
    const base = firstPageURL.origin

    
    let queuedURL = firstPageURL
    

    //loop until max pages is reached OR no next page is found
    for (let i = 0; i < (maxPages) ; i++) {

        //explain to the user that YES things are happening
        if (i % 30 == 0 && i != 0) {
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
            let image
            let err: Error | undefined
            for (let attempt = 0; attempt < maxAttempts; attempt++ ) {
                try {
                    image = await getImage(imageURL, requestInit)
                    break;
                } catch (e) {
                    err = e as Error
                }
            }

            if (image != undefined) {
                //we managed to download the url: insert the image into the document
                await insertImage(pdf, image)

            } else {
                //we didn't manage to download the url: insert a blank page, warn and move on
                if (err == undefined) { throw new Error("Page is somehow undefined without an error being thrown") }

                console.warn(messages.warnCannotGetImage)
                console.warn("reason: " + err.message)

                insertPageForMissingImage(pdf)

            }

        } else {
            //we didn't find a url to an image in the page: insert a blank page, warn and move on

            insertPageForMissingImage(pdf)
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