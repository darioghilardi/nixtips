---
title: Elixir development environments with Nix
slug: elixir-development-environment-with-nix
date: 2024-05-16T12:23:12
featured_image: '/blog/deploy-phoenix-projects-with-nix/featured.jpg'
author: Dario Ghilardi
author_image: '/images/dario.jpeg'
meta_title: 'title'
meta_description: desc
short_excerpt: short
long_excerpt: long
draft: true
tags: ['nix', 'elixir', 'phoenix']
---

### Introduction

In this post we're going to dive into the setup of a development environment for an Elixir project using Nix. In particular we are setting up the development environment for a new Phoenix app, generated with `mix phx.new`.

Nix is excellent at managing your development environment for several reasons:

- you can have multiple versions of any package installed without any conflict (a different Elixir version for each project for example).
- there is literally no setup involved when someone else starts working on your project, they get the exact same dependencies you have.
- combined with [nix-direnv][1] it allows you to `cd` into the project folder to activate all dependencies for your project.

Several tools are available nowadays to manage development environments using Nix [devenv][2], [devbox][3], [flox][4], just to name a few) but instead of using them we will only rely on a few lines of Nix code. There are three reasons why we are doing this:

- while these tools can keep you at distance from the Nix programming language which is known to be a unfriendly for newcomers, in some cases they are more limited when you want move past the development environment and use Nix to release your application.
- the amount of Nix code that we are going to write is quite small and definitely manageable.
- this post replicates the setup we are using daily in our work, but it also has the scope of providing a learning opportunity for the reader that can't be provided if you use one of the tools above.

The only requirement to follow this post is Nix installed on your machine with the support for Nix Flakes enabled. We recommend you to use the fabulous [nix-installer][5] from DeterminateSystems which comes with Flakes enabled out of the box.

Before we start, a few last notes:

- we going to use Nix to manage the versions of Elixir and Erlang for our project.
- we won't use Nix to manage the Elixir dependencies but we'll use Elixir's `mix`. We recommend using Nix to manage all your dependencies when you release your application but for the local environment it would require a slightly different workflow and a bit of overhead. We'll explain that in a future post.
- we won't dig into the database setup but I'll promise we'll do it in another post very soon. If you want to explore it yourself we recommend you to look into [process-compose][6].

Let's start!

### Get started

We could start this post by saying "let's create a new Phoenix project using `mix phx.new`"...well that can't work, we don't have `mix` available on our machine yet! :-).

Let's first create a new directory for our project and enter that directory:

```bash
mkdir demo_app && cd demo_app
```

The first thing we want is to make this project a Flake: a Flake is nothing more than a directory that contains a `flake.nix` and a `flake.lock` files at its root. Nix provides a command to generate the `flake.nix` file, just run:

```bash
nix flake init
```

Open the generated file and note that it has a familiar structure:

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }: {

    packages.x86_64-linux.hello = nixpkgs.legacyPackages.x86_64-linux.hello;

    packages.x86_64-linux.default = self.packages.x86_64-linux.hello;

  };
}
```

Even if you don't know anything about the Nix language you'll note the similarity with a regular JSON file. This file contains a Nix data structure called attribute set, which is a collection of name-value pairs.

There are three top-level identifiers, `description`, `inputs` and `outputs` and they are common for all Flakes. `description` can be set to an arbitrary string, while the value of `outputs` is a Nix function whose arguments are before the `:` symbol and the body is after. This function returns another attribute set. We'll talk about outputs later on.

But what is the Flake input we have in our Flake? Inputs are Nix dependencies required to "build" your flake, they can be Git repositories, urls or even something on your filesystem. You can see here that we have been provided with an input called `nixpkgs`, which is a Git repository where most of the software packaged with Nix is stored. Turns out it's also the source of the dependencies we need for our project, for example Elixir and Erlang.

`nixpkgs` is continuously updated with new versions of each package and it is not under our control. This raises a question, what happens if the Elixir version in `nixpkgs` changes? Luckily for us we don't need to worry, because each Flake has a `flake.lock` file that contains the revision of `nixpkgs` we are tied to. This way an update on `nixpkgs` won't affect our project and reproducibility is not at risk.

Currently we don't have a `flake.lock` file but it will be generated as soon as we run any command against the Flake with the Nix CLI. Let's do it now using the `flake show` command, which shows the outputs provided by a Flake:

```bash
nix flake show
```

After a few seconds your `flake.lock` file should be available.

Both `flake.nix` and `flake.lock` are supposed to be stored under version control.

### Development environment

To generate our project with `mix phx.new` we need Elixir and Erlang installed on our machine. By using Nix we also want to achieve the following:

- Elixir and Erlang to be installed locally, without relying on a global installation. This way we don't have to worry if another project requires a different version of Elixir or Erlang.
- Pin Elixir and Erlang to a specific version.
- Activate Elixir and Erlang only when entering the project directory.

A few paragraphs before we saw that our Flake contains an `outputs` identifier, which is a function that returns another attribute set. The contents of the returned attribute sets are not arbitrary, Nix knows the identifiers and each of them has a different purpose. Here is the [schema][7] of all options available.

To setup the development environment we are going to use the `devShells` identifier available within the `outputs` schema .

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    pkgs = import nixpkgs {system = "aarch64-darwin";};
  in {
    devShells.aarch64-darwin.default = pkgs.mkShell {
    	packages = [
    		pkgs.beamPackages.elixir
    		pkgs.beamPackages.erlang
    		pkgs.beamPackages.hex
    	];
    };
  };
}
```

A few things are going on here so let's spend some time trying to explain them.

Packages on nixpkgs are scoped by architecture, I am using an M1 MacOS so my packages are under the `aarch64-darwin` identifier (if you use Linux your packages are under `x86_64-linux` or `aarch64-linux`). The `let` assignment defined above works more or less as a filter applied on nixpkgs that returns the packages for my architecture.

To create a development shell we defined the `devShells` attribute in our flake outputs and set its value to a function called `mkShell` defined in the `pkgs` attribute. This function accepts an attribute called `packages`, which value is the list of packages we want available in our development shell.

(Note how `devShells` is also scoped by the architecture. By using `default` as shell name we don't need to specify anything when we activate the shell.)

Perfect, now run `nix develop` to enter your development shell. You can quickly verify that Elixir and Erlang are installed by running `elixir -v`.

```bash
$ elixir -v
Erlang/OTP 25 [erts-13.2.2.7] [source] [64-bit] [smp:10:10] [ds:10:10:10] [async-threads:1]

Elixir 1.15.7 (compiled with Erlang/OTP 25)
```

To leave your development shell just run `exit`.

With just 17 lines of Nix we were able to get an isolated development environment with the dependencies required to run our project. Also, the development dependencies are available only when we start the development shell (`elixir -v` without running `nix develop` first returns an error) and are constrained to our project.

At this point you might have a few questions about our setup.

First, how did you come up with `pkgs.beamPackages.elixir`? In general, where can you find the name of a package?
Well, usually you can rely on the [nixpkgs search][8] to find the name of a package, however in this specific case if you search for `elixir` you'll find only the packages defined at the "top-level", right on `pkgs` (`pkgs.elixir_1_16` for example), not the ones under `beamPackages`.
[The documentation mentions][9] that the packages defined at top-level do not provide BEAM builders, which are needed if you want to create a package set on top of a specific version of Erlang. Since later on we are going to select a specific version of Elixir and a specific version of Erlang to be used in our project, we won't be able to do that with the top-level packages because we need Elixir to be compiled on top of the selected version of Erlang.

Second, we installed an `elixir` package without specifying any version, and automatically we got Elixir 1.15.7. Why?
Because `1.15.7` is the version of `elixir` on `nixpkgs` at the revision defined in your `flake.lock` file. `nixpkgs` is just a regular Git repository, there's nothing special about that. If you want a specific minor version of Elixir you can use `pkgs.beamPackages.elixir_1_16`.

Also remember that if you want to update the revision the inputs defined in your flake you can run the following command

```bash
nix flake update
```

### Support for multiple architectures

It's quite annoying that we had to scope almost every attribute in our Flake by our system architecture, not only it is repetitive, it also makes our Flake dependent on the system where it is used.

We can solve this problem with a library developed by the community called [flake-utils][10] .

Note that while widely used, this library was recently discussed within the Nix community and even discouraged in some cases. We'll take a pragmatic approach for this post and just use the library as it solves our problem.

First, we need to add `flake-utils` to our flake inputs and change the `outputs` of our flake as follows.

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in {
      devShells.default = pkgs.mkShell {
      	packages = [
      		pkgs.beamPackages.elixir
      		pkgs.beamPackages.erlang
      		pkgs.beamPackages.hex
      	];
      };
    });
}
```

`flake-utils` exposes the function `eachDefaultSystem` which maps over a set of systems (`["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"]`) to return the same output declaration.

Now run `nix develop`, it will update your `flake.lock` file with a lock on the `flake-utils` library, then it will enter the development shell like before. Now you are free to share your Flake to other users without worrying about the system they use.

### Creating our Elixir project

Since we have Elixir and Erlang installed in our development shell it's a good time to create our Phoenix project.

Enter the development shell running `nix develop`, then run:

```bash
mix phx.new . --app demo_app
```

Now you can start the Phoenix server with `mix phx.server`, in time to be greeted with an error (if you are on MacOS):

```text
[error] Could not compile file system watcher for Mac, try to run "clang -framework CoreFoundation ..."
```

Because our development environment is completely isolated (Nix feature), the Phoenix file watcher on MacOS can’t access to some of the libraries needed for it to work properly. With all `nixpkgs` in our hand we can quickly install them though:

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in {
      devShells.default = pkgs.mkShell {
        packages =
          [
            pkgs.beamPackages.elixir
            pkgs.beamPackages.erlang
            pkgs.beamPackages.hex
          ]
          ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
            pkgs.inotify-tools
          ]
          ++ pkgs.lib.optionals pkgs.stdenv.isDarwin [
            pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            pkgs.darwin.apple_sdk.frameworks.CoreServices
          ];
      };
    });
}
```

Note that we made the installation of those packages for MacOS conditional by relying on `stdenv.isDarwin` and `stdenv.isLinux`, two functions defined on our `pkgs` instance. To support Linux we added the `inotify-tools` package instead of the Apple SDK CoreFoundation and CoreServices frameworks, but you get the idea.

Now leave the development shell and run `nix develop` again, then start the Phoenix server with `mix phx.server` to enjoy your new, isolated and self contained development environment!

### Reorganise our codebase

Although we wrote only 33 lines of Nix code there is already a chance to improve our codebase if we want to keep it clean.

The first refactor consists into moving all the development environment configurations to another file. In order to do that we'll rely on the `callPackage` function from `nixpkgs`. `callPackage` takes care of passing the attributes that exists in the `pkgs` attribute set to the function defined in another Nix file.

Create a `nix` folder on the root of your project, then create a file called `dev.nix` inside that folder, we’re going to move most of the existing code to this new file, as follows:

```
{
  beamPackages,
  inotify-tools,
  lib,
  stdenv,
  darwin,
  mkShell,
}:
mkShell {
  packages =
    [
      beamPackages.elixir
      beamPackages.erlang
      beamPackages.hex
    ]
    ++ lib.optionals stdenv.isLinux [
      inotify-tools
    ]
    ++ lib.optionals stdenv.isDarwin [
      darwin.apple_sdk.frameworks.CoreFoundation
      darwin.apple_sdk.frameworks.CoreServices
    ];
}

```

The `dev.nix` file now contains a function that takes as inputs some attributes defined into `pkgs` and returns the `mkShell` invocation output, which is our development shell.

This is also called a Nix _derivation_, which is something we can define like a description of how to obtain a desired build result (not my words, I couldn’t find a better way to define it).

This is a function that takes `mkShell` and `elixir` as inputs and returns the `mkShell` invocation output. It's also a nix _derivation_, in nix terms a description of how to obtain a desired build result, in this case is the shell.

Now in our flake.nix we use the new file through `callPackage` as follows:

```
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};

      devShell = pkgs.callPackage ./nix/dev.nix {};
    in {
      devShells.default = devShell;

      formatter = pkgs.alejandra;
    });
}
```

> Remember to add the dev.nix file under source control or you'll get an error when running `nix develop`.

### Configuring dev.nix

Right now the only packages we have into our shell are `elixir` and `erlang`. For regular projects we want to install more packages, let's add `rebar3` for example:

```
packages = [
  beamPackages.elixir
  beamPackages.erlang
  beamPackages.rebar3
]
```

Now just run `nix develop` to download rebar3 and make it available in your shell.

A setting that is nice to have when working on Elixir project consists into enabling the history when using `iex`. To do that we need to configure a few flags in an environment variable. `mkShell` provides a handy attribute called `shellHook` which is intended to run commands when entering the development shell and it's exactly what we need:

```
shellHook = ''
  export LANG=en_US.UTF-8
  export ERL_AFLAGS="-kernel shell_history enabled"
'';
```

Here is the final `dev.nix` after this step:

```
{
  mkShell,
  beamPackages
}:
mkShell {
  packages = [
    beamPackages.elixir
    beamPackages.erlang
    beamPackages.rebar3
  ];

  shellHook = ''
    export LANG=en_US.UTF-8
    export ERL_AFLAGS="-kernel shell_history enabled"
  '';
}
```

### Using a specific version of Elixir and Erlang

However, while the revision lock prevents us to move to a new version of a package accidentally, it also provides a "global" lock over all packages in our flake, making it really hard to upgrade only some dependencies and not all of them at the same time.

Let me explain it clearly, we have `nixpkgs` between our flake inputs and its revision locked in `flake.lock`, meaning that we can only access the packages as they are at that revision. Then we used `nixpkgs` to retrieve both Elixir and Erlang. Now if we want to upgrade both Elixir and Erlang we can change the revision of `nixpkgs` in our lockfile, but if we want to upgrade only Elixir or only Erlang we are stuck.
We'll see in the paragraph below

limiting because now the revision of `nixpkgs` prevents us to upgrade both Elixir and other packages at the same time. However there are different strategies to deal with that.

is regularly updated shortly after a new Elixir version is released. If you want to stick to a specific version you need to use `elixir_1_16` for example, which locks for you major and minor versions (but doesn't lock the patch).

If you get `elixir` from nixpkgs today it might not be the same `elixir` you get some day in the future, the name of the package is the same but the version might be different. However, being nixpkgs a regular git repository, whenever a change is made on nixpkgs a new commit is added and a new revision is created. The `flake.lock` file in our project locks us to a specific revision of `nixpkgs`, so no matter what happens on nixpkgs we will continue to use the same version of the packages defined in nixpkgs.

In our setup so far we have not installed a specific version of Elixir or Erlang, we just used the one provided by nixpkgs under `beamPackages`. This is fine to ensure reproducibility because the nixpkgs revision is set in `flake.lock` and it can't change unless we run `nix flake update`.
But what if we want to use a specific combination of Elixir and Erlang? We can do that by relying on a Nix feature called overlays.

We use nixpkgs as flake input and source of our packages, an overlay can modify the local nixpkgs to ensure we use the package versions we specify.

Let's first create a file called `elixir_overlay.nix` in the `nix` folder (remember to place that file under source control or it won't be seen when running commands with nix). Then add the following contents:

```
final: prev: let
  erlang = prev.beam_minimal.interpreters.erlang_26.override {
    version = "26.1";
    sha256 = "sha256-GECxenOxwZ0A7cY5Z/amthNezGVPsmZWB5gHayy78cI=";
  };

  beamPackages = prev.beam_minimal.packagesWith erlang;

  elixir = beamPackages.elixir.override {
    version = "1.16.0";
    sha256 = "sha256-nM3TpX18zdjDAFkljsAqwKx/1AQmwDMIQCeL75etTQc=";
  };
in {
  beamPackages = beamPackages.extend (final: prev: {
    inherit elixir;
  });
}
```

This is not much code but it's quite dense. We define an overlay using the classic function signature, it takes two arguments:

- `final` is nixpkgs with the overlay applied
- `prev` is nixpkgs without the overlay applied

Then we override the version of Erlang setting an old one (`26.1`) and the `sha` for that version. The hash changes for each version but if you set the value to `pkgs.lib.fakeSha256` Nix will fail on the following execution of `nix develop` showing the new hash.

Then according to the documentation we need to create a package builder using our custom Erlang version with `packagesWith`. The assigned `beamPackages` attribute is not the standard one from nixpkgs anymore but it uses the custom Erlang version we defined.

Finally we can override the Elixir version from the newly obtained `beamPackages` and use it in the call of `extend`, which is defined on `beamPackages`.

Ok, this was not easy but if you know the pieces you can understand what is going on here.

We only miss one last step to use the overlay. Luckily for us it's very simple, it just needs to be imported in flake.nix:

```
  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;

        overlays = [
          (import ./nix/elixir_overlay.nix)
        ];
      };

      ...
```

[1]: https://github.com/nix-community/nix-direnv
[2]: https://devenv.sh
[3]: https://www.jetpack.io/devbox
[4]: https://flox.dev/
[5]: https://github.com/DeterminateSystems/nix-installer
[6]: https://github.com/F1bonacc1/process-compose
[7]: https://nixos.wiki/wiki/Flakes#Output_schema
[8]: https://search.nixos.org/packages
[9]: https://nixos.org/manual/nixpkgs/stable/#how-to-install-beam-packages
[10]: https://github.com/numtide/flake-utils
