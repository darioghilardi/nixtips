---
title: Why nix
slug: why-nix
date: 2024-01-12T12:23:12
featured_image: ''
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

Nix is a purely functional package manager (and a language) that has the main scope of building and distributing packages in a reproducible way.

At NablaFlow we love the ideas behind Nix and the many advantages it brings to our [development](link) workflow:

```bash
sudo bash -e
```


- Two people building the same package will always get the same output. This is not always true when using dockerfiles, in fact it's easy to build two different images from the same dockerfile if the build happens at different times.
- Multiple versions of the same package can be installed without stepping into each other. While this problem can be solved with tools like asdf, Nix is fast and it works for any language.
- Effective binary caching: Nix knows before building a package if that package has been already been built, in those cases it can pull the package from the cache and save build time.

In this post we will dive into how we package and containerize an Elixir application using Nix. Let's get started.
