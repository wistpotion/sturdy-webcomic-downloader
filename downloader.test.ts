/**
 * 
 * 
 * This file contains tests for the downloader. It's got twice the size of the downloader, and took a fair bit to write, but it saves a LOT of debugging time.
 * 
 * 
 */



// deno-lint-ignore-file no-unused-vars



import { assertEquals, assertRejects } from "jsr:@std/assert"
import { assertSpyCallArgs, assertSpyCalls, returnsNext, stub } from "@std/testing/mock"
import { getImage, findImageURL, findNextPageURL, downloadWebcomic, getNextPage, insertImage, messages, insertPageForMissingImage, constructHttpErrorMsg } from "./downloader.ts"
import * as denoDom from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'
import { toReadableStream } from "https://deno.land/std/io/mod.ts";



const mockPdf = { 
    addPage: () => { return mockPdf },
    image: (src: unknown, options?: unknown) => { return mockPdf },
    text: (text: string, options: unknown) => { return mockPdf },
    end: () => {},
} as PDFKit.PDFDocument //trust me bro


Deno.test({
    name: "findImageURL couldn't find element: return null",
    fn: function() {
        //couldn't find the image
        assertEquals(
            findImageURL(
                new denoDom.DOMParser().parseFromString(
                    "<html></html>", "text/html"
                ),
                "img",
                "https://test.com"
            ), 
            null)
    }})
        

Deno.test({
    name: "findImageURL link not in element: return null",
    fn: function() {
        //image has no link
        assertEquals(
            findImageURL(
                new denoDom.DOMParser().parseFromString(
                    "<html><img></html>", "text/html"
                ),
                "img",
                "https://test.com"
            ), 
            null)
    }})
        

Deno.test({
    name: "findImageURL link is relative: return url",
    fn: () => {
        assertEquals(
            findImageURL(
                new denoDom.DOMParser().parseFromString(
                    "<html><img src='/img.png'></html>", "text/html"
                ),
                "img",
                "https://test.com"
            ), 
            new URL("https://test.com/img.png"))
    }
})


Deno.test({
    name: "findImageURL ok: return url",
    fn: function() {
        assertEquals(
            findImageURL(
                new denoDom.DOMParser().parseFromString(
                    "<html><img src='https://test.com/img.png'></html>", "text/html"
                ),
                "img",
                "https://test.com"
            ), 
            new URL("https://test.com/img.png"))
    }
})



Deno.test({
    name: "getImage fetch failed due to (most likely) auth error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 403 }) ),
            Promise.resolve( new Response("", { status: 401 }) ),
            Promise.resolve( new Response("", { status: 302 }) ),
            Promise.resolve( new Response("", { status: 303 }) ),
            Promise.resolve( new Response("", { status: 307 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getImage(new URL("https://test.com")) },
                Error, constructHttpErrorMsg((await results[i]).status, messages.errorFetchAuthlike))
        }
    }})


Deno.test({
    name: "getNextPage fetch failed due to (most likely) auth error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 403 }) ),
            Promise.resolve( new Response("", { status: 401 }) ),
            Promise.resolve( new Response("", { status: 302 }) ),
            Promise.resolve( new Response("", { status: 303 }) ),
            Promise.resolve( new Response("", { status: 307 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getNextPage(new URL("https://test.com")) },
                Error, constructHttpErrorMsg((await results[i]).status, messages.errorFetchAuthlike))
        }
    }})


Deno.test({
    name: "getImage fetch failed due to (most likely) server issues: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 500 }) ),
            Promise.resolve( new Response("", { status: 503 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getImage(new URL("https://test.com")) },
                Error, constructHttpErrorMsg((await results[i]).status, messages.errorFetchServerIssues))
        }
    }})
    

Deno.test({
    name: "getNextPage fetch failed due to (most likely) server issues: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 500 }) ),
            Promise.resolve( new Response("", { status: 503 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getNextPage(new URL("https://test.com")) },
                Error, constructHttpErrorMsg((await results[i]).status, messages.errorFetchServerIssues))
        }
    }})

    

Deno.test({
    name: "getImage fetch failed due to 404 error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 404 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getImage(new URL("https://test.com")) },
                Error, constructHttpErrorMsg((await results[i]).status, messages.errorFetch404))
        }
    }})

    
Deno.test({
    name: "getNextPage fetch failed due to 404 error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 404 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getNextPage(new URL("https://test.com")) },
                Error,  constructHttpErrorMsg((await results[i]).status, messages.errorFetch404))
        }
    }})

    

Deno.test({
    name: "getImage fetch failed due to unknown error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 511 }) ),
            Promise.resolve( new Response("", { status: 401 }) ),
            Promise.resolve( new Response("", { status: 400 }) ),
            Promise.resolve( new Response("", { status: 406 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getImage(new URL("https://test.com")) },
                Error, (await results[i]).status + (await results[i]).statusText) + messages.errorUnknown
        }
    }})

Deno.test({
    name: "getNextPage fetch failed due to unknown error: throw",
    fn: async () => {
        const results: Promise<Response>[] = [
            Promise.resolve( new Response("", { status: 511 }) ),
            Promise.resolve( new Response("", { status: 401 }) ),
            Promise.resolve( new Response("", { status: 400 }) ),
            Promise.resolve( new Response("", { status: 406 }) ),
        ]

        using stubFetch = stub(globalThis, "fetch", returnsNext(results))

        for (let i = 0; i < results.length; i++) {
            await assertRejects(
                async () => { await getNextPage(new URL("https://test.com")) },
                Error, (await results[i]).status + (await results[i]).statusText) + messages.errorUnknown
        }
    }})
    

Deno.test({
    name: "getImage ok: return stream",
    fn: async () => {
        const file = (await Deno.readFile("test/test.jpg")).buffer

        using stubFetch = stub(globalThis, "fetch", returnsNext([
            Promise.resolve( new Response(file, { status: 200 }) )
        ]))
        
        assertEquals(
            await getImage(new URL("https://test.com/img")), 
            file)
    }
})




Deno.test({
    name: "findNextPageURL couldn't find element: return null",
    fn: () => {
        assertEquals(
            findNextPageURL(new denoDom.DOMParser().parseFromString(
                "<html></html>", "text/html"
            ), "a", ""),
            null)
    }})

    
Deno.test({
    name: "findNextPageURL element has no link: return null",
    fn: () => {
        assertEquals(
            findNextPageURL(new denoDom.DOMParser().parseFromString(
                "<html><a>next</a></html>", "text/html"
            ), "a", ""),
            null)
    }})
    
    
Deno.test({
    name: "findNextPageURL link is relative: return url",
    fn: () => {
        //all good
        assertEquals(
            findNextPageURL(new denoDom.DOMParser().parseFromString(
                "<html><a href='next'>link to next page</a></html>", "text/html"
            ), "a", "https://link.to"),
            new URL("https://link.to/next"))
    }})


Deno.test({
    name: "findNextPageURL ok: return url",
    fn: () => {
        //all good
        assertEquals(
            findNextPageURL(new denoDom.DOMParser().parseFromString(
                "<html><a href='https://link.to/next'>link to next page</a></html>", "text/html"
            ), "a", "https://link.to"),
            new URL("https://link.to/next"))
    }})



Deno.test({
    name: "getNextPage ok: return htmldocument",
    fn: async () => {
        using stubFetch = stub(globalThis, "fetch", (url) => {
            if (url.toString() == "https://test.com/") {
                return Promise.resolve( new Response(
                    "<html></html>", { status: 200 }) )
            }

            throw new Error("this path isn't mocked: " + url)
        })


        assertEquals(
            (await getNextPage(new URL("https://test.com"))).textContent,
            new denoDom.DOMParser().parseFromString("<html></html>", "text/html").textContent
        )

    }})



Deno.test({
    name: "insertImage image requires conversion: convert to png and add page",
    fn: async () => {
        //this can probably be done significantly better
        const buffer = new Response(toReadableStream(await Deno.open("test/test.gif"))).arrayBuffer()
        // const uint8Buffer = new Uint8Array(await buffer)

        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")

        await insertImage(mockPdf, await buffer)

        assertSpyCalls(stubAddPage, 1)
        assertSpyCalls(stubImage, 1)
    }
})


Deno.test({
    name: "insertImage image is malformed: insert empty and log",
    fn: async () => {
        const buffer = await new Response(
                toReadableStream(
                    await Deno.open("test/garbage.txt")
                )
            ).arrayBuffer()
        
        
        using stubAddPage = stub(mockPdf, "addPage")
        // console.log(mockPdf.addPage)
        using stubWarn = stub(console, "warn")
        // using stubImage = stub(pdf, "image")

        await insertImage(mockPdf, buffer)

        assertSpyCalls(stubAddPage, 1)
        assertSpyCallArgs(stubWarn, 0, [messages.warnMalformedImage])
    }
})



Deno.test({
    name: "insertImage ok",
    fn: async () => {
        //horrifying piece of code, there is probably a better way to do this
        const buffer = await new Response(toReadableStream(await Deno.open("test/test.png"))).arrayBuffer()

        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")
        
        await insertImage(mockPdf, buffer)
        
        //insertImage ok: page size is equal to image size
        const addPageArgs: PDFKit.PDFDocumentOptions = {
            size: [300, 500]
        }
        
        //insertImage ok: page was added
        assertSpyCalls(stubAddPage, 1)
        assertSpyCallArgs(stubAddPage, 0, [addPageArgs])
        assertSpyCalls(stubImage, 1)
    }
})




Deno.test({
    name: "insertPageForMissingImage ok: empty page was added",
    fn: () => {
        
        using stubAddPage = stub(mockPdf, "addPage")

        insertPageForMissingImage(mockPdf)
        
        assertSpyCalls(stubAddPage, 1)
    }
})


Deno.test({
    name: "downloadWebcomic stop at max page reached: correct amount of pages",
    fn: async () => {
        using stubFetch = stub(globalThis, "fetch", async (url) => {
            if (url.toString() == "https://test.com/") {
                return Promise.resolve(new Response(
                    "<html> <img src='https://test.com/img'> <a href=/>next</a> </html>", { status: 200 }) )

            } else if (url.toString() == "https://test.com/img") {
                const buffer = (await Deno.readFile("test/test.jpg")).buffer
                return Promise.resolve(new Response(buffer, { status: 200 }) )
            }

            throw new Error("this path isn't mocked!")
        })

        
        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")

        await downloadWebcomic(mockPdf, new URL("https://test.com"), "img", "a", 100)

        assertSpyCalls(stubAddPage, 100)
    }})


Deno.test({
    name: "downloadWebcomic findImageLink returned null: insert empty image and warn",
    fn: async () => {
        using stubFetch = stub(globalThis, "fetch", async (url) => {
            if (url.toString() == "https://test.com/") {
                return Promise.resolve( new Response(
                    "<html> <a>next</a> </html>", { status: 200 }) )

            } else if (url.toString() == "https://test.com/img/") {
                const buffer = (await Deno.readFile("test/test.jpg")).buffer
                return Promise.resolve(new Response(buffer, { status: 200 }) )
            }

            throw new Error("this path isn't mocked!" + url.toString())
        })

        
        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")
        using stubWarn = stub(console, "warn")

        await downloadWebcomic(mockPdf, new URL("https://test.com"), "img", "a", 10000)

        assertSpyCalls(stubAddPage, 1)
        assertSpyCalls(stubWarn, 1)
    }})



Deno.test({
    name: "downloadWebcomic getImage threw too many times: insert empty image and warn",
    fn: async () => {
        //also fulfills:
        //downloadWebcomic findNextPage returned null: stop, check amount of pages
        
        using stubFetch = stub(globalThis, "fetch", (url) => {
            switch (url.toString()) {

                case "https://test.com/1":
                    return Promise.resolve( new Response(
                        "<html><img src='https://test.com/img1'><a id='next' href='/2'>next</a></html>", { status: 200 }) )

                case "https://test.com/2":
                    return Promise.resolve( new Response(
                        "<html><img src='https://test.com/img2'><a id='next' href='/3'>next</a></html>", { status: 200 }) )

                case "https://test.com/3":
                    return Promise.resolve( new Response(
                        "<html><img src='https://test.com/img3'></html>", { status: 200 }) )
                    
                case "https://test.com/img1":
                    return new Promise((resolve, reject) => { 
                        Deno.readFile("test/test.gif").then((img) => {
                            resolve(new Response(null, { status: 500 }) )
                        })})

                case "https://test.com/img2":
                case "https://test.com/img3":
                    return new Promise((resolve, reject) => { 
                        Deno.readFile("test/test.gif").then((img) => {
                            resolve(new Response(img, { status: 200 }) )
                        })})

                default:
                    throw new Error("this path isn't mocked: " + url)
            }
        })

        
        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")
        using stubWarn = stub(console, "warn", () => {})

        await downloadWebcomic(mockPdf, new URL("https://test.com/1"), "img", "a", 10000,)

        assertSpyCalls(stubAddPage, 3)
        assertSpyCalls(stubImage, 2)
        assertSpyCallArgs(stubWarn, 0, [messages.warnCannotGetImage])


    }})


Deno.test({
    name: "downloadWebcomic only allowed with correct headers",
    fn: async () => {
            // throw new Error()
        using stubFetch = stub(globalThis, "fetch", (url, init) => {
            switch (url.toString()) {

                case "https://test.com/1":
                    {
                        const headers = init?.headers as Record<string, string>
                        if (headers && headers["auth"] == "token") {
                            return Promise.resolve(new Response(
                                "<html><img src='https://test.com/img1'></html>", { status: 200 }) )

                        } else {
                            
                            return Promise.resolve( new Response(
                                null, { status: 403 }) )
                        }
                    }


                case "https://test.com/img1":
                    {
                        const headers = init?.headers as Record<string, string>
                        if (headers && headers["auth"] == "token") {
                            return new Promise((resolve, reject) => { 
                                Deno.readFile("test/test.jpg").then((img) => {
                                    resolve(new Response(img, { status: 200 }) )
                                })})
                        } else {
                            return Promise.resolve( new Response(
                                null, { status: 403 }) )
                        }
                    }
                    

                default:
                    throw new Error("this path isn't mocked: " + url)
            }
        })

        {
            using stubAddPage = stub(mockPdf, "addPage")
            using stubImage = stub(mockPdf, "image")
            using stubError = stub(console, "error")
    
            //result: fail without header
            await downloadWebcomic(mockPdf, new URL("https://test.com/1"), "img", "a", 10000)

            assertSpyCallArgs(stubError, 0, [constructHttpErrorMsg(403, messages.errorFetchAuthlike)])
            assertSpyCalls(stubAddPage, 0)
            assertSpyCalls(stubImage, 0)
        }

        using stubAddPage2 = stub(mockPdf, "addPage")
        using stubImage2 = stub(mockPdf, "image")

        //result: succeed with header
        await downloadWebcomic(mockPdf, new URL("https://test.com/1"), "img", "a", 10000, { auth: "token" }),

        assertSpyCalls(stubAddPage2, 1)
        assertSpyCalls(stubImage2, 1)
    }
})



Deno.test({
    name: "downloadWebcomic ok",
    fn: async () => {
            // throw new Error()
        using stubFetch = stub(globalThis, "fetch", async (url) => {
            switch (url.toString()) {

                case "https://test.com/1":
                    return Promise.resolve(new Response(
                        "<html><img src='https://test.com/img1'><a id='next' href='/2'>next</a></html>", { status: 200 }) )

                case "https://test.com/2":
                    return Promise.resolve(new Response(
                        "<html><img src='https://test.com/img2'><a id='next' href='/3'>next</a></html>", { status: 200 }) )

                case "https://test.com/3":
                    return Promise.resolve(new Response(
                        "<html><img src='https://test.com/img3'></html>", { status: 200 }) )
                    
                case "https://test.com/img1":
                case "https://test.com/img2":
                case "https://test.com/img3":
                    {
                        const buffer = await Deno.readFile("test/test.gif")
                        return Promise.resolve(new Response(buffer, {status: 200}))
                    }

                default:
                    throw new Error("this path isn't mocked: " + url)
            }
        })

        using stubAddPage = stub(mockPdf, "addPage")
        using stubImage = stub(mockPdf, "image")

        await downloadWebcomic(mockPdf, new URL("https://test.com/1"), "img", "a", 10000),

        assertSpyCalls(stubAddPage, 3)
        assertSpyCalls(stubImage, 3)
    }
})
