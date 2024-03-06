{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    devenv,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      nodejs = pkgs.nodejs_20;

      website = pkgs.callPackage ./nix/build.nix {inherit nodejs;};
      devShell = pkgs.callPackage ./nix/dev.nix {inherit devenv inputs nodejs;};
    in {
      packages = {
        inherit (pkgs) qrencode;

        default = website;
        # For now to fix https://github.com/cachix/devenv/issues/756
        devenv-up = self.devShells.${system}.default.config.procfileScript;
      };

      devShells.default = devShell;

      formatter = pkgs.alejandra;
    });
}
