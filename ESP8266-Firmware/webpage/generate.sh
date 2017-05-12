#!/bin/bash
#INDEX.HTML
    mv index.html index.htm
    python3 ./css-html-js-minify.py index.htm
    xxd -i index.html > index
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' index
    cp index.html compressed/index.min.html
    mv index.htm index.html
    mv index compressed/index


#STYLE.CSS
    yui-compressor -o style.min.css style.css
    xxd -i style.min.css > style
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' style
    mv style.min.css compressed/style.min.css
    mv style compressed/style


#SCRIPT.JS
    yui-compressor -o script.min.js script.js
    xxd -i script.min.js > script
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' script
    mv script.min.js compressed/script.min.js
    mv script compressed/script

#TRANSLATIONS.JS
    yui-compressor -o translations.min.js translations.js
    xxd -i translations.min.js > translations
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' translations
    mv translations.min.js compressed/translations.min.js
    mv translations compressed/translations


#MANIFEST.JSON
    mv manifest.json manifest.css
    yui-compressor -o manifest.min.json manifest.css
    xxd -i manifest.min.json > manifest
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' manifest
    mv manifest.css manifest.json
    mv manifest.min.json compressed/manifest.min.json
    mv manifest compressed/manifest


#FAVICON.PNG
    xxd -i favicon.png > favicon
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' favicon
    mv favicon compressed/favicon