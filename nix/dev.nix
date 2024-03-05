{
  pkgs,
  nodejs,
  devenv,
  inputs,
}: let
  deps = with pkgs;
    [
      hugo
      (yarn.override {inherit nodejs;})
      yarn2nix
      qrencode
    ]
    ++ lib.optionals stdenv.isLinux linux-deps
    ++ lib.optionals stdenv.isDarwin darwin-deps;

  linux-deps = with pkgs; [inotify-tools];
  darwin-deps = with pkgs; [
    terminal-notifier
    darwin.apple_sdk.frameworks.CoreFoundation
    darwin.apple_sdk.frameworks.CoreServices
  ];

  node-modules = pkgs.mkYarnModules {
    pname = "deps";
    version = "master";

    inherit nodejs;

    packageJSON = ../package.json;
    yarnLock = ../yarn.lock;
    yarnNix = ./yarn-deps.nix;
  };

  cmds = {
    prebuild = ''
      rm -rf .parcel-cache
      yarn parcel build
    '';
    hugo = "hugo server --disableFastRender -p 5050";
    parcel = "yarn parcel watch --no-hmr";
    prettier = "${node-modules}/node_modules/prettier/bin/prettier.cjs --write .";
    alejandra = "${pkgs.alejandra}/bin/alejandra --check .";
  };
in
  devenv.lib.mkShell {
    inherit inputs pkgs;

    modules = [
      ({pkgs, ...}: {
        packages = deps;

        languages = {
          javascript.enable = true;
          javascript.package = nodejs;
          nix.enable = true;
        };

        env.LANG = "en_US.UTF-8";
        enterShell = "node --version";

        scripts = {
          prebuild.exec = cmds.prebuild;
          hugo-server.exec = cmds.hugo;
          parcel-server.exec = cmds.parcel;
          prettier.exec = cmds.prettier;
          alejandra.exec = cmds.alejandra;
        };

        process = {
          implementation = "process-compose";
          process-compose = {
            port = 9999;
            tui = "false";
            version = "0.5";
          };
        };
        process-managers.process-compose.enable = true;
        processes = {
          # Clean up existing data (cms downloads and parcel cache), rebuild the
          # static assets and fetch cms data.
          prebuild.exec = cmds.prebuild;

          # Wait for the previous commands to finish then run hugo
          # and parcel in watch mode.
          parcel-watch = {
            exec = cmds.parcel;
            process-compose.depends_on = {
              prebuild.condition = "process_completed_successfully";
            };
          };
          hugo = {
            exec = cmds.hugo;
            process-compose.depends_on = {
              prebuild.condition = "process_completed_successfully";
            };
          };
        };

        pre-commit = {
          hooks = {
            statix.enable = true;
          };
        };
      })
    ];
  }
