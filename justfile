set positional-arguments

default:
    @just --list

setup ext="kde-settings":
    cd extensions/{{ext}} && npm ci --ignore-scripts

check ext="kde-settings":
    cd extensions/{{ext}} && npm run typecheck
    cd extensions/{{ext}} && npm run lint

build ext="kde-settings":
    cd extensions/{{ext}} && npm run build -- --out dist/{{ext}}

test ext="kde-settings":
    just setup {{ext}}
    just check {{ext}}
    just build {{ext}}

install ext="kde-settings":
    just build {{ext}}
    rm -rf "$HOME/.local/share/vicinae/extensions/{{ext}}"
    mkdir -p "$HOME/.local/share/vicinae/extensions"
    cp -R "extensions/{{ext}}/dist/{{ext}}" "$HOME/.local/share/vicinae/extensions/{{ext}}"

refresh:
    vicinae deeplink vicinae://launch/core/refresh-apps || systemctl --user restart vicinae

test-live ext="kde-settings":
    just test {{ext}}
    just install {{ext}}
    just refresh

dev ext="kde-settings":
    PATH="$PWD/extensions/{{ext}}/node_modules/.bin:$PATH" vici develop --src extensions/{{ext}}
