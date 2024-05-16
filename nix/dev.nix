{
  pkgs,
  yarn,
  nodejs,
}: let
  deps = with pkgs;
    [
      nodejs
      hugo
      yarn2nix
      process-compose
      yarn
    ]
    ++ lib.optionals stdenv.isLinux linux-deps
    ++ lib.optionals stdenv.isDarwin darwin-deps;

  linux-deps = with pkgs; [inotify-tools];
  darwin-deps = with pkgs; [
    terminal-notifier
    darwin.apple_sdk.frameworks.CoreFoundation
    darwin.apple_sdk.frameworks.CoreServices
  ];

  src = ../.;

  yarnDeps = pkgs.mkYarnModules {
    pname = "deps";
    version = "master";

    inherit nodejs;

    packageJSON = ../package.json;
    yarnLock = ../yarn.lock;
    yarnNix = ./yarn-deps.nix;
  };

  scripts = {
    prebuild = ''
      rm -rf .parcel-cache
      ./node_modules/.bin/parcel build
    '';
    hugo-server = "hugo server --disableFastRender -p 5050 --buildDrafts";
    parcel-watch = "./node_modules/.bin/parcel watch --no-hmr";
    start-dev = "process-compose -t=0";

    check-prettier = "./node_modules/.bin/prettier --check .";
    fix-prettier = "./node_modules/.bin/prettier --write .";
    check-alejandra = "${pkgs.alejandra}/bin/alejandra --check ${src}";
    check-statix = "${pkgs.statix}/bin/statix check ${src}";
  };

  toPackage = name: script: pkgs.writeShellScriptBin name script;
  mkCheck = name: script:
    pkgs.runCommand name {} ''
      ${script}
      touch $out
    '';

  mkNodeCheck = name: script:
    pkgs.runCommand name {} ''
      cp -rT ${src} ./
      ln -sfn ${yarnDeps}/node_modules ./node_modules
      ${script}
      touch $out
    '';
in {
  checks = {
    prettier = mkNodeCheck "prettier" scripts.check-prettier;
    statix = mkCheck "statix" scripts.check-statix;
    alejandra = mkCheck "statix" scripts.check-alejandra;
  };

  shell = pkgs.mkShell {
    nativeBuildInputs = deps;
    buildInputs = pkgs.lib.mapAttrsToList toPackage scripts;

    shellHook = ''
      export LANG=en_US.UTF-8
      ln -sfn ${yarnDeps}/node_modules ./node_modules
    '';
  };
}
