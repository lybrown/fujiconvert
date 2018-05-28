players.js: a8/build/players.json
	(echo -n "players = "; cat $<) > $@

all: players.js
	chrome index.html
