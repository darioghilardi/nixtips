# NixTips.io

NixTips.io website.  
Based on [Hugo](https://gohugo.io/), static assets processed by [Parcel](https://parceljs.org/), developed and deployed with Nix.

### Installation

You need to have Nix installed to use this project.
If you use `nix-direnv` all the required dependencies will be automatically fetched. Otherwise run `nix develop`.

### Development

To start the local development server on port 5050 run the following command. Most changes are reflected live without server restart.

```
start-dev
```

#### Adding or updating Node dependencies

All dependencies are managed through Nix, even in development mode.

```
yarn2nix > nix/yarn-deps.nix && alejandra ./nix
```

### Build

```
nix build . -L
```

This command generates static content into the `public` directory and can be served using any static contents hosting service.

### Deployment

Deployment happens automatically through Github Actions on new commits to the `master` branch, or when a PR is merged.
