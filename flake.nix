{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix-filter.url = "github:numtide/nix-filter";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    nix-filter,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;

        overlays = [
          (import ./nix/overlay.nix)
        ];
      };

      website = pkgs.callPackage ./nix/build.nix {};

      devShell = pkgs.callPackage ./nix/dev.nix {};
    in {
      inherit (devShell) checks;
      # checks = devShell.checks;

      packages = {
        inherit (pkgs) qrencode;
        default = website;
      };

      devShells.default = devShell.shell;
      formatter = pkgs.alejandra;
    });
}
