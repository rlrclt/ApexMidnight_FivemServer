fx_version "cerulean"
game "gta5"

author "Tuning Speedometer"
description "Modern Speedometer & RPM Gauge for Vehicle Tuning"
version "1.0.0"

ui_page "html/index.html"

shared_scripts {
    '@ox_lib/init.lua',
}

client_script "client.lua"

dependencies {
    'ox_lib',
}

files {
    "html/index.html",
    "html/style.css",
    "html/script.js",
    "html/fonts.css",
    "html/fonts/*.woff2"
}
