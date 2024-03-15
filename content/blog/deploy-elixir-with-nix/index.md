---
title: Deploy Phoenix projects with Nix
slug: deploy-phoenix-projects-with-nix
date: 2024-01-12T12:23:12
featured_image: '/blog/deploy-phoenix-projects-with-nix/featured.jpg'
author: Dario Ghilardi
author_image: '/images/dario.jpeg'
meta_title: 'title'
meta_description: desc
short_excerpt: short
long_excerpt: long
tags: ['nix', 'elixir', 'phoenix']
---

### Introduction

Nix is a purely functional package manager (and a language) that has the main scope of building and distributing packages in a reproducible way.

At NablaFlow we love the ideas behind Nix and the many advantages it brings to our development workflow:

- Two people building the same package will always get the same output. This is not always true when using dockerfiles, in fact it's easy to build two different images from the same dockerfile if the build happens at different times.
- Multiple versions of the same package can be installed without stepping into each other. While this problem can be solved with tools like asdf, Nix is fast and it works for any language.
- Effective binary caching: Nix knows before building a package if that package has been already been built, in those cases it can pull the package from the cache and save build time.

In this post we will dive into how we package and containerize an Elixir application using Nix. Let's get started.

### Get started

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
      overrides = (final: prev: {
        # mix2nix does not support git dependencies yet,
        # so we need to add them manually
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
