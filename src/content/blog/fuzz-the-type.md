---
title: Fuzz the type, not just the value
description: "A one-line habit that keeps finding authorization bugs: swap a parameter's type, not just its value. From a bug bounty hunter's notebook."
ogDescription: "Swap the type, not just the payload: a one-line habit that keeps finding authorization bugs."
dek: Change a parameter's type, not just its value, to find authorization bugs.
date: 2026-09-14
readTime: 2
section: Bug bounty tips
categories: [Engineering, Security]
tags: [bug bounty, appsec, tips]
cover: /assets/img/blog/fuzz-the-type.svg
---

Next time you hit an auth or permission check, don't just fuzz the
value: **fuzz the type**.

Swap a string parameter for an object, an array, or a boolean:

```
"id": "123"   →   "id": {"$ne": null}
"id": "123"   →   "id": true
```

Backends often validate the *value* but forget to enforce the
expected *type*. The lookup or the permission check quietly
takes a different code path for anything that isn't a plain string,
and the authorization check gets skipped entirely.

## Where this earns acceptances

- **NoSQL lookups**: Mongo-style operators
  (`{"$ne": null}`, `{"$gt": ""}`) sail
  through comparisons that were only ever tested against strings.
- **ORMs and loose comparisons**: a boolean or an
  array can bypass an equality or membership check written with
  strings in mind.
- **Type juggling**: PHP-style loose comparison
  behavior is old news, but it's still alive and well behind JSON
  APIs.

## How to run it

Keep a small type-swap list (`{}`,
`{"$ne": null}`, `[]`, `true`,
`false`, `null`, `0`) and fire it
at every ID-like parameter once the request is mapped. It takes
minutes to build the list and seconds per endpoint.

If the response differs between `"123"` and
`{"$ne": null}` in any way beyond the error message,
you have a lead.
