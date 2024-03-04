# ArchiWind.io

ArchiWind.io website.  
Based on [Hugo](https://gohugo.io/), static assets processed by [Parcel](https://parceljs.org/), developed and deployed with Nix.

### Installation

You need to have Nix installed to use this project.
If you use `nix-direnv` the required dependencies will be automatically fetched. Otherwise run `nix develop`.

Then install the node dependencies with:

```
yarn install
```

### Development

Copy the `.envrc.example` file to `.envrc` and set the value for the required variables.

Pre-commit hooks are configured to check code quality (prettier, alejandra, statix). To execute those hooks manually run `pre-commit` after `git add`.

To start the local development server run the following command. Most changes are reflected live without having to restart the server.

```
devenv up
```

### Build

```
nix build .
```

This command generates static content into the `public` directory and can be served using any static contents hosting service.

### Updates

In case of any node dependency update it's important to keep updated also the Nix dependencies file. To do so run the following command after the update:

```
yarn2nix > nix/yarn-deps.nix && alejandra ./nix
```

### Deployment

Deployment happens automatically through Github Actions on new commits to the `master` branch, or when a PR is merged.

## How it works

This section explains some technical details about this project setup.

### Blog section

Blog posts are fetched from the [CMS](https://directus.nablaflow.io) in a prebuild step.

Hugo can't generate pages from dynamic content. [This solution](https://www.thenewdynamic.com/article/toward-using-a-headless-cms-with-hugo-part-2-building-from-remote-api/) is used as a workaround, to generate the blog post pages in a prebuild step.

The `prebuild/` folder of this repo contains another Hugo installation (let's call it _Hugo Prebuild_) that has the only purpose of retrieving blog posts from the API and using the returning JSON to generate the corresponding markdown files in the `prebuild/public/posts` folder.
The root Hugo installation then mounts the `prebuild/public/posts` folder to `content/blog`.

### Dev environment configuration

The development environment is configured using Nix and [devenv.sh](https://devenv.sh/).

After cloning this project, a few build commands must be executed or Hugo cannot be started in development mode:

- `cd prebuild && hugo`: to fetch the blog posts from the CMS and generate the corresponding markdown files on the filesystem.
- `yarn parcel build`: to build the first time the static assets (js and css files) for the project.

You don't have to worry about running those two steps manually as they are executed automatically when you run `devenv up`.

[process-compose](https://github.com/F1bonacc1/process-compose) is used in `nix/dev.nix` which takes care of executing those commands in the right order, starting `hugo server` and `parcel watch` right after them.
