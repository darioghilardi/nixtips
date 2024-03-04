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
    generate-qr = "${pkgs.qrencode}/bin/qrencode -t png $1 -o $2";
    parcel-build = "yarn parcel build";
    parcel-watch = "yarn parcel watch --no-hmr";
    fetch-cms-data = "cd prebuild && hugo";
    clean-data = "rm -rf prebuild/public && rm -rf .parcel-cache";
    hugo = "hugo server --disableFastRender -p 5050";
  };

  alejandra-check = {
    enable = true;
    name = "alejandra-check";
    entry = pkgs.lib.mkForce "${pkgs.alejandra}/bin/alejandra --check .";
  };

  prettier-check = {
    enable = true;
    name = "prettier-check";
    entry = pkgs.lib.mkForce "${node-modules}/node_modules/prettier/bin/prettier.cjs --check .";
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
          generate-qr.exec = cmds.generate-qr;
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
          # Clean up existing data (cms downloads and parcel cache).
          clean-data.exec = cmds.clean-data;

          # Run in parallel the commands to retrieve the cms data
          # and the command to build static assets when cleanup is done.
          fetch-cms-data = {
            exec = cmds.fetch-cms-data;
            process-compose.depends_on.clean-data.condition = "process_completed_successfully";
          };
          parcel-build = {
            exec = cmds.parcel-build;
            process-compose.depends_on.clean-data.condition = "process_completed_successfully";
          };

          # Wait for the previous commands to finish then run hugo
          # and parcel in watch mode.
          parcel-watch = {
            exec = cmds.parcel-watch;
            process-compose.depends_on = {
              parcel-build.condition = "process_completed_successfully";
              fetch-cms-data.condition = "process_completed_successfully";
            };
          };
          hugo = {
            exec = cmds.hugo;
            process-compose.depends_on = {
              parcel-build.condition = "process_completed_successfully";
              fetch-cms-data.condition = "process_completed_successfully";
            };
          };
        };

        pre-commit = {
          hooks = {
            statix.enable = true;

            # Alejandra can be enabled with
            # alejandra.enable = true;
            # However this writes files when it runs. Until the
            # following PR is merged a custom hook calling alexandra
            # check is used instead.
            # https://github.com/cachix/pre-commit-hooks.nix/pull/353
            inherit alejandra-check;

            # Prettier can be enabled with
            # prettier.enable = true;
            # However this writes files when it runs. Also, prettier
            # plugins are not in nixpkgs. A custom hook that uses
            # prettier from node_modules is used instead.
            inherit prettier-check;
          };
        };
      })
    ];
  }
