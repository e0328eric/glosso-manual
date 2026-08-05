{
  description = "Development environment for the Glosso manual";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      nubSources = {
        aarch64-darwin = {
          platform = "darwin-arm64";
          hash = "sha512-0PJPuH7D0xvXKWM9xser0YngWSMjgR2eT8bowo8z+XdHGgevvRLVkFbMV6h7FN7aKA2qnDsbz90s0AMFGkAfwg==";
        };
        aarch64-linux = {
          platform = "linux-arm64";
          hash = "sha512-VRYH6wbKzn0It22O9qYceI0EkUQgtMKj95ABpWahimS5Am6J1ACcIsHZvGY6BL/dBd0pjlzQq4Rwal9UzXChgA==";
        };
        x86_64-linux = {
          platform = "linux-x64";
          hash = "sha512-UKwtWTfwnPDj8xQyqmD9FzLXIm3uZqaXV41E6IhmKXbN6M4sHmjJRsBgMQfm7CzDZcrjiIQ9hkP79t4JNqvjgQ==";
        };
      };
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          nubSource = nubSources.${system};
        in
        rec {
          nub = pkgs.stdenv.mkDerivation {
            pname = "nub";
            version = "0.6.0";

            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@nubjs/nub-${nubSource.platform}/-/nub-${nubSource.platform}-0.6.0.tgz";
              inherit (nubSource) hash;
            };
            sourceRoot = "package";

            nativeBuildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
              pkgs.autoPatchelfHook
            ];
            buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
              pkgs.stdenv.cc.cc.lib
            ];

            dontConfigure = true;
            dontBuild = true;

            installPhase = ''
              runHook preInstall
              install -Dm755 bin/nub "$out/bin/nub"
              ln -s nub "$out/bin/nubx"
              runHook postInstall
            '';

            meta = {
              description = "All-in-one toolkit for Node.js";
              homepage = "https://nubjs.com";
              license = pkgs.lib.licenses.mit;
              mainProgram = "nub";
              platforms = systems;
            };
          };

          default = nub;
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = [ self.packages.${system}.nub ];
          };
        }
      );
    };
}
