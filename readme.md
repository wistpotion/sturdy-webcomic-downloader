# Sturdy Webcomic Downloader (sturdywcdl)

The Sturdy Webcomic Downloader is a tool that turns webcomics into pdfs. Or a folder of pictures.

It works on windows, linux and mac.

## What does it do, more specifically?
### Downloads webcomics in the very specific format

If reading the webcomic goes like:
- go to website
- see image
- click button to go to next page
- repeat

then you can probably use this tool to download it.

Sturdy is built to handle when the webcomic is missing images (replacing them with blanks), and unreliable servers. Your downloads will (unless in very specific and rare cases) finish downloading.

## Installation

[Download the binary file](https://github.com/wistpotion/sturdy-webcomic-downloader/releases) for your platform (windows, mac, linux). 

## Usage

Sturdy is a tool for the command line. You can on most operating systems right click in a folder, and then select "open in terminal" or similar. You want to open the very cool hacker window in the folder where you have downloaded Sturdy.

The stuff below here will be explained in further detail further down, so just keep on reading and you'll figure it out.

Usage: `path/to/sturdywcdl-win.exe <firstPageURL> <imageQuerySelector> <nextLinkQuerySelector> <outputFile> [options]`

- `firstPageURL`: The url to the first page of the webcomic.

- `imageQuerySelector`: A css style query selector for an `<img>` element. The src attribute is used for downloading the image. (example: `img#comic-image`)

- `nextLinkQuerySelector`: A css style query selector for an `<a>` element. The href attribute is used for downloading the next page of the webcomic. (example: `a.next-page`)

- `outputFile`: path to the output file. (should end with .pdf)

You are required to supply the program those things.

### Options that you may add

- `--maxPages [number]`: Limits the max amount of pages that can be downloaded. (otherwise max is ten thousand images)

- `--headers [key] [value]`: Headers to send along with every request. These are useful if a webcomic requires you to log in to read it. Multiple key value pairs can be used (example: `--headers "auth" "token" "gdpr" "consented"`)

- `--imageOutputDir [path]`: When specified, the software will output the raw downloaded images. Useful if you want to post process using other programs, like the Kindle Comic Converter.

### Examples

Download the first 50 pages of xkcd: `sturdywcdl-win.exe "https://xkcd.com/1/" "div#comic > img" "a[rel='next']" xkcd.pdf --maxPages 50` 

Download the entirety of Goth Western: `sturdywcdl-win.exe "https://www.gothwestern.com/" "img#cc-comic" "div#cc-comicbody > a" downloads/gothicwestern.pdf`

Download the first 10 pages of Lost Nightmare and keep the images: `sturdywcdl-win.exe "https://www.lostnightmare.com/comic/01-01" "img#cc-comic" "div#cc-comicbody > a" dl/lostnightmare.pdf --maxPages 10 --imageOutputDir "dl/img"`

## Very common errors

### The terminal immediately getting flooded with `WARNING: cannot get the requested image`

Probable issue: the `imageQuerySelector` is incorrect.

Fix by: changing your selector (see further down)

### Only the first page of the webcomic is output.

Probable issue: the `nextLinkQuerySelector` is incorrect.

Fix by: changing your selector (see further down)

### `error sending request for url...`

Probable issue: the `firstPageURL` is most likely incorrect.

Fix by: updating your url.

### If you have pondered the issue for a while and have tried a bunch of different things but can't get it to work, please contact me.

## Query selectors

Query selectors work exactly like css selectors. If that leaves you feeling confused, I'll do my best to do a very very basic explaination. If you want further information you can visit [the MDN documentation for css selectors.](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors)

Websites are built with HTML. HTML contains Elements like `<a>` (links), `<img>` (images) and `<div>` (a structural element). Here is an example of an html page.

```html
<!-- this is a comment, it doesn't change the page. It helps explain things though -->
<div id="wrapper">
	<section id="middle">
        <p>This is a webcomic</p> <!-- that to the left of me is an element -->
        <div>
            <img src="https://comics.com/image.jpg"> <!-- This image element has a 'src' attribute --> 
        <nav class="cc-nav" role="navigation"> <!-- this <nav> element has the 'class' called 'cc-nav' -->
            <a rel="next" href="https://comics.com/comic/001">&gt;</a>
            <a rel="last" href="https://comics.com/comic/rewrite">&gt;&gt;</a>
        </nav>		
    </section>
</div>
```

**Query selectors are a way to say "I want to target THIS specific image".**

### How to see the html document of a website

For seeing the structure of a website we'll use the **web developer tools** window.

Browsers differ in how you open the web developer tools, so you'll have to look that up on your own. 

When you have opened the window, find the tab that is called **inspector** or **elements**. What you want to find is the structure of the website you are visiting. That structure can look something like:

```html
<html>
    <body>
        <a href="?page=2"> 
            <img class="comicnormal" src="comicpages/1.jpg ">
        </a>
    </body>
</html>
```

The html document can be quite large and complicated, so you can use the **node picker** to make the developer tools show you a specific element. It's usually in the *top left* of the web developer tools window.

With the **picker** you can click on an element, and automatically get shown the place in the structure where that element is. If you click the image on the website and is shown an `<img>` tag in the inspector, that is what you will want to select.

### Example selectors

Let's write an `imageQuerySelector`. We want to select the image containing the comic page. 

```html
<html>
    <body>
        <img src="/logo.png">
        <a href="?page=2"> 
            <img src="comicpages/1.jpg "> <!--this element is what we want to select -->
        </a>
    </body>
</html>
```

The selector for an image element is `"img"`. Unfortunately for us, there are two `<img>` elements in the document, so we have to get more specific.

The `<img>` element is in a `<a>` element. The selector for that is `"a > img"`. That will select only one element, so we can use that!

Let's try a different html document, and this time we write our `nextLinkQuerySelector`:
```html
<div id="wrapper">
	<section id="middle">
		<div id="contentarea">
            <nav class="cc-nav" role="navigation">
                <a rel="next" href="https://comics.com/comic/001">&gt;</a>
                <a rel="last" href="https://comics.com/comic/rewrite">&gt;&gt;</a>
            </nav>		
        </div>
    </section>
</div>
```

By using the picker we learn that the element we want to select is:
```html
<a rel="next" href="https://comics.com/comic/001">&gt;</a>
```

The simplest way to select the element is with an attribute selector. In this case the query selector would be `"[rel='next']"`.

Now, if there is no unique attribute on the element, but there is one on a parent node, we can still select it using the `":nth-child(n)"` selector. This is the situation we are imagining:

```html
<nav class="cc-nav" role="navigation">
    <a href="https://comics.com/comic/001">&gt;</a>
    <a href="https://comics.com/comic/rewrite">&gt;&gt;</a>
</nav>
```

To select the first `<a>` element in the `<nav>` element we can use `"nav:nth-child(0)"`. CSS starts counting from zero, so the first `<a>` is number 0, and the second `<a>` is number 1.

Now, let's test our selectors to make sure we have done things correctly.


### Testing your selectors


In the web developer tools, there is a tab called **console**. You can use it to test code.

This is the snippet that we'll use: 
```js
console.log(document.querySelector("this is where you put your query selector"))
```

If we run that command and something like this shows, we have selected an element:
```html
<img id="cc-comic" title="0200" src="https://comics.com/image.jpg">
```

If we instead get this, something is wrong with out selector:
```js 
undefined
```


### Selectors cheat sheet

For selecting `<div></div>` use `div`.

For selecting `<a attribute-name='value'></a>` use `"[attribute-name='value']"`. (please put `'` inside and `"` outside, otherwise the software gets very sad).

For selecting `<img class='prettypicture'>` use `.prettypicture`.

For selecting `<img id='prettyid'>` use `#prettyid`.

For selecting the `<img>` in `<div><img></div>` use `div > img`.

For selecting the *second* `<img>` in `<div><img src='image'><img src='anotherimg'></div>` use `:nth-child(1)`. (Remember: css starts counting at 0. So using `:nth-child(0)` selects the *first* child, and `:nth-child(1)` the second).

There are a lot more of these, so if you need to get more specific with your query selectors then [read the documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors).

## Headers

### What are they?

Requests are sent from your computer to the server that contains the website you're visiting. Requests consist of a body and headers. The body is the main part of the message (for example an image) and headers are other important stuff. It contains stuff like login tokens (passwords but for computers) and cookies. It also contains information about your browser, which country you are from and so on. 

### Why do you sometimes need them to download webcomics?

Some websites require you to log in to be able to read their comics. Some websites with mature content require you to have a "i want to see mature content" consent cookie, and will continue to redirect you unless you have the header.

### How to find them

Open the inspector. Look for a tab called **network** or something similar. We want to see the requests that the website is sending. 

Select one of the requests. You should now see information about that specific request. Now in that information window, there should be a headers tab. In that headers tab there should be an area called request headers. In that area you can see what headers you are sending with each request.

To recap: network tab > select a request > headers tab > request headers

Headers come in key value pairs. When using them in Sturdy, make sure that the first thing you write is the key, and the second is the value. (example: `--headers "key" "value"` or `--headers "auth" "token" "browser" "firefox"`)

There is a bit of trail and error in figuring out what headers to use, so keep trying!

## I still can't get it to work!
Submit an issue here on github or or write an email to wistpotion@gmail.com and I'll help you as soon as I can.