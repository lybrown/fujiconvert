    icl 'hardware.asm'
COVOX0 equ $D600 ; TODO: Support adjusting Covox base address
COVOX1 equ $D601
window equ <<<$window>>>
pages equ <<<$pages>>>
dummy equ window+pages ; insure window and pages are marked used in .lab file
NOP0 equ 0
NOP equ $FE00
    org $80
; bank
    org *+2
diff org *+2
page org *+1

>>> if ($cart) {
    opt f+h-
    org <<<$window>>>
>>> if ($sic) {
    org <<<$window>>>+$2000
>>> }
cart2ram_start
    org r:$2000
relocated_start
>>> } else {
    org $2000
>>> }
>>> if ($pcm44) {
lo
    ert <*!=0
    :256 dta $A0|[#&$F]
hi
    ert <*!=0
    :256 dta $10|[#>>4]
>>> } elsif ($pcm4) {
lo
    ert <*!=0
    :256 dta $10|[#&$F]
hi
    ert <*!=0
    :256 dta $10|[#>>4]
>>> }

>>> if ($ram) {
    icl 'ramdetect.asm'
>>> }

;====================================
; Splash sreen
;====================================

splash
    jsr reset
    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL
    mwa #dlist DLISTL
    mva #0 COLPF2
    mva #15 COLPF1
    lda:rne VCOUNT
    mva #$22 DMACTL

    lda SKSTAT
    sta lastkey
>>> if (not $emulator) {
    lda loop
    jmp showtoggle
>>> }
wait
    lda SKSTAT
    cmp:sta lastkey
    bcc splashkeydown
    lda TRIG0
    beq splashdone
    lda CONSOL
    and #7
    cmp #7
    bne splashdone
    jmp wait
splashkeydown
>>> if (not $emulator) {
    lda KBCODE
    cmp #0 ; 'L'
    beq toggleloopstop
>>> }
splashdone
    rts
>>> if (not $emulator) {
toggleloopstop
    lda #1
    eor:sta loop
showtoggle
    beq setstop
setloop
    ldx #3
    mva:rpl looptxt,x screndtxt+15,x-
    mwa #initbank loop_or_stop+3
    jmp wait
setstop
    ldx #3
    mva:rpl stoptxt,x screndtxt+15,x-
    mwa #main loop_or_stop+3
    jmp wait
loop
    dta 1
>>> }

lastkey
    dta 0

dlist
    :6 dta $70
lms
    dta $42,a(scr)
    :20 dta 2
    dta $41,a(dlist)
scr
    ;     0123456789012345678901234567890123456789
    :40*20 dta 0
    ; Filled in by javascript
scrlen equ *-scr
>>> if ($emulator) {
    :40 dta d' '
completetxt
    dta d' Playback complete.                     '
    dta d' Press any key to reboot.               '
complete
    mwa #completetxt lms+1
    ldx #18
    lda #$70
    sta:rpl lms+4,x-
    jsr splash
    jmp ($FFFC) ; Reboot?
>>> } else {
screndtxt
    dta d' End of audio: LOOP                     '
looptxt
    dta d'LOOP'
stoptxt
    dta d'STOP'
>>> }

;====================================
; Player
;====================================

reset
    mva #0 HPOSP0
    sta HPOSP1
    sta HPOSP2
    sta HPOSP3
resetsound
>>> if ($covox) {
    ; init Covox
>>> } else {
    ; init POKEY
    mva #0 SKCTL
    mva #3 SKCTL
    lda #0
    ldx #7
    sta:rpl AUDF1,x-
>>>   if ($stereo) {
    mva #0 SKCTL+$10
    mva #3 SKCTL+$10
    lda #0
    ldx #7
    sta:rpl AUDF1+$10,x-
>>>   }
>>> }
    rts

initsound
>>> if ($pcm44) {
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #[FAST1|FAST3|HI13] AUDCTL
>>>   if ($stereo) {
    mva #[FAST1|FAST3|HI13] AUDCTL+$10
>>>   }
    jsr setpulse
>>> } elsif ($pwm) {
    mva #$AF AUDC1
    mva #$FF AUDF2
    mva #$50 AUDCTL
>>>   if ($stereo) {
    mva #$AF AUDC1+$10
    mva #$FF AUDF2+$10
    mva #$50 AUDCTL+$10
>>>   }
>>> }
    rts

main
>>> if ($ram) {
    ldx bankindex
    mva #0 banks,x
>>> }

    ; splash screen
    jsr splash

    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL

    ; graphics
    mva #$F COLPM0 ; channel 1
    mva #$26 COLPM1 ; channel 2
    mva #$4 COLPM2 ; progress indicator
    mva #$4 COLPM3 ; progress indicator
    mva #$FF GRAFP0
    sta GRAFP1
    mva #$10 GRAFP2
    mva #$10 GRAFP3

    ; pokey
    jsr reset
    jsr initsound

    mva #{bne} detectkeyevent
    mva #[keyup-[detectkeyevent+2]] detectkeyevent+1

>>> if ($pwm and $period > 105) {
>>>   $dups = int(($period - 1) / 105);
>>>   $period = 105;
>>> }
>>> sub sample {
>>>   ($page, $hpos) = @_; # XXX DONT use "my" here. Messes up interp().
>>>   # Disable waveform display for high frequencies
>>>   $hpos = 0 if ($stereo and $period < 49) or $period < 37;
>>>   # There's always enough time for hpos when the period is >= 105
>>>   $hpos = 1 if $period >= 105;
>>>   # Covox has enough time for hpos when period is >= 35
>>>   $hpos = 1 if $covox and $period >= 35;
>>>   # Always time if mono and period is >= 35
>>>   $hpos = 1 if not $stereo and $period >= 35;
>>>   # Except PCM4+4 stereo when period <= 52
>>>   $hpos = 0 if $stereo and $pcm44 and $period <= 52;
>>>   if ($pcm44t) {
    ldy page ; 3 cycles
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    lda hi,x ; 4 cycles
    ldy lo,x ; 4 cycles
    sty AUDC1 ; 4 cycles
    sta AUDC3 ; 4 cycles
>>>     if ($hpos) {
    stx HPOSP0 ; 4 cycles
>>>     }
>>>     if ($stereo) {
    ldy page ; 3 cycles
    ldx <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    lda hi,x ; 4 cycles
    ldy lo,x ; 4 cycles
    sty AUDC1+$10 ; 4 cycles
    sta AUDC3+$10 ; 4 cycles
>>>       if ($hpos) {
    stx HPOSP1 ; 4 cycles
>>>       }
>>>     }
>>>     return (23 + ($hpos ? 4 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($pcm44) {
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
>>>     if ($hpos) {
    stx HPOSP0 ; 4 cycles
>>>     }
>>>     if ($stereo) {
    ldx <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    mva hi,x AUDC3+$10 ; 8 cycles
    mva lo,x AUDC1+$10 ; 8 cycles
>>>       if ($hpos) {
    stx HPOSP1 ; 4 cycles
>>>       }
>>>     }
>>>     return (20 + ($hpos ? 4 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($pwm) {
>>>     $maxhalf = (($period - 5 < 101) ? $period - 5 : 101) >> 1;
>>>     for my $dup (reverse (0 .. $dups)) {
    lda <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    sta AUDF1 ; 4 cycles
    sta STIMER ; 4 cycles
>>>       if ($hpos) {
    adc #$7F-<<<$maxhalf>>>-<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>       }
>>>       if ($stereo) {
    lda <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    sta AUDF1+$10 ; 4 cycles
    sta STIMER+$10 ; 4 cycles
>>>         if ($hpos) {
    adc #$7F-<<<$maxhalf>>>+<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP1 ; 4 cycles
>>>         }
>>>       }
>>>       nop($period - (12 + ($hpos ? 6 : 0)) * ($stereo ? 2 : 1)) if $dup;
>>>     }
>>>     return (12 + ($hpos ? 6 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($covox) {
    lda <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    sta COVOX0 ; 4 cycles
>>>     if ($hpos) {
    sta HPOSP0 ; 4 cycles
>>>     }
>>>     if ($stereo) {
    lda <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    sta COVOX1 ; 4 cycles
>>>       if ($hpos) {
    sta HPOSP1 ; 4 cycles
>>>       }
>>>     }
>>>     return (8 + ($hpos ? 4 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($pcm4) {
>>>     $maxhalf = 7;
>>>     if ($stereo) {
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC1 ; 8 cycles
>>>       if ($hpos) {
    add #$6F-<<<$maxhalf>>>-<<<$stereo ? 30 : 0>>> ; 4 cycles
    sta HPOSP0 ; 4 cycles
>>>       }
    mva lo,x AUDC1+$10 ; 8 cycles
>>>       if ($hpos) {
    adc #$6F-<<<$maxhalf>>>+<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP1 ; 4 cycles
>>>       }
>>>       return 20 + ($hpos ? 14 : 0);
>>>     }
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC1 ; 8 cycles
    ; this HPOS is always allowed
    add #$6F-<<<$maxhalf>>> ; 4 cycles
    sta HPOSP0 ; 4 cycles
>>>     nop($period - 20 + ($period == 52));
    mva lo,x AUDC1 ; 8 cycles
>>>     if ($hpos) {
    adc #$6F-<<<$maxhalf>>> ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>     }
>>>     return 8 + ($hpos ? 6 : 0);
>>>   }
>>> }

>>> if ($emulator) {
bank equ $80 ; use for progress indicator
    mva #0 bank
    rts ; return to loader
continue ; called by loader
    mvx bank HPOSP2
    txa
    add #$80
    sta HPOSP3
    inx:stx bank
>>>   if ($pcm44) {
    mva #[FAST1|FAST3|HI13] AUDCTL
;>>>     if ($stereo) {
;    mva #[FAST1|FAST3|HI13] AUDCTL+$10
;>>>     }
    ;jsr setpulse
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
>>>   } elsif ($pwm) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
; XXX - Not needed as long as emulator loader doesn't touch POKEY #2?
;>>>     if ($stereo) {
;    mva #$AF AUDC1+$10
;    mva #$50 AUDCTL+$10
;>>>     }
>>>   }
>>> }

>>> if ($ram or $cart) {
>>>   if ($thecart) {
bank equ $D5A0
>>>   } else {
bank equ $80
>>>   }
    ; init bank
    jmp initbank
>>> }

play0
    ldy #0 ; 2 cycles
>>> if ($pcm44t) {
    sty page ; 3 cycles
>>> }
play
>>> $pages_per_frame = ($stereo and ($pcm44 or $pwm or $covox)) ? 2 : 1;
>>> $frames = $pages / $pages_per_frame;
>>> for ($page = $frame = 0; $page < $pages; $page += $pages_per_frame, ++$frame) {
    ; frame <<<$frame>>> page <<<$page>>>
>>>   $cycles = sample($page, ($frame&1) == 0 && $frame != $frames - 2);
>>>   if ($frame == $frames - 11) {
    lda bank ; 3 cycles +1 if thecart
endlo
    eor #$FF ; 2 cycles
    sta diff ; 3 cycles
>>>     $cycles += 8;
>>>     $cycles += $thecart ? 1 : 0;
>>>   } elsif ($frame == $frames - 9) {
    lda bank+1 ; 3 cycles +1 if thecart
endhi
    eor #$FF ; 2 cycles
    sta diff+1 ; 3 cycles
>>>     $cycles += 8;
>>>     $cycles += $thecart ? 1 : 0;
>>>   } elsif ($frame == $frames - 7) {
    lda diff ; 3
    ora diff+1 ; 3
loop_or_stop
    sne:jmp <<<$emulator ? "complete" : "initbank">>> ; 3 cycles
>>>     $cycles += 9;
>>>   } elsif ($frame == $frames - 5) {
>>>   } elsif ($frame == $frames - 2) {
    lda SKSTAT ; 4 cycles
    and #4 ; 2 cycles
detectkeyevent
    bne keyevent ; 2 cycles
>>>     $cycles += 8;
>>>   } elsif ($frame == $frames - 1) {
>>>     if ($pcm44t) {
    inc page ; 5 cycles
>>>       $cycles += 5;
>>>     } else {
    iny ; 2 cycles
>>>       $cycles += 2;
>>>     }
    beq next ; 2 cycles +1 if taken same page
branch
>>>     $cycles += 5; # beq next + jmp play
>>>     nop($period - $cycles);
    jmp play ; 3 cycles
>>>     next;
>>>   }
>>>   if ($period == 52 && ($frame&1) == 0 && not ($mono and $pcm4)) {
>>>     --$cycles;
>>>   }
>>>   nop($period - $cycles);
>>>   if ($frame == $frames - 3) {
donekey
>>>   }
>>> }

next
    ; ert [>next]!=[>branch]
>>>     if ($ram or $cart) {
    jmp nextbank
>>>     } elsif ($emulator) {
    rts ; return to loader
>>>     } else { die; }

keyevent
keyup
    mva #{beq} detectkeyevent
    mva #[keydown-[detectkeyevent+2]] detectkeyevent+1
    jmp donekey

keydown
    mva #{bne} detectkeyevent
    mva #[keyup-[detectkeyevent+2]] detectkeyevent+1
    lda KBCODE
>>> if ($pcm44) {
    cmp #63 ; 'A'
    sne:jmp toggle
>>> }
>>> if ($ram or $cart) {
    cmp #6 ; '+' Left Arrow
    beq prevbank
    cmp #7 ; '*' Right Arrow
    beq nextbank
    cmp #52 ; Del
    beq initbank
    cmp #28 ; Esc
    jeq main
    cmp #33 ; Space
    beq pauseplay
>>> }
    jmp donekey

;========================================
; bank
;========================================
    ; <<<$media>>>
>>> if ($ram) {
prevbank
    :3 dec bank
nextbank
    ldx bank
    stx HPOSP2
    txa
    add #$80
    sta HPOSP3
    lda banks,x
    bne nextbank2
    mva #0 bank
    lda banks+0
nextbank2
    sta PORTB
    inc bank
    jmp play
initbank
    mwa #0 bank
    tay
    jmp nextbank
>>> } elsif ($xegs or $megacart) {
prevbank
    :4 dec bank
nextbank
    ldx bank
    stx HPOSP2
    txa
    add #$80
    sta HPOSP3
    stx $D500
    inx
    stx bank
    jmp play
initbank
    mwa #<<<$xegs ? 0 : 1>>> bank
    ldy #0
    jmp nextbank
>>> } elsif ($atarimax or $megamax) {
prevbank
    :4 dec bank
nextbank
    lda bank
    sta HPOSP2
    add #$80
    sta HPOSP3
    and #$7F ; don't disable the cart
    tax
    sta $D500,x
    inx
    stx bank
    jmp play
initbank
    mwa #<<<$megamax ? 1 : 0>>> bank
    ldy #0
    jmp nextbank
>>> } elsif ($sic) {
prevbank
    :4 dec bank
    ldy #0
nextbank
    lda bank
    sta HPOSP2
    and #$1F
    ora #$20
    sta $D500
    lda bank
    add #$80
    sta HPOSP3
    inc bank
    jmp play
initbank
    mwa #1 bank
    ldy #0
    jmp nextbank
>>> } elsif ($thecart) {
prevbank
    lda $D5A0
    sta HPOSP2
    add #$80
    sta HPOSP3
    lda #$FC
    add:sta $D5A0
    lda #$FF
    adc:sta $D5A1
    jmp play0
initbank
    mwa #0 $D5A0 ; next bank will advance to 1, so zero is OK here
    tay
nextbank
    mva $D5A0 HPOSP2 ; 8 cycles
    add #$80 ; 2 cycles
    sta HPOSP3 ; 4 cycles
    inc $D5A0 ; 6 cycles
    sne:inc $D5A1 ; 3 cycles
    jmp play ; 3 cycles
>>> } elsif  ($emulator) {
initbank
prevbank
nextbank
    jmp donekey
>>> }
pauseplay
    jsr resetsound
    lda SKSTAT
    and #4
    beq pauseplay
pauseplay2
    lda SKSTAT
    and #4
    bne pauseplay2
    lda KBCODE
>>> if ($ram or $cart) {
    cmp #6 ; '+' Left Arrow
    beq prevbank
    cmp #7 ; '*' Right Arrow
    beq nextbank
    cmp #52 ; Del
    beq initbank
    cmp #28 ; Esc
    jeq main
>>> }
    cmp #33
    bne pauseplay
    mva #{bne} detectkeyevent
    mva #[keyup-[detectkeyevent+2]] detectkeyevent+1
    jsr initsound
    jmp donekey


>>> if ($pcm44) {
;========================================
; PCM4+4 hardware/Altirra-3.10-test27 and prior toggle
;========================================
toggle
    lda #1
    eor:sta pindex
    jsr setpulse
    jmp donekey

setpulse
    mva #[FAST1|FAST3|HI13] AUDCTL
>>> if ($stereo) {
    mva #[FAST1|FAST3|HI13] AUDCTL+$10
>>> }
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
>>> if ($stereo) {
    mva paudf3,x AUDF3+$10
    mva paudf1,x AUDF1+$10
    sta STIMER+$10
    sta AUDF3+$10
>>> }
    lda pindex
    bne altirra
    mva #$F COLBK
    mva #$0 COLPM0
    rts
altirra
    mva #$0 COLBK
    mva #$F COLPM0
    rts
pindex
    dta 1
paudf1
    dta 12,3
paudf3
    dta 13,5
>>> }

nop192
    jsr nop96
nop96
    jsr nop48
nop48
    jsr nop24
nop24
    jsr nop12
nop12
    rts

>>> sub nop {
>>>   ($cycles, $force) = @_; # Don't use "my" here
>>>   @nop = (
>>>     192 => "jsr nop192 ; 192 cycles",
>>>     96 => "jsr nop96 ; 96 cycles",
>>>     48 => "jsr nop48 ; 48 cycles",
>>>     24 => "jsr nop24 ; 24 cycles",
>>>     12 => "jsr nop12 ; 12 cycles",
>>>     7 => "inc NOP,x ; 7 cycles",
>>>     6 => "inc NOP ; 6 cycles",
>>>     5 => "inc NOP0 ; 5 cycles",
>>>     4 => "lda NOP0,x ; 4 cycles",
>>>     3 => "lda NOP0 ; 3 cycles",
>>>     2 => "nop ; 2 cycles",
>>>   );
>>>   for ($i = 0; $i < @nop; $i += 2) {
>>>     $exists{$nop[$i]} = 1;
>>>   }
>>>   ++$nopcount;
>>>   $nopsum += $cycles;
>>>   if (!$force and $cycles > 14 and !$exists{$cycles}) {
    jsr nop<<<$cycles>>> ; <<<$cycles>>> cycles
>>>     $make_nop{$cycles} = 1;
>>>     return;
>>>   }
>>>   if ($cycles < 0) {
>>>     $slow_cycles += $cycles;
    ; slow by <<<-$cycles>>> cycles
>>>   }
>>>   if ($cycles == 1) {
>>>     $fast_cycles += 1;
    ; fast by 1 cycle
>>>     return;
>>>   }
    ; ------------- NOP <<<$cycles>>>
>>>   for ($i = 0; $i < @nop; $i += 2) {
>>>     last if $cycles <= 0;
>>>     while ($cycles >= $nop[$i]+2 || $cycles == $nop[$i]) {
>>>       $cycles -= $nop[$i];
    <<<$nop[$i+1]>>>
>>>     }
>>>   }
    ; -------------
>>> }

>>> for $cycles (sort {$a <=> $b} keys %make_nop) {
nop<<<$cycles>>>
>>> nop($cycles-12, 1);
    rts
>>> }

>>> if ($nopsum / $nopcount < -2) {
; Mark as slow player if average sync is missing by more than 2 cycles
; Average nop cycles: <<<$nopsum / $nopcount>>>
slowplayer equ 1
>>> }
>>> if ($slow_cycles) {
slow_cycles equ <<<-$slow_cycles>>>
>>> }
>>> if ($fast_cycles) {
fast_cycles equ <<<$fast_cycles>>>
>>> }

>>> if ($ram) {
;========================================
; run
;========================================
    run main
    ini detectram
>>> } elsif ($emulator) {
quiet equ complete
dummyquiet equ quiet
    ; ini will be added by javascript
>>> } elsif ($cart) {
;========================================
; end of cart
;========================================
    org <<<$window>>>+<<<$pages-1>>>*$100
cart2ram_end
cartstart
    ; copy code to ram
    mwa #cart2ram_start+<<<$xegs ? '$2000' : 0>>> $80
    mwa #$2000 $82
    ldx #[[cart2ram_end-cart2ram_start]>>8]+1
    ldy #0
copy
    mva:rne ($80),y ($82),y+
    inc $81
    inc $83
    dex
    bne copy

    jmp main
null
    rts

    ;========================================================
    org <<<$window>>>+<<<$pages>>>*$100-6
    dta a(cartstart+<<<$xegs ? '$2000' : 0>>>) ; start
    dta 0 ; no left cart  XXX should be 1 for 16K carts?
    dta 4 ; no DOS
    dta a(null+<<<$xegs ? '$2000' : 0>>>) ; init
>>> } else { die; }
