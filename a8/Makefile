players.json: ram.obx obx2json
	./obx2json $< $(out)

det.run:
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
	echo 'sub interp {($$_=$$_[0])=~s/<<<(.*?)>>>/eval $$1/ge;print}' > $@
	perl -pe 's/^\s*>>>// or s/(.*)/interp <<'\''EOF'\'';\n$$1\nEOF/;' $< >> $@

%.asm: %.asm.pl
	perl $< $(out)

.PRECIOUS: %.obx %.xex %.asm
