min:
	make all params="-media thecart -method=pdm"

all:
	make -C a8 build/players.json params="$(params)"
	make players.js

players.js: a8/build/players.json
	(echo -n "players = "; cat $<) > $@

show: players.js
	chrome index.html

server:
	python -m http.server

files = index.html index.js jszip.min.js players.js \
	progress.js readwav.js resample.js waveWorker.js
bundle:
	mkdir -p bundle
	cp $(files) bundle

.PHONY: bundle
