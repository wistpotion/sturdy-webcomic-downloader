# Sturdy Webcomic Downloader (sturdywcdl)

The Sturdy Webcomic Downloader is a tool that turns webcomics into pdfs.

It works on windows, linux and mac. It's built with deno.

## What does it do, more specifically?
### Downloads webcomics in the very specific format

If reading the webcomic goes like:
- go to website
- see image
- click button to go to next page
- repeat

then you can probably use this tool to download it

### It actually finishes your downloads

Old webcomics can have images missing, and some are hosted on unreliable servers. 

If there is an error with images missing or a page not responding, Sturdy will retry a few times, then move on. You download will finish, and images that are missing will be shown as blank images in your pdf.

## Installation

[Download the binary file](https://github.com/wistpotion/sturdy-webcomic-downloader/releases) for your platform. 

## Usage

Usage: `path/to/binary.exe <firstPageURL> <imageQuerySelector> <nextLinkQuerySelector> <outputFile> [options]`

- `firstPageURL`: The url to the first page of the webcomic.

- `imageQuerySelector`: A css style query selector for an `<img>` element. The src attribute is used for downloading the image (example: `img#comic-image`)

- `nextLinkQuerySelector`: A css style query selector for an `<a>` element. The href attribute is used for downloading the next page of the webcomic. (example: `a.next-page`)

- `outputFile`: path to the output file.

### Options

- `--maxPages [number]`: Limits the max amount of pages that can be downloaded.

- `--headers [key] [value]`: Headers to send along with every request. These are useful if a webcomic requires you to log in to read it. Multiple key value pairs can be used (example: `--headers "auth" "token" "gdpr" "consented"`)

### Examples

Download the first 50 pages of xkcd: `sturdywcdl-win.exe "https://xkcd.com/1/" "div#comic > img" "a[rel='next']" xkcd.pdf --maxPages 50` 

Download the entirety of Goth Western: `"https://www.gothwestern.com/" "img#cc-comic" "div#cc-comicbody > a" downloads/gothicwestern.pdf`

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

## Query selectors

Query selectors work exactly like css selectors. If that leaves you feeling confused, I'll do my best to do a very very basic rundown. If you want further information you can visit [the MDN documentation for css selectors.](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors)

Websites are built in the language HTML. HTML contains Elements like `<a>` (links), `<img>` (images) and `<div>` (a structural element). Here is an example of an html page.

```html
<!-- this is a comment, it doesn't change the page. It helps explain things though -->
<div id="wrapper">
	<section id="middle">
        <p>This is a webcomic</p> <!-- This is an element -->
        <div>
            <img src="https://comics.com/image.jpg"> <!-- This image element has a 'src' attribute --> 
        <nav class="cc-nav" role="navigation"> <!-- this <nav> element has the 'class' cc-nav -->
            <a rel="next" href="https://comics.com/comic/001">&gt;</a>
            <a rel="last" href="https://comics.com/comic/rewrite">&gt;&gt;</a>
        </nav>		
    </section>
</div>
```

Query selectors are a way to say "I want to target THIS specific image".

### How to see the structure of an html document (the blue clicky thing)

Now let's actually look into the structure of a website. For that we use something called the **web developer tools** window.

Browsers differ in how you open the web developer tools, so you'll have to look that up on your own. 

When you have opened the window, find the tab that is called **inspector** or **elements**. Different browsers have different names. What you want to find is the tab that shows you the structure of the website you are visiting. That structure can look something like:

```html
<html>
    <body>
        <a href="?page=2"> 
            <img class="comicnormal" src="comicpages/1.jpg ">
        </a>
    </body>
</html>
```

The html document can be quite large and complicated, so you can use the **node picker**. It's usually in the *top left* of the web developer tools window.

With the picker you can click on an element, and automatically get transported to the place in the html document where that element is. If you click the image on the website and is shown an `<img>` tag in the inspector, that is what you will want to select.

### Example selectors

Let's write a selector to get the image from the snipped above. We want to select the `<img>` element. 

```html
<html>
    <body>
        <img src="/logo.png">
        <a href="?page=2"> 
            <img src="comicpages/1.jpg ">
        </a>
    </body>
</html>
```

The element we want to select is the image element (`<img src="comicpages/1.jpg ">`). 

The selector for an image element is `"img"`. Unfortunately for us, there are two `<img>` elements in the document, so we have to get more specific.

The `<img>` element is in a `<a>` element. The selector for that is `"a > img"`. That will select only one element, so we can use that! Before we actually use this in Sturdy, we want to check that it actually works, we'll go over how to do that later.

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

Now, if there is no unique attribute on the element, but there is one on a parent node, we can still select it using the `":nth-child(n)"` selector. This is what we are imagining:
```html
<nav class="cc-nav" role="navigation">
    <a href="https://comics.com/comic/001">&gt;</a>
    <a href="https://comics.com/comic/rewrite">&gt;&gt;</a>
</nav>
```

To select the first `<a>` element in the `<nav>` element we can use `"nav:nth-child(0)"`. CSS starts counting from zero, so the first `<a>` is number 0, and the second `<a>` is number 1.

There are significantly more selectors than what been shown here, there is a cheat sheet further down.


### Testing your selectors


In the web developer tools, there is a tab called console. You can use it to write short snippets of code.

This is the snippet that we'll use: 
```js
console.log(document.querySelector("this is where you put your query selector"))
```

If we run that command and this shows, we have selected an element:
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

### Why do you need them?

Some websites require you to log in to be able to read their comics. Some websites with mature content requires you to have a special kind of header called "cookie", and will continue to redirect you unless you have the header.

### How to find them

Open the inspector. Look for a tab called **network** or something similar. We want to see the requests that the website is sending. 

Select one of the requests. You should now see information about that specific request. Now in that information window, there should be a headers tab. In that headers tab there should be an area called request headers. In that area you can see what headers you are sending with each request.

To recap: network tab > select request > headers tab > request headers

There is a fair bit of trail and error in figuring out what headers to use, so keep trying! 

## I still can't get it to work!
Submit an issue here on github or or write an email to wistpotion@gmail.com and I'll help you as soon as I can.