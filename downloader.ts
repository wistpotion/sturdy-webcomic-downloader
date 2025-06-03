import * as denoDom from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';
import sharp from "npm:sharp"


export const messages = {
    "warnImageElementNotFound": "WARNING: image was not found in the scraping process, adding empty page and moving on",
    "warnMalformedImage": "WARNING: image is malformed / corrupt, adding empty page instead",
    "warnCannotGetImage": "WARNING: cannot get the requested image, adding empty page instead",
    
    "errorFetchAuthlike": " - Error fetching url. Check if you need an authorization header, or a required cookie.",
    "errorFetchServerIssues": " - Error fetching url, it might be because the webcomic server is down. Try again later.",
    "errorFetch404": " - Error fetching url. Check if you have entered a correct url.",
    "errorUnknown": " - There was an unknown error fetching the page. Either the webpage is doing something VERY funny, or you should contact the developer of this software.",
}


/**
 * Find the URL to the image
 * @param document the html document to search
 * @param imageQuerySelector a css style selector for the image <img> element
 * @param base the base of the url (example: https://comics.com)
 * @returns a URL if a link was found, otherwise null
 */
export function findImageURL(document: denoDom.HTMLDocument, imageQuerySelector: string, base: URL | string): URL | null {
    const element = document.querySelector(imageQuerySelector)
    // console.log(element)

    if (element == null) { return null }

    const link = element.getAttribute("src")
    // console.log(link)

    if (link == null) { return null }

    return new URL(link, base)
}


/**
 * Get an image stream from a url
 * @param url the url to download from
 * @returns the image
 */
export async function getImage(url: URL, requestInit?: RequestInit): Promise<ArrayBuffer> {

    const response = await fetch(url, requestInit)

    
    if (response.ok) {
        const stream = response.arrayBuffer()
    
        return stream

    } else {

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
 * Find the URL to the next page from the html document
 * @param document the html document
 * @param nextQuerySelector a css style selector for an anchor <a> element that takes you to the next page 
 * @param base the base of the url (example: https://comics.com)
 * @returns the url for the next page, or null if none was found
 */
export function findNextPageURL(document: denoDom.HTMLDocument, nextQuerySelector: string, base: URL | string): URL | null {
    
    const element = document.querySelector(nextQuerySelector)

    if (element == null) { return null }

    const link = element.getAttribute("href")

    if (link == null) { return null }

    return new URL(link, base)
}


export function constructHttpErrorMsg(status: number, helperText: string) {
    return "http " + status + ":" + helperText
}


/**
 * Get the next page
 * @param url the url to fetch
 * @returns the html document
 */
export async function getNextPage(url: URL, requestInit?: RequestInit): Promise<denoDom.HTMLDocument> {

    const response = await fetch(url, requestInit)
    
    if (response.ok) {
        const bodyText = await response.text()
        
        const doc = new denoDom.DOMParser().parseFromString(bodyText, "text/html")
    
        return doc
    } else {
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
 * Insert an image into a pdf
 * @param pdf the pdf document to insert into
 * @param image the image to insert into the pdf
 */
export async function insertImage(pdf: PDFKit.PDFDocument, image: ArrayBuffer) {

    const sharpImage = sharp(image)
    let metadata
    try {
        metadata = await sharpImage.metadata()
    } catch {
        console.warn(messages.warnMalformedImage)
        insertPageForMissingImage(pdf)
        return
    }

    
    pdf.addPage({size: [metadata.width, metadata.height]})

    //check if we can insert the image as is
    if ( metadata.format == "png" || metadata.format == "jpeg") {
        pdf.image(image, 0, 0)

    } else {
        //if no: convert the image to png
        const converted = await sharpImage.png().toBuffer()
        pdf.image(converted, 0, 0)
    }
}

/**
 * Insert an "image missing" page
 * @param pdf the document to insert the empty page into
 */
export function insertPageForMissingImage(pdf: PDFKit.PDFDocument) {
    pdf.addPage({size: [200, 200]})
    pdf.text("image missing", 0, 0, { width: 200, height: 200, align: "center", baseline: "middle"})
}


export interface ITraversePageOptions {
    headers?: Record<string, string>,
    maxPages?: number,
}

function verboseLog(val: unknown) {
    console.log(val)
}

/**
 * 
 * @param pdf the caller is responsible for creating the pdf and for ending it.
 * @param startUrl 
 * @param imageQuerySelector 
 * @param nextLinkQuerySelector 
 * @param maxPages 
 * @param headers 
 * @returns 
 */
export async function downloadWebcomic(
        pdf: PDFKit.PDFDocument,
        startUrl: URL,
        imageQuerySelector: string,
        nextLinkQuerySelector: string, 
        maxPages: number,
        headers?: Record<string, string>){

    console.log("Starting download!")

    //loop until next page button isn't found OR max pages reached
    
    const base = startUrl.origin

    let queuedURL = startUrl
    

    for (let i = 0; i < (maxPages) ; i++) {
        if (i % 30 == 0) {
            console.log("Has downloaded " + i + " pages.")
        }

        const requestInit: RequestInit = {
            headers
        }

        //get the queued page
        // console.log(queuedPage)
        const page = await getNextPage(queuedURL, requestInit)

    
        // //find the image in the page
        const imageURL = await findImageURL(page, imageQuerySelector, base)

        if (imageURL != null) {
            //success: get image in page

            const maxAttempts = 5
            let image
            let err
            for (let attempt = 0; attempt < maxAttempts; attempt++ ) {
                try {
                    image = await getImage(imageURL, requestInit)
                    break;
                } catch (e) {
                    err = e
                }
            }

            if (image != null) {
                //success: write the image to the pdf
                await insertImage(pdf, image)

            } else {
                //fail: add blank to pdf AND log issue
                console.warn(messages.warnCannotGetImage)
                console.warn("reason: " + err)

                await insertPageForMissingImage(pdf)

            }

        } else {
            //fail: add blank to pdf AND log issue

            await insertPageForMissingImage(pdf)
            console.warn(messages.warnCannotGetImage)
        }
    
        //find the next page
        const nextURL = await findNextPageURL(page, nextLinkQuerySelector, base)
        if (nextURL != null) {
            queuedURL = nextURL
        } else {
            //out of pages, we're done!
            return
        }
    }
}