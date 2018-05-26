    icl 'hardware.asm'

>>> if ($cart) {
    org <<<$cartwindow>>>
cart2ram_start
    and #$1F
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
    mva #$FF GRAFP0

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
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>   }
>>> }

>>> if ($ram) {
extwindow equ $4000
bank equ $80
    ; init bank
    mva #0 bank
>>> } elsif ($cart) {
cartwindow equ <<<$cartwindow>>>
bank equ $80
    ; init bank
    mva #0 bank
>>> }

NOP0 equ 0
NOP equ $FE00
lastkey equ $82
    sta lastkey

>>> if ($pcm44) {
    jsr setpulse
>>> }

play0
    ldy #0 ; 2 cycles
play
    ; pages 0-61
>>> for $page (0 .. 61) {
    ldx extwindow+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    stx HPOSP0 ; 4 cycles
    rol NOP,x ; 7 cycles
    rol NOP ; 6 cycles
>>> }
    ; page 62
    ldx extwindow+62*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    lda SKSTAT ; 4 cycles
    cmp:sta lastkey ; 5 cycles
    bcc keydown ; 2 cycles
    lda NOP,x ; 4 cycles NOP
    nop ; 2 cycles NOP
    ; page 63
donekey
    ldx extwindow+63*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    iny ; 2 cycles
branch
    beq next ; 2 cycles +1 if taken same page
    :2 rol NOP0 ; 5+5 cycles
    jmp play ; 3 cycles
next
    ; ert [>next]!=[>branch]


>>> if ($ram or $cart) {
    jmp nextbank
>>> } elsif ($emulator) {
    rts
continue
>>>   if ($pwm) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>     if ($stereo) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>     }
    jmp play0
>>>   }
>>> } else { die; }

keydown
    lda KBCODE
>>> if ($pcm44) {
    cmp #63 ; 'A'
    beq toggle
>>> }
>>> if ($ram or $cart) {
    cmp #6 ; '+' Left Arrow
    jeq prevbank
    cmp #7 ; '*' Right Arrow
    jeq nextbank
    cmp #52 ; 'DEL'
    jeq initbank
>>> }
    jmp donekey

>>> if ($pcm44) {
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

;========================================
; bank
;========================================
>>> if ($ram) {
prevbank
    :2 dec bank
nextbank
    ldx bank
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
>>> }

>>> if ($xegs or $megacart) {
prevbank
    :2 dec bank
nextbank
    ldx bank
    stx $D500
    inx
    stx bank
    jmp play
initbank
    mva #0 bank
    rts
>>> }

>>> if ($atarimax or $megamax) {
prevbank
    :2 dec bank
nextbank
    ldx bank
    sta $D500,x
    inx
    stx bank
    jmp play
initbank
    mva #0 bank
    rts
>>> }

>>> if ($sic) {
prevbank
    :2 dec bank
nextbank
    lda bank
    and #$1F
    ora #$20
    sta $D500
    inc bank
    jmp play
initbank
    mva #0 bank
    rts
>>> }

>>> if ($thecart) {
prevbank
    lda $D5A0
    php
    dec $D5A0
    plp
    sne:dec $D5A1
    jmp play
nextbank
    inc $D5A0
    sne:inc $D5A1
    jmp play
initbank
    mwa #1 $D5A0
    rts
>>> }

;========================================
; run
;========================================
>>> if ($ram) {
    run main
>>> }

;========================================
; end of cart
;========================================
>>> if ($cart) {
cart2ram_end
    org <<<$cartwindow>>>-$2000+*
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
    org $BFFA
    dta a(cartstart) ; start
    dta 0 ; no left cart  XXX should be 1 for 16K carts?
    dta 4 ; no DOS
    dta a(null) ; init
>>> }
