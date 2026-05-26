# template

`template.mjs` renders small HTML templates from strings, files, or URLs. The interface is intentionally small: create one engine and call `render`, `renderToDataURL`, or `mount`.

## Import

```js
import Template from "./core/template/template.mjs";
```

## Render A String

```js
const template = new Template();

const html = await template.render("<h1>{{title}}</h1>", {
    title: "Hello"
});

console.log(html);
```

## Render A File

```js
const template = new Template({
    root: new URL("./templates", import.meta.url).pathname
});

const html = await template.render("./page.html", {
    title: "Dashboard",
    content: "<p>Ready</p>"
});
```

## Mount Into An Element

```js
const template = new Template();
const target = document.getElementById("preview");

await template.mount(target, "<strong>{{message}}</strong>", {
    message: "Saved"
});
```

## Variables

Use double braces for values from the context object.

```html
<h1>{{title}}</h1>
<p>{{user.name}}</p>
```

```js
await template.render(source, {
    title: "Profile",
    user: {
        name: "Chris"
    }
});
```

Default values use `||`.

```html
<h1>{{title || Untitled}}</h1>
```

## Loops

Use `each` for arrays. The item name follows `as`.

```html
{each links as link{
    <a href="{{link.href}}">{{link.label}}</a>
}}
```

```js
await template.render(source, {
    links: [
        { href: "/", label: "Home" },
        { href: "/projects", label: "Projects" }
    ]
});
```

## Conditionals

Use `if` for simple JavaScript expressions against the context.

```html
{if user.loggedIn{
    <button>Account</button>
}}
```

```js
await template.render(source, {
    user: {
        loggedIn: true
    }
});
```

## Includes

Use `include` to load another template relative to the current root. The body names the context property passed into that include.

```html
{include ./card.html{
    featured
}}
```

```js
await template.render("./page.html", {
    featured: {
        title: "Launch",
        description: "Ready for review"
    }
});
```

## File Names

The template module uses lowercase paths:

- `template.mjs`
- `content.mjs`
- `token.mjs`
- `context.mjs`
- `content-reader.mjs`
- `dom-content.mjs`
- `dynamic-tpl.html`

