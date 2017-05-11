#!/bin/bash
#INDEX.HTML
    mv index.html index.htm
    python3 ./css-html-js-minify.py index.htm
    xxd -i index.html > compressed/index
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/index
    mv index.htm index.html


#STYLE.CSS
    yui-compressor -o compressed/style.min.css style.css
    xxd -i compressed/style.min.css > compressed/style
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/style


#SCRIPT.JS
    yui-compressor -o compressed/script.min.js script.js
    xxd -i compressed/script.min.js > compressed/script
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/script

#JQUERY.TRANSLATE.JS
    yui-compressor -o compressed/jquery.translate.min.js jquery.translate.js
    xxd -i compressed/jquery.translate.min.js > compressed/translate
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/translate

#TRANSLATIONS.JS
    yui-compressor -o compressed/translations.min.js translations.js
    xxd -i compressed/jquery.translate.min.js > compressed/translations
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/translations


#MANIFEST.JSON
    mv manifest.json manifest.css
    yui-compressor -o compressed/manifest.min.json manifest.css
    xxd -i compressed/manifest.min.json > compressed/manifest
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/manifest
    mv manifest.css manifest.json


#FAVICON.PNG
    xxd -i favicon.png > compressed/favicon
    sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' compressed/favicon


#REMOVE MINIFIED FILES
	cd compressed
	rm *.css *.js *.json