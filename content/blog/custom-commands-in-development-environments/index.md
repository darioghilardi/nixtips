---
title: Custom commands in development environments
slug: custom-commands-in-development-environments
date: 2024-05-20T12:23:12
featured_image: '/blog/custom-commands-in-development-environments/featured.jpg'
author: Dario Ghilardi
author_image: '/images/dario.jpeg'
meta_title: 'title'
meta_description: desc
short_excerpt: Adding custom commands/scripts to your development environment.
long_excerpt: Nix can help you configure a development environment by installing packages or managing programming language versions. However, it can also be used to define custom commands or scripts and make them available in your shell. This post explains how.
draft: false
tags: ['nix', 'development', 'commands', 'scripts']
---

## Introduction

Nix is a very good solution to configure a solid and shareable development environment that can easily replace `nvm`, `RVM`, `asdf`, or other tools.
Actually, Nix can do much more than that, while `nvm` and friends are specifically intended to manage programming language versions, Nix can also handle system-level packages or configurations for your project.

The possibility to fully centralize a development environment setup into a single Nix configuration is the reason I started using Nix in the first place a few years ago; today I have a `flake.nix` file in every project I work on. Being able to activate the environment just by accessing the project folder (courtesy of [nix-direnv](https://github.com/nix-community/nix-direnv)) is the best experience I could wish.

One common need in a development environment setup is the ability to define custom commands (or eventually aliases) in your shell. This is something you can also do with a `Makefile`, but if you are using Nix already it's easy to add the custom command to your Nix shell definition.

## Adding custom commands

> Before moving forward, please be aware that the solution explained in this post is just one of the possible solutions using Nix, not "the Nix solution" and neither "the right solution".

Suppose you have a simple flake that makes Hugo (an excellent static website generator) available in your development shell:

```nix
{
  description = "A flake for Hugo development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in
      with pkgs; {
        devShells.default = mkShell {
          buildInputs = [hugo];
        };

        formatter = alejandra;
      });
}
```

To work with Hugo you need a command to start the development server and a command to build the static website for production. You can alias them to something easy to remember, for example:

- To start the server in development you could use `start-dev` instead of `hugo server -p 5000`.
- To build the static site you could use `build` instead of `hugo -d public`.

Let's add those commands to your development shell.

First, define them as `let` bindings under the `scripts` key:

```nix
{
  description = "A flake for Hugo development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};

      scripts = {
        start-dev = "hugo server -p 5000";
        build = "hugo -d public";
      };
    in
      with pkgs; {
        devShells.default = mkShell {
          buildInputs = [hugo];
        };

        formatter = alejandra;
      });
}

```

You can't run those commands yet, they are defined but never used (remember Nix uses lazy evaluation) and they are for now just strings in Nix, not executable commands.

To run those commands you can wrap each of them into a function provided by `nixpkgs` called `writeShellScriptBin`. This function is part of the Nix trivial builders, a set of convenience functions provided to create a derivation easily without declaring all the fields required by `mkDerivation`.

The `writeShellScriptBin` function will create a package from a shell script of our choice, as stated in the docs:

```nix
# Writes my-file to /nix/store/<store path>/bin/my-file and makes executable.
writeShellScriptBin "my-file"
  ''
  Contents of File
  '';
```

Here is how you are going to use it:

```nix
{
  description = "A flake for Hugo development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};

      scripts = {
        start-dev = "hugo server -p 5000";
        build = "hugo -d public";
      };

      toPackage = name: script: pkgs.writeShellScriptBin name script;
    in
      with pkgs; {
        devShells.default = mkShell {
          buildInputs = [
            hugo
            (writeShellScriptBin "start-dev" scripts.start-dev)
            (writeShellScriptBin "build" scripts.build)
          ];
        };

        formatter = alejandra;
      });
}
```

You can test this flake by running `nix develop` in your shell.

Let's play a bit with Nix to simplify the code above and reduce the repetitive code.

First, you can write a small function that takes a name and a shell script and passes them to `writeShellScriptBin`:

```nix
toPackage = name: script: pkgs.writeShellScriptBin name script;
```

With this function you can iterate over the `scripts` attribute set:

```nix
pkgs.lib.mapAttrsToList toPackage scripts;
```

`mapAttrsToList` is a function from `pkgs.lib` that takes a function and an attribute set. It that function on each attribute of the attribute set, returning a list of the results.

Your final flake should then be the following:

```nix
{
  description = "A flake for Hugo development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};

      scripts = {
        start-dev = "hugo server -p 5000";
        build = "hugo -d public";
      };

      toPackage = name: script: pkgs.writeShellScriptBin name script;
    in
      with pkgs; {
        devShells.default = mkShell {
          buildInputs = [
            hugo
            (lib.mapAttrsToList toPackage scripts)
          ];
        };

        formatter = alejandra;
      });
}
```

## Conclusion

In this post, with just a few lines of code and two basic functions, you added custom commands/scripts support in your development environment without using a `Makefile` or any external tool.

While nowadays different tools are available to define a development environment using Nix and while some of them comes with support for custom commands (for example [devenv.sh](https://devenv.sh/) which uses more or less the same configuration explained in this post), in my experience getting familiar with Nix is still very important if you want to be able to customize your configuration.

If you have suggestions or want to get in touch feel free to [contact us](https://nixtips.io/contact).
