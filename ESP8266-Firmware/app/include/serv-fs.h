#include "c_types.h"

//#define CACHE_FLASH __attribute__((section(".irom0.rodata")))

struct servFile
{
	const char name[32];
	const char type[16];
	uint16_t size;
	char* content;
	struct servFile *next;
};

//ICACHE_STORE_ATTR ICACHE_RODATA_ATTR
#define ICACHE_STORE_TYPEDEF_ATTR __attribute__((aligned(4),packed))
#define ICACHE_STORE_ATTR __attribute__((aligned(4)))
#define ICACHE_RAM_ATTR __attribute__((section(".iram0.text")))

#include "../../webpage/compressed/index"
#include "../../webpage/compressed/style"
#include "../../webpage/compressed/script"
#include "../../webpage/compressed/translations"
#include "../../webpage/compressed/manifest"
#include "../../webpage/compressed/favicon"

const struct servFile faviconFile = {
	"/favicon.png",
	"image/png",
	sizeof(favicon_png),
	favicon_png,
	(struct servFile*)NULL
};

const struct servFile manifestFile = {
	"/manifest.json",
	"text/javascript",
	sizeof(manifest_min_json),
	manifest_min_json,
	(struct servFile*)&faviconFile
};

const struct servFile translationsFile = {
	"/translations.js",
	"text/javascript",
	sizeof(translations_min_js),
	translations_min_js,
	(struct servFile*)&manifestFile
};

const struct servFile scriptFile = {
	"/script.js",
	"text/javascript",
	sizeof(script_min_js),
	script_min_js,
	(struct servFile*)&translationsFile
};

const struct servFile styleFile = {
	"/style.css",
	"text/css",
	sizeof(style_min_css),
	style_min_css,
	(struct servFile*)&scriptFile
};

const struct servFile indexFile = {
	"/",
	"text/html",
	sizeof(index_html),
	index_html,
	(struct servFile*)&styleFile
};