min:
	make all params="-media thecart -method=pcm4+4"

all:
	make -C a8 build/players.json params="$(params)"
	make players.js

players.js: a8/build/players.json
	(echo -n "players = "; cat $<) > $@

show: players.js
	chrome index.html

server:
	python -m SimpleHTTPServer
