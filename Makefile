all:
	make -C a8 build/players.json
	make players.js

players.js: a8/build/players.json
	(echo -n "players = "; cat $<) > $@

show: players.js
	chrome index.html
