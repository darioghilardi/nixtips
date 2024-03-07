# NixTips.io

NixTips.io website.  
Based on [Hugo](https://gohugo.io/), static assets processed by [Parcel](https://parceljs.org/), developed and deployed with Nix.

### Installation

You need to have Nix installed to use this project.
If you use `nix-direnv` the required dependencies will be automatically fetched. Otherwise run `nix develop`.

Then install the node dependencies with:

```
yarn install
```

### Development

To start the local development server on port 5050 run the following command. Most changes are reflected live without server restart.

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

### Dev environment configuration

The development environment is configured using Nix and [devenv](https://devenv.sh).

After cloning this project, a build command must be executed or Hugo cannot be started in development mode:

- `yarn parcel build`: to build the first time the static assets (js and css files) for the project.

You don't have to worry about running those two steps manually as they are executed automatically when you run `devenv up`.
