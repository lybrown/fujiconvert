build/players.json: player.asm.pl enumerate obx2json splash.asm ramdetect.asm hardware.asm
	mkdir -p build
	cp -f hardware.asm build
	cp -f splash.asm build
	cp -f ramdetect.asm build
	./enumerate $(params)
	./obx2json build/player-*.obx $(out)

det.run:
det.obx: ramdetect.asm
simple.run:

out = > $@~ && mv $@~ $@

atari = altirra

%.run: %.xex
	$(atari) $<

%.xex: %.obx
	cp $< $@

%.obx: %.asm
	xasm /t:$*.lab /l:$*.lst $<
	perl -pi -e 's/^n /  /' $*.lab

%.asm.pl: %.asm.pp
	#perl -pe 's/^\s*>>>// or do {s/<<<(.*?)>>>/\$${\(\\$1)}/g; $$_="print ' $< > $@
	echo 'sub interp {($$_=$$_[0])=~s/<<<(.*?)>>>/eval $$1/ge;print}' > $@
	perl -pe 's/^\s*>>>// or s/(.*)/interp <<'\''EOF'\'';\n$$1\nEOF/;' $< >> $@

%.asm: %.asm.pl
	perl $< $(out)

.PRECIOUS: %.obx %.xex %.asm
