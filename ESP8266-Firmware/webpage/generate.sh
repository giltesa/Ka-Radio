#!/bin/bash
yui-compressor   -o style.min.css style.css 
mv style.css style.ori
mv style.min.css style.css
xxd -i style.css > style
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' style
mv style.ori style.css

yui-compressor   -o style1.min.css style1.css 
mv style1.css style1.ori
mv style1.min.css style1.css
xxd -i style1.css > style1
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' style1
mv style1.ori style1.css

# old compressor
#python3 ./css-html-js-minify.py --checkupdates style.css
#mv style.css style.ori
#mv style.min.css style.css
#xxd -i style.css > style
#sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' style
#mv style.ori style.css


yui-compressor   -o script.min.js script.js 
mv script.js script.ori
mv script.min.js script.js
xxd -i script.js > script
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' script
mv script.ori script.js


# old compressor
#python3 ./css-html-js-minify.py script.js
#mv script.js script.ori
#mv script.min.js script.js
#xxd -i script.js > script
#sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' script
#mv script.ori script.js

mv index.html index.htm
python3 ./css-html-js-minify.py index.htm
xxd -i index.html > index
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' index
#rm index.html
#mv index.html index.min.html
mv index.htm index.html

xxd -i logo.png > logo
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' logo

xxd -i favicon.png > favicon
sed -i 's/\[\]/\[\] ICACHE_STORE_ATTR ICACHE_RODATA_ATTR /g' favicon
