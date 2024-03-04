{
  pkgs,
  nodejs,
}: let
  node-modules = pkgs.mkYarnModules {
    pname = "deps";
    version = "master";

    inherit nodejs;

    packageJSON = ../package.json;
    yarnLock = ../yarn.lock;
    yarnNix = ./yarn-deps.nix;
  };

  website = pkgs.stdenv.mkDerivation {
    name = "website";
    src = ../.;

    env = {
      BUILD_FOR_PROD = true;
    };

    nativeBuildInputs = [
      nodejs
      pkgs.hugo
      (pkgs.yarn.override {inherit nodejs;})
    ];

    configurePhase = ''
      ln -sf ${node-modules}/node_modules node_modules
    '';

    buildPhase = ''
      export HOME=$TMPDIR
      hugo -s prebuild/
      yarn parcel build
      hugo
    '';

    installPhase = ''
      mkdir $out
      mv public $out/build
    '';
  };
in
  website
