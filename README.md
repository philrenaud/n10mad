# n10mad

So far, just a series of fetchers to get Github-provided data for the Nomad repo.
Add new fetchable resources as fetch.ts

To install dependencies:

```bash
bun install
```

To start fetching:

```bash
bun run fetch
```

To fetch specific resources, you can pass the names of those resources in.

Valid resource names are:
- contributors
- stars
- files
- releases
