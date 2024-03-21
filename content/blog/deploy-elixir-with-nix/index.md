---
title: Deploy Elixir projects with Nix
slug: deploy-elixir-projects-with-nix
date: 2024-01-12T12:23:12
featured_image: '/blog/deploy-phoenix-projects-with-nix/featured.jpg'
author: Dario Ghilardi
author_image: '/images/dario.jpeg'
meta_title: 'title'
meta_description: desc
short_excerpt: short
long_excerpt: long
draft: false
tags: ['nix', 'elixir', 'phoenix']
---

### Introduction

This post is an introduction to packaging and deploying an Elixir application using Nix. For the purpose of this post we're going to "nixify" a Phoenix project, from the setup of the development environment to the release.

You need to have Nix installed and flakes support enabled.

For the purpose of this post we are going to use a new Phoenix project generated with `mix phx.new`.

Alert: We're taking deliberate choices during this post, please do not think this is "the way" of packaging an Elixir application, it's just "one way" that works.

### Get started

The first step is to make sure your project is a flake. A flake is nothing more than a directory that contains a `flake.nix` and a `flake.lock` files at its root.

We don't have them yet, but Nix provides a CLI command to generate the `flake.nix` files, just enter the directory of your project and run:

```
nix flake init
```

Wait a few seconds and you'll find the `flake.nix` file in your project root. Well done, your project is (almost) a flake now!

The `flake.nix` file is where we're going to configure the project using Nix. The missing `flake.lock`, as the name suggests, is just a lockfile (like `mix.lock`), it keeps track of the versions of your flake "inputs". You don't have to worry about it now, it will be generated for you as soon as your run any command against the flake with the CLI.

But what is a flake input and why do we need a lockfile at all?
Inputs are Nix dependencies required to "build" your flake, for example Git repositories, urls or your filesystem.

Open the generated `flake.nix` file to find one input called `nixpkgs`:

```nix
inputs = {
  nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
};
```

[`nixpkgs`](https://github.com/NixOS/nixpkgs) is a Git repository where all packages built with Nix are stored. It's probably the biggest package repository in the world and it is continuously update with new versions of each package. This is great but we can't change the versions of our dependencies each time we build our project just because those dependencies have been updated on `nixpkgs`!
This is the reason why a flake to be complete requires a `flake.lock` file, to pin the version of `nixpkgs` and ensure our project will always be reproducible (until the `nixpkgs` repository is around).

Generate your lockfile by running `nix flake show`, which is non destructive command that shows the outputs of a flake in the terminal (no worries, we'll talk about flake outputs later). Here we go, `flake.lock` is available in our project.

Those two files are supposed to be stored under version control, so commit them in your project before moving to the next step where we will create a development environment.

### Development environment

To run an Elixir project you need Elixir and Erlang installed on your machine. Of course if you generated a new project at the beginning of this post with `mix phx.new` it means Elixir is already available somewhere on your machine. Still, we want to improve your setup with Nix by achieving the following:

- Have Elixir and Erlang installed locally, without relying on global installation on your machine (which will be painful if you want to work on multiple projects that rely on different versions)
- Pin Elixir and Erlang to a specific version
- Activate Elixir and Erlang only when entering the project directory

Before moving further, many excellent tools are available nowadays to manage development environments dependencies using Nix, from [devenv][https://devenv.sh] to [devbox](https://www.jetpack.io/devbox) or [flox](https://flox.dev/), just to name a few. They are very easy to setup and I suggest you to look into them. In this post however we are going to configure the development environment using Nix only, it's not that hard​ in the end!

To keep our project tidy and clean, create a new folder called `nix` at the root of your project and add a new file called `dev.nix`. We'll wire up this file with the `flake.nix` file later.

If you generated an Elixir project on your machine it means

If you are new to packaging Elixir applications with Nix, we strongly suggest you to read the chapter of the [Nixpkgs manual](https://nixos.org/manual/nixpkgs/stable/#sec-beam) dedicated to BEAM languages. The manual contains valuable informations, although we have to admit it can be a bit confusing. We hope this post will clarify the confusing parts and provide you with a ready to use solution to use Nix when packaging your application.

Let's start by collecting the information we find in the manual: it says that for Elixir applications we should use `mixRelease` to make a release, while `buildMix` should be used for libraries and other dependecies. We have not discovered where those helpers are coming from yet.
It also says that the build dependencies will need to be fetched using `fetchMixDeps` and passed to it. Finally it says that for a Phoenix project (the one will package in this post) there are three steps to make a release:

- backend dependencies with `mix2nix` or a fixed-output-derivation (FOD)
- frontend dependencies using `yarn2nix` or `node2nix`
- the final derivation to put those two things together

### Managing dependencies

#### Backend dependencies

Elixir applications have build dependencies in terms of Hex packages and the default tool to operate on the dependencies is `mix`. In order to get all the benefits like reproducibility and the binary cache we want a way to package these dependencies using Nix.

To do this we have two options, either we use `mix2nix` or we use a fixed-output-derivation (FOD). What's the difference?

- `mix2nix` is a command line tool available in Nixpkgs that generates a Nix expression starting from a `mix.lock` file. Since it reads the `mix.lock` file it knows all the dependencies beforehand and it generates a Nix expression for each one separately (each dependency one build hash). This is handy because when you update one dependency others won't be affected and won't be rebuild.
- a Fixed-Output-Derivation is another method to manage Elixir dependencies using Nix. If we configure our project to leverage on a FOD, we need to provide a hash of all the dependecies of our project and write it into our Nix derivation. On subsequent builds Nix will connect to the internet to download the dependencies, generates a hash of all the dependencies and checks if this hash matches the hash we provided upfront. If a build doesn't produce the hash we expect it will fail. The downside of a FOD is that all dependencies are managed by Nix through a single hash, which means that when a dependency is updated that hash changes and a full rebuild is triggered.

In our projects we use `mix2nix`. Each time we update a dependency we make sure to run the following command to update the corresponding Nix file:

```
mix2nix > mix_deps.nix

```

Since that extra command is easy to forget, just add an alias to your shell:

```
alias mdgn='mix deps.get && mix2nix > mix_deps.nix'

```

Let's have a quick look at the `mix_deps.nix` file that is produced by `mix2nix`. It contains a list of all the Elixir dependencies of your project, each one with its own hash and a list of the recursive dependencies. For `absinthe`, a popular GraphQL library, we should get this expression:

```
absinthe = buildMix rec {
name = "absinthe";
version = "1.7.6";

src = fetchHex {
pkg = "absinthe";
version = "${version}";
sha256 = "e7626951ca5eec627da960615b51009f3a774765406ff02722b1d818f17e5778";
};

beamDeps = [dataloader decimal nimble_parsec telemetry];
};

```

(Remember that above we reported that `buildMix` was supposed to be used when building libraries, here is `mix2nix` invoking it).

Now we have a way to package backend dependencies using Nix which is reproducible (and thanks to the binary cache it will also be fast). Last step is to import the `mix_deps.nix` file and pass it as an argument to the `mixRelease` helper, as follows:

```
mixNixDeps = with pkgs; import ./mix_deps.nix { inherit lib beamPackages; };

```

That's it.

This solution will cover most of the projects, however if you are using git dependencies there is an additional step to take because `mix2nix` is not able to resolve them yet. Those dependencies must be provided manually, as explained in the manual. The steps are the following:

- Set the version in `mix.exs` like this `____` and regenerate the`mix.lock` file with `mix deps.get`.

- Run `mix2nix > mix_deps.nix`

- Remove manually the git dependencies from `mix_deps.nix` and pass them as overrides to the import function, like in the following example.

```
mixNixDeps = import ./mix.nix {
inherit beamPackages lib;
overrides = (final: prev: { # mix2nix does not support git dependencies yet, # so we need to add them manually
prometheus_ex = beamPackages.buildMix rec {
name = "prometheus_ex";
version = "3.0.5";

          # Change the argument src with the git src that you actually need
          src = fetchFromGitLab {
            domain = "git.pleroma.social";
            group = "pleroma";
            owner = "elixir-libraries";
            repo = "prometheus.ex";
            rev = "a4e9beb3c1c479d14b352fd9d6dd7b1f6d7deee5";
            hash = "sha256-U17LlN6aGUKUFnT4XyYXppRN+TvUBIBRHEUsfeIiGOw=";
          };
          # you can re-use the same beamDeps argument as generated
          beamDeps = with final; [ prometheus ];
        };
    });

};

```

#### Frontend dependencies

Most Phoenix projects require Node dependencies. There are two ways to package them using Nix: creating a Fixed-Output-Derivation or using a tool that reads either the `package-lock.json` file or the `yarn.lock` file to generate a corresponding file containing Nix expressions. The manual [explains in details](https://nixos.org/manual/nixpkgs/stable/#javascript-tool-specific) how to build your Javascript project dependencies.

For the reasons explained in the previous paragraph we avoid the creation of a FOD and use `yarn2nix` to generate the `yarn_deps.nix` file.

```
yarn2nix > yarn_deps.nix

```

If you are packaging a Phoenix project remember to run this command into the folder where you have the `yarn.lock` file (usually `assets`).

#### Build the final derivation

Now that both frontend and backend dependencies are managed through Nix, it's time to put everything together and create the final release.

We are going to create a file called `elixir.nix`

### Conclusions

You can find a demo repository with the code we used during this post so you can experiment with it.

### Caveats

```

```
