    icl 'hardware.asm'
COVOX0 equ $D600 ; TODO: Support adjusting Covox base address
COVOX1 equ $D601
window equ <<<$window>>>
pages equ <<<$pages>>>
dummy equ window+pages ; insure window and pages are marked used in .lab file
NOP0 equ 0
NOP equ $FE00
lastkey equ $82

>>> if ($cart) {
    opt f+h-
    org <<<$window>>>
>>> if ($sic) {
    org <<<$window+$2000>>>
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

    icl 'splash.asm'

main
>>> if ($ram) {
    ldx bankindex
    mva #0 banks,x
>>> }
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
    mva #1 GRAFP2
    mva #1 GRAFP3
    mva #0 HPOSP0
    sta HPOSP1
    sta HPOSP2
    sta HPOSP3

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

    mva #0 lastkey

>>> if ($pcm44) {
    jsr setpulse
>>> }

>>> if ($pwm and $period > 105) {
>>>   $dups = int(($period - 1) / 105);
>>>   $period = 105;
>>> }
>>> sub sample {
>>>   ($page, $hpos) = @_; # XXX DONT use "my" here. Messes up interp().
>>>   # Disable waveform display for high frequencies
>>>   $hpos = 0 if $stereo and $period < 49 or $period < 37;
>>>   # There's always enough time for hpos when the period is >= 105
>>>   $hpos = 1 if $period >= 105;
>>>   if ($pcm44) {
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
>>>     $maxhalf = (($period - 4 < 101) ? $period - 1 : 101) >> 1;
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
    adc #$6F-<<<$maxhalf>>>-<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>       }
    mva lo,x AUDC1+$10 ; 8 cycles
>>>       if ($hpos) {
    adc #$6F-<<<$maxhalf>>>+<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP1 ; 4 cycles
>>>       }
>>>       return 20 + ($hpos ? 12 : 0);
>>>     }
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC1 ; 8 cycles
    ; this HPOS is always allowed
    adc #$6F-<<<$maxhalf>>>-<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>     nop($period - 14);
    mva lo,x AUDC1 ; 8 cycles
>>>     if ($hpos) {
    adc #$6F-<<<$maxhalf>>>+<<<$stereo ? 30 : 0>>> ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>     }
>>>     return 14 + ($hpos ? 6 : 0);
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
bank equ $80
    ; init bank
    jmp initbank
>>> }

play0
    ldy #0 ; 2 cycles
play
    ; samples 0 .. N-3
>>> $pages_per_sample = ($stereo and ($pcm44 or $pwm or $covox)) ? 2 : 1;
>>> for ($page = 0, $i = 0; $page < $pages-2*$pages_per_sample; $page += $pages_per_sample, ++$i) {
>>>   my $cycles = sample($page, 1);
>>>   nop($period - $cycles + ($pwm && $period == 52 && ($i&1)));
>>> }
    ; sample N-2
>>> my $cycles = sample($pages-2*$pages_per_sample, 0);
    lda SKSTAT ; 4 cycles
    ; and #4 ; 2 cycles NOTE: Cheat here to save cycles.
    ; NOTE: This means that shift and control will repeat the last action.
    cmp:sta lastkey ; 6 cycles
    bcc keydown ; 2 cycles
>>> nop($period - $cycles - 12);
    ; sample N-1
donekey
>>> my $cycles = sample($pages-1*$pages_per_sample, 0);
    iny ; 2 cycles
branch
    beq next ; 2 cycles +1 if taken same page
>>> nop($period - $cycles - 7 + ($pwm && $period == 52));
    jmp play ; 3 cycles
next
    ; ert [>next]!=[>branch]
>>> if ($ram or $cart) {
    jmp nextbank
>>> } elsif ($emulator) {
    rts ; return to loader
>>> } else { die; }

keydown
    lda KBCODE
>>> if ($pcm44) {
    cmp #63 ; 'A'
    beq toggle
>>> }
>>> if ($ram or $cart) {
    cmp #6 ; '+' Left Arrow
    beq prevbank
    cmp #7 ; '*' Right Arrow
    beq nextbank
    cmp #52 ; 'DEL'
    beq initbank
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
    mva #0 bank
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
    mva #1 bank
    ldy #0
    jmp nextbank
>>> } elsif ($atarimax or $megamax) {
prevbank
    :4 dec bank
nextbank
    ldx bank
    stx HPOSP2
    txa
    add #$80
    sta HPOSP3
    sta $D500,x
    inx
    stx bank
    jmp play
initbank
    mva #<<<$megamax ? 1 : 0>>> bank
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
    mva #1 bank
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
    mva $D5A0 HPOSP2
    add #$80
    sta HPOSP3
    inc $D5A0
    sne:inc $D5A1
    jmp play
>>> }


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
    beq altirra
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

nop96
    jsr nop48
nop48
    jsr nop24
nop24
    jsr nop12
nop12
    rts

>>> sub nop {
>>>   my ($cycles) = @_;
>>>   ++$nopcount;
>>>   $nopsum += $cycles;
>>>   while ($cycles > 96) {
    jsr nop96
>>>     $cycles -= 96;
>>>   }
>>>   while ($cycles > 48) {
    jsr nop48
>>>     $cycles -= 48;
>>>   }
>>>   while ($cycles > 24) {
    jsr nop24
>>>     $cycles -= 24;
>>>   }
>>>   while ($cycles > 12) {
    jsr nop12
>>>     $cycles -= 12;
>>>   }
>>>   while ($cycles > 7) {
    rol NOP,x ; 7 cycles
>>>     $cycles -= 7;
>>>   }
>>>   if ($cycles == 6) {
    rol NOP ; 6 cycles
>>>   } elsif ($cycles == 5) {
    rol NOP0 ; 5 cycles
>>>   } elsif ($cycles == 4) {
    lda NOP ; 4 cycles
>>>   } elsif ($cycles == 3) {
    and NOP0 ; 3 cycles
>>>   } elsif ($cycles == 2) {
    nop ; 2 cycles
>>>   }
>>> }

>>> if ($nopsum / $nopcount < -2) {
; mark as slow player if average sync is missing by more than 2 cycles
slowplayer equ 1
>>> }

>>> if ($ram) {
;========================================
; run
;========================================
    run main
    ini detectram
>>> } elsif ($emulator) {
quiet
    lda #0
    ldx #$1F
    sta:rpl AUDF1,x-
    jmp *
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
    mwa #cart2ram_start $80
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
    dta a(cartstart) ; start
    dta 0 ; no left cart  XXX should be 1 for 16K carts?
    dta 4 ; no DOS
    dta a(null) ; init
>>> } else { die; }
