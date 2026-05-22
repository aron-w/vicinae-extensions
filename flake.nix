{
  description = "Custom Vicinae extensions";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;

      extensionNames = [
        "kde-settings"
      ];

      mkVicinaeExtension =
        pkgs: name:
        let
          src = pkgs.lib.cleanSourceWith {
            src = ./extensions + "/${name}";
            filter =
              path: type:
              let
                base = baseNameOf path;
              in
              !(
                type == "directory"
                && builtins.elem base [
                  "node_modules"
                  "dist"
                ]
              );
          };
        in
        pkgs.buildNpmPackage {
          inherit name src;

          inherit (pkgs.importNpmLock) npmConfigHook;
          npmDeps = pkgs.importNpmLock { npmRoot = src; };

          installPhase = ''
            runHook preInstall

            mkdir -p "$out"
            cp -r /build/.local/share/vicinae/extensions/${name}/* "$out/"

            runHook postInstall
          '';
        };
    in
    {
      lib = {
        inherit extensionNames mkVicinaeExtension;
      };

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              alejandra
              git
              just
              nil
              nixd
              nixfmt
              nodejs_24
              typescript
              vicinae
            ];
          };
        }
      );

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);

      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        builtins.listToAttrs (
          map (name: {
            inherit name;
            value = mkVicinaeExtension pkgs name;
          }) extensionNames
        )
        // {
          default = self.packages.${system}.kde-settings;
        }
      );

      checks = forAllSystems (
        system:
        builtins.listToAttrs (
          map (name: {
            inherit name;
            value = self.packages.${system}.${name};
          }) extensionNames
        )
      );
    };
}
