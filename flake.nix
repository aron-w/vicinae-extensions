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
    in
    {
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
          kdeSettingsSrc = pkgs.lib.cleanSourceWith {
            src = ./extensions/kde-settings;
            filter =
              path: type:
              let
                name = baseNameOf path;
              in
              !(
                type == "directory"
                && builtins.elem name [
                  "node_modules"
                  "dist"
                ]
              );
          };
        in
        {
          kde-settings = pkgs.buildNpmPackage {
            name = "kde-settings";
            src = kdeSettingsSrc;

            inherit (pkgs.importNpmLock) npmConfigHook;
            npmDeps = pkgs.importNpmLock { npmRoot = kdeSettingsSrc; };

            installPhase = ''
              runHook preInstall

              mkdir -p "$out"
              cp -r /build/.local/share/vicinae/extensions/kde-settings/* "$out/"

              runHook postInstall
            '';
          };

          default = self.packages.${system}.kde-settings;
        }
      );

      checks = forAllSystems (system: {
        kde-settings = self.packages.${system}.kde-settings;
      });
    };
}
