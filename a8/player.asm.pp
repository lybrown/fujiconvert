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
cart2ram_start
    org r:$2000
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
    jsr splash

    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL

    ; graphics
    mva #$F COLPM0
    mva #$8 COLPM1
    mva #$4 COLPM2
    mva #$FF GRAFP0
    sta GRAFP1
    mva #1 GRAFP2
    mva #0 HPOSP0
    sta HPOSP1
    sta HPOSP2

>>> if ($covox) {
    ; init Covox
>>> } else {
    ; init POKEY
    mva #3 SKCTL
    lda #0
    ldx #7
    sta:rpl AUDF1,x-
>>>   if ($stereo) {
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
    mva #$50 AUDCTL
>>>   if ($stereo) {
    mva #$AF AUDC1+$10
    mva #$50 AUDCTL+$10
>>>   }
>>> }

>>> if ($ram or $cart) {
bank equ $80
    ; init bank
    mva #0 bank
>>> }

    mva #0 lastkey

>>> if ($pcm44) {
    jsr setpulse
>>> }

>>> sub sample {
>>>   ($page, $hpos) = @_; # XXX DONT use "my" here. Messes up interp().
>>>   # Disable waveform display for high frequencies
>>>   $hpos = 0 if $stereo and $period < 49;
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
    lda <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    sta AUDF1 ; 4 cycles
    sta STIMER ; 4 cycles
>>>     if ($hpos) {
    stx HPOSP0 ; 4 cycles
>>>     }
>>>     if ($stereo) {
    lda <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    sta AUDF1+$10 ; 4 cycles
    sta STIMER+$10 ; 4 cycles
>>>       if ($hpos) {
    stx HPOSP1 ; 4 cycles
>>>       }
>>>     }
>>>     return (12 + ($hpos ? 4 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($covox) {
    lda <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    sta COVOX0 ; 4 cycles
>>>     if ($hpos) {
    stx HPOSP0 ; 4 cycles
>>>     }
>>>     if ($stereo) {
    lda <<<$window>>>+<<<$page+1>>>*$100,y ; 4 cycles
    sta COVOX1 ; 4 cycles
>>>       if ($hpos) {
    stx HPOSP1 ; 4 cycles
>>>       }
>>>     }
>>>     return (8 + ($hpos ? 4 : 0)) * ($stereo ? 2 : 1);
>>>   } elsif ($pcm4) {
>>>     if ($stereo) {
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC1 ; 8 cycles
>>>       if ($hpos) {
    adc #$70 ; 2 cycles
    sta HPOSP1 ; 4 cycles
>>>       }
    mva lo,x AUDC1+$10 ; 8 cycles
>>>       if ($hpos) {
    adc #$90 ; 2 cycles
    sta HPOSP1 ; 4 cycles
>>>       }
>>>       return 20 + ($hpos ? 12 : 0);
>>>     }
    ldx <<<$window>>>+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC1 ; 8 cycles
    adc #$80 ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>     nop($period - 12);
    mva lo,x AUDC1 ; 8 cycles
>>>     if ($hpos) {
    adc #$80 ; 2 cycles
    sta HPOSP0 ; 4 cycles
>>>     }
>>>     return 12 + ($hpos ? 6 : 0);
>>>   }
>>> }

>>> if ($emulator) {
    rts ; return to loader
continue ; called by loader
>>>   if ($pwm) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
; XXX - Not needed as long as emulator loader doesn't touch POKEY #2?
;>>>     if ($stereo) {
;    mva #$AF AUDC1+$10
;    mva #$50 AUDCTL+$10
;>>>     }
>>>   }
>>> }

play0
    ldy #0 ; 2 cycles
play
    ; samples 0 .. N-3
>>> $pages_per_sample = ($stereo and ($pcm44 or $pwm or $covox)) ? 2 : 1;
>>> for ($page = 0; $page < $pages-2*$pages_per_sample; $page += $pages_per_sample) {
>>>   my $cycles = sample($page, 1);
>>>   nop($period - $cycles);
>>> }
    ; sample N-2
>>> my $cycles = sample($pages-2*$pages_per_sample, 0);
    lda SKSTAT ; 4 cycles
    cmp:sta lastkey ; 5 cycles
    bcc keydown ; 2 cycles
>>> nop($period - $cycles - 11);
    ; sample N-1
donekey
>>> my $cycles = sample($pages-1*$pages_per_sample, 0);
    iny ; 2 cycles
branch
    beq next ; 2 cycles +1 if taken same page
>>> nop($period - $cycles - 7);
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
    :2 dec bank
nextbank
    ldx bank
    stx HPOSP2
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
    rts
>>> } elsif ($xegs or $megacart) {
prevbank
    :2 dec bank
nextbank
    ldx bank
    stx HPOSP2
    stx $D500
    inx
    stx bank
    jmp play
initbank
    mva #0 bank
    rts
>>> } elsif ($atarimax or $megamax) {
prevbank
    :2 dec bank
nextbank
    ldx bank
    stx HPOSP2
    sta $D500,x
    inx
    stx bank
    jmp play
initbank
    mva #0 bank
    rts
>>> } elsif ($sic) {
prevbank
    :2 dec bank
nextbank
    lda bank
    sta HPOSP2
    and #$1F
    ora #$20
    sta $D500
    inc bank
    jmp play
initbank
    mva #0 bank
    rts
>>> } elsif ($thecart) {
prevbank
    lda $D5A0
    sta HPOSP2
    php
    dec $D5A0
    plp
    sne:dec $D5A1
    jmp play
nextbank
    mva $D5A0 HPOSP2
    inc $D5A0
    sne:inc $D5A1
    jmp play
initbank
    mwa #1 $D5A0
    rts
>>> }


>>> if ($pcm44) {
;========================================
; PCM4+4 Altirra/hardware toggle
;========================================
toggle
    jsr setpulse
    jmp donekey

setpulse
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
    lda #1
    eor:sta pindex
    beq altirra
    mva #$0 COLBK
    mva #$F COLPM0
    rts
altirra
    mva #$F COLBK
    mva #$0 COLPM0
    rts
pindex
    dta 0
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

>>> if ($ram) {
;========================================
; run
;========================================
    run main
>>> } elsif ($emulator) {
;========================================
; ini
;========================================
    ini main
>>> } elsif ($cart) {
;========================================
; end of cart
;========================================
cart2ram_end
    org <<<$window>>>+<<<$pages-1>>>*$100
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
